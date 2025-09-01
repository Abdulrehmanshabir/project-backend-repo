const Joi = require('joi');
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const StockMove = require('../models/StockMove');
const Product = require('../models/Product');
const Return = require('../models/Return');

const returnSchema = Joi.object({
  branchId: Joi.string().trim().required(),
  saleId: Joi.string().trim().allow('', null),
  items: Joi.array().items(Joi.object({
    productId: Joi.string().trim().required(),
    qty: Joi.number().integer().min(1).required(),
    unitPrice: Joi.number().min(0).required(),
    name: Joi.string().allow('').optional()
  }).unknown(true)).min(1).required(),
}).unknown(true);

exports.recent = async (req, res) => {
  const branchId = req.query.branchId;
  const filter = branchId ? { branchId } : {};
  const items = await Return.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  res.json(items);
};

exports.createReturn = async (req, res) => {
  const { branchId, saleId, items } = await returnSchema.validateAsync(req.body);

  // Coerce numeric fields defensively
  for (const it of items) {
    it.qty = Number(it.qty);
    it.unitPrice = Number(it.unitPrice);
  }

  // enrich names from Product if absent
  const prods = await Product.find({ _id: { $in: items.map(i => i.productId) } }).lean();
  const nameMap = new Map(prods.map(p => [String(p._id), p.name]));

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Increment stock per line
    for (const it of items) {
      let row = await Stock.findOne({ branchId, productId: it.productId }).session(session);
      if (!row) row = new Stock({ branchId, productId: it.productId, onHand: 0 });
      row.onHand += it.qty;
      await row.save({ session });

      await StockMove.create(
        [{ branchId, productId: it.productId, delta: +it.qty, reason: 'return', refId: saleId || null }],
        { session }
      );

      it.name = nameMap.get(String(it.productId)) || it.name || 'Item';
    }

    const subtotal = items.reduce((a, it) => a + it.unitPrice * it.qty, 0);
    const refund = subtotal; // no restocking fee logic here

    const [doc] = await Return.create(
      [{ branchId, saleId: saleId || null, items, totals: { subtotal, refund } }],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json(doc);
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
};

