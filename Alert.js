const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  key: { type: String, unique: true },
  priority: { type: String, enum: ['Critical', 'High', 'Normal'], default: 'Normal' },
  title: String,
  message: String,
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  read: { type: Boolean, default: false },
  resolved: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('Alert', schema);
