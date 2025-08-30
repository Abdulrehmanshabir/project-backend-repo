const { Schema, model } = require('mongoose');

const StockMoveSchema = new Schema({
  branchId: { type: String, index: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  delta: Number,
  reason: { type: String, enum: ['purchase','sale','adjustment','transfer-in','transfer-out'] },
  refId: { type: String, index: true }
}, { timestamps: true });

module.exports = model('StockMove', StockMoveSchema);
