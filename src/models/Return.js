const { Schema, model } = require('mongoose');

const ReturnSchema = new Schema({
  branchId: { type: String, index: true, required: true },
  saleId: { type: Schema.Types.ObjectId, ref: 'Sale', default: null },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    qty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
  }],
  totals: { subtotal: Number, refund: Number }
}, { timestamps: true });

module.exports = model('Return', ReturnSchema);

