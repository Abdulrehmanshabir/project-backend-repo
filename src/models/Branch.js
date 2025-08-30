const { Schema, model } = require('mongoose');

const BranchSchema = new Schema({
  code: { type: String, unique: true, required: true }, // e.g., "karachi-1"
  name: { type: String, required: true },
  address: String,
  phone: { type: String }
}, { timestamps: true });

module.exports = model('Branch', BranchSchema);
