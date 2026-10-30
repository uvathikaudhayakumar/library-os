const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  message: String,
  read: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('Notification', schema);
