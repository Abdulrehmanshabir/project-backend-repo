const Joi = require('joi');
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const StockMove = require('../models/StockMove');

exports.byBranch = async (req, res) => {
  const branchId = req.query.branchId;
  if (!branchId) return res.status(400).json({ message: 'branchId required' });
  const rows = await Stock.find({ branchId }).populate('productId').lean();
  const result = rows.map(r => ({
    productId: r.productId._id,
    sku: r.productId.sku,
    name: r.productId.name,
    unit: r.productId.unit,
    onHand: r.onHand
  }));
  res.json(result);
};

const adjustSchema = Joi.object({
  branchId: Joi.string().required(),
  productId: Joi.string().required(),
  delta: Joi.number().integer().required(),
  reason: Joi.string().valid('adjustment').default('adjustment')
});

exports.adjust = async (req, res) => {
  const { branchId, productId, delta, reason } = await adjustSchema.validateAsync(req.body);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const row = await Stock.findOne({ branchId, productId }).session(session);
    if (!row) throw new Error('Stock row missing');
    if (row.onHand + delta < 0) throw new Error('Insufficient stock');

    row.onHand += delta;
    await row.save({ session });

    await StockMove.create([{ branchId, productId, delta, reason, refId: null }], { session });

    await session.commitTransaction();
    res.json({ onHand: row.onHand });
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
};
