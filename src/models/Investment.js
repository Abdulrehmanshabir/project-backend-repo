const mongoose = require('mongoose');

const InvestmentSchema = new mongoose.Schema({
  branchId: { type: String, required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  note: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Investment', InvestmentSchema);

