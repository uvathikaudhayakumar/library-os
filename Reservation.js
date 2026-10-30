const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Issued', 'Expired'], default: 'Pending' },
  reservedAt: { type: Date, default: Date.now },
  reviewedAt: Date
}, { timestamps: true });
schema.index({ student: 1, book: 1, status: 1 });
module.exports = mongoose.model('Reservation', schema);
