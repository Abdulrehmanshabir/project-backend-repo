const Joi = require('joi');
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const StockMove = require('../models/StockMove');
const Product = require('../models/Product');

exports.byBranch = async (req, res) => {
  const branchId = req.query.branchId;
  if (!branchId) return res.status(400).json({ message: 'branchId required' });
  // Support aggregated view for admin/owner when branchId=all
  if (String(branchId).toLowerCase() === 'all') {
    const rows = await Stock.aggregate([
      { $group: { _id: '$productId', onHand: { $sum: '$onHand' } } },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $addFields: { product: { $arrayElemAt: ['$product', 0] } } },
      { $addFields: {
          productId: '$_id',
          sku: { $ifNull: ['$product.sku', ''] },
          name: { $ifNull: ['$product.name', ''] },
          unit: { $ifNull: ['$product.unit', 'pcs'] }
        }
      },
      { $project: { _id: 0, product: 0, productId: 1, sku: 1, name: 1, unit: 1, onHand: 1 } }
    ]);
    return res.json(rows);
  }

  // Join products with stock for this branch so every product shows with onHand default 0
  const result = await Product.aggregate([
    { $project: { sku: 1, name: 1, unit: 1 } },
    {
      $lookup: {
        from: 'stocks',
        let: { pid: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [ { $eq: ['$productId', '$$pid'] }, { $eq: ['$branchId', branchId] } ] } } },
          { $limit: 1 }
        ],
        as: 's'
      }
    },
    // set computed values first
    { $addFields: { productId: '$_id', onHand: { $ifNull: [ { $arrayElemAt: ['$s.onHand', 0] }, 0 ] } } },
    // then exclude temp array 's' (no expressions here => exclusion projection is valid)
    { $project: { s: 0 } }
  ]);
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
    let row = await Stock.findOne({ branchId, productId }).session(session);
    if (!row) {
      if (delta < 0) throw new Error('Insufficient stock');
      row = new Stock({ branchId, productId, onHand: 0 });
    }
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
