const Joi = require('joi');
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const StockMove = require('../models/StockMove');
const Sale = require('../models/Sale');
const Product = require('../models/Product');

const saleSchema = Joi.object({
  branchId: Joi.string().trim().required(),
  items: Joi.array().items(Joi.object({
    productId: Joi.string().trim().required(),
    qty: Joi.number().integer().min(1).required(),
    unitPrice: Joi.number().min(0).required(),
    name: Joi.string().allow('').optional()
  }).unknown(true)).min(1).required(),
  discountRs: Joi.number().min(0).default(0)
}).unknown(true);

exports.recent = async (req, res) => {
  const branchId = req.query.branchId;
  const filter = branchId ? { branchId } : {};
  const items = await Sale.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  res.json(items);
};

exports.createSale = async (req, res) => {
  const { branchId, items, discountRs } = await saleSchema.validateAsync(req.body);

  // Coerce numeric fields defensively (in case client sends strings)
  for (const it of items) {
    it.qty = Number(it.qty);
    it.unitPrice = Number(it.unitPrice);
  }

  // enrich product details for convenience
  const prods = await Product.find({ _id: { $in: items.map(i => i.productId) } }).lean();
  const nameMap = new Map(prods.map(p => [String(p._id), p.name]));

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Decrement stock per line (qty is in units)
    for (const it of items) {
      const row = await Stock.findOne({ branchId, productId: it.productId }).session(session);
      if (!row) {
        throw new Error(`Stock row missing for selected branch '${branchId}'. productId=${it.productId}`);
      }
      if (row.onHand < it.qty) {
        throw new Error(`Insufficient stock in branch '${branchId}' for productId=${it.productId}. onHand=${row.onHand}, qty=${it.qty}`);
      }

      row.onHand -= it.qty;
      await row.save({ session });

      await StockMove.create(
        [{ branchId, productId: it.productId, delta: -it.qty, reason: 'sale', refId: null }],
        { session }
      );

      // Always persist canonical product name from DB, ignore client-sent name
      it.name = nameMap.get(String(it.productId)) || 'Item';
    }

    const subtotal = items.reduce((a, it) => a + it.unitPrice * it.qty, 0);
    const discount = Number(discountRs) || 0;
    const tax = 0;
    const grand = Math.max(0, subtotal - discount);

    const [sale] = await Sale.create(
      [{ branchId, items, totals: { subtotal, discount, tax, grand } }],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json(sale);
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
};
