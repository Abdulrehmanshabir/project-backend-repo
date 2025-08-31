const { Schema, model } = require('mongoose');

const ProductSchema = new Schema({
  sku: { type: String, unique: true, required: true },
  name: { type: String, required: true, index: true },
  brand: String,
  category: String,
  unit: { type: String, enum: ['pcs','ml'], default: 'pcs' },
  unitSize: { type: Number, min: 1, default: 1 },
  price: { type: Number, default: 0 },
  retailPrice: { type: Number, min: 0, default: null }
}, { timestamps: true });

module.exports = model('Product', ProductSchema);
