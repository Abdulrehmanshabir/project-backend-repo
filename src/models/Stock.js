const { Schema, model } = require('mongoose');

const StockSchema = new Schema({
  branchId: { type: String, index: true, required: true }, // Branch.code
  productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true, required: true },
  onHand: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 0 }
}, { timestamps: true });

StockSchema.index({ branchId: 1, productId: 1 }, { unique: true });

module.exports = model('Stock', StockSchema);
