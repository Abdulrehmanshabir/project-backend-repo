const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  branchId: { type: String, required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, default: 'misc' },
  subcategory: { type: String, default: '' },
  kind: { type: String, enum: ['user','branch'], default: 'branch', index: true },
  expenseUserId: { type: String },
  note: { type: String, default: '' },
  // attribution
  createdBy: { type: String, index: true },
  createdByName: { type: String },
  createdByEmail: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
