const { Schema, model } = require('mongoose');

const SaleSchema = new Schema({
  branchId: { type: String, index: true },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    qty: Number,
    unitPrice: Number,
    taxRate: Number
  }],
  totals: { subtotal: Number, tax: Number, grand: Number }
}, { timestamps: true });

module.exports = model('Sale', SaleSchema);
