const Joi = require('joi');
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const StockMove = require('../models/StockMove');
const Sale = require('../models/Sale');
const Product = require('../models/Product');

const saleSchema = Joi.object({
  branchId: Joi.string().required(),
  items: Joi.array().items(Joi.object({
    productId: Joi.string().required(),
    qty: Joi.number().integer().min(1).required(),
    unitPrice: Joi.number().min(0).required(),
    taxRate: Joi.number().min(0).max(1).required()
  })).min(1).required()
});

exports.recent = async (req, res) => {
  const branchId = req.query.branchId;
  const filter = branchId ? { branchId } : {};
  const items = await Sale.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  res.json(items);
};

exports.createSale = async (req, res) => {
  const { branchId, items } = await saleSchema.validateAsync(req.body);

  // enrich names (optional convenience)
  const prods = await Product.find({ _id: { $in: items.map(i => i.productId) } }).lean();
  const nameMap = new Map(prods.map(p => [String(p._id), p.name]));

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Decrement stock per line
    for (const it of items) {
      const row = await Stock.findOne({ branchId, productId: it.productId }).session(session);
      if (!row) throw new Error('Stock row missing: ' + it.productId);
      if (row.onHand < it.qty) throw new Error('Insufficient stock for product ' + it.productId);
      row.onHand -= it.qty;
      await row.save({ session });
      await StockMove.create([{ branchId, productId: it.productId, delta: -it.qty, reason: 'sale', refId: null }], { session });
      it.name = it.name || nameMap.get(String(it.productId)) || 'Item';
    }

    const subtotal = items.reduce((a, it) => a + it.unitPrice * it.qty, 0);
    const tax = items.reduce((a, it) => a + (it.taxRate || 0) * it.unitPrice * it.qty, 0);
    const grand = subtotal + tax;

    const [sale] = await Sale.create([{ branchId, items, totals: { subtotal, tax, grand } }], { session });

    await session.commitTransaction();
    res.status(201).json(sale);
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
};
