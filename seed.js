require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/advanced_library');
  const email = (process.env.ADMIN_EMAIL || 'admin@library.local').toLowerCase();
  const existing = await User.findOne({ email });
  if (!existing) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 12);
    await User.create({ name: process.env.ADMIN_NAME || 'Library Administrator', email, passwordHash, role: 'admin' });
    console.log(`Admin created: ${email}`);
  } else console.log('Admin already exists; no changes made.');
  console.log('Create student accounts through a controlled admin workflow or database import.');
  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });
