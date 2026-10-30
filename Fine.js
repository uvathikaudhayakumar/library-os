const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
  overdueDays: { type: Number, default: 0 },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
  paidAt: Date,
  paymentReference: String
}, { timestamps: true });
schema.index({ loan: 1 }, { unique: true });
module.exports = mongoose.model('Fine', schema);
