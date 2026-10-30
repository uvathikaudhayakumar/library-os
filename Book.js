const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  isbn: { type: String, unique: true, sparse: true, trim: true },
  category: { type: String, default: 'General' },
  coverUrl: String,
  totalCopies: { type: Number, default: 1, min: 0 },
  availableCopies: { type: Number, default: 1, min: 0 },
  description: String
}, { timestamps: true });
module.exports = mongoose.model('Book', schema);
