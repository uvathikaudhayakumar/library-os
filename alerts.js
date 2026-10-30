const Alert = require('../models/Alert');
const Loan = require('../models/Loan');
const Book = require('../models/Book');
const Fine = require('../models/Fine');
const Reservation = require('../models/Reservation');

async function upsertAlert(key, data) {
  return Alert.findOneAndUpdate({ key }, { $set: { ...data, resolved: false } }, { upsert: true, new: true, setDefaultsOnInsert: true });
}
async function refreshAlerts(io) {
  const now = new Date();
  const dueSoon = new Date(now.getTime() + Number(process.env.DUE_SOON_DAYS || 3) * 86400000);
  const loans = await Loan.find({ status: { $in: ['Issued', 'Return Requested'] } }).populate('student book');
  const activeKeys = [];
  for (const loan of loans) {
    if (!loan.student || !loan.book) continue;
    if (loan.dueAt < now) {
      const key = `overdue:${loan._id}`;
      activeKeys.push(key);
      await upsertAlert(key, { priority: 'Critical', title: 'Overdue book', message: `${loan.book.title} is overdue for ${loan.student.name}.`, student: loan.student._id, book: loan.book._id });
    } else if (loan.dueAt <= dueSoon) {
      const key = `due-soon:${loan._id}`;
      activeKeys.push(key);
      await upsertAlert(key, { priority: 'High', title: 'Due date approaching', message: `${loan.book.title} is due soon for ${loan.student.name}.`, student: loan.student._id, book: loan.book._id });
    }
  }
  const fines = await Fine.find({ status: 'Unpaid' }).populate('student loan');
  for (const fine of fines) {
    const key = `fine:${fine._id}`;
    activeKeys.push(key);
    await upsertAlert(key, { priority: fine.amount >= 100 ? 'Critical' : 'High', title: 'Unpaid fine', message: `${fine.student?.name || 'Student'} has an unpaid fine of ₹${fine.amount}.`, student: fine.student?._id, book: null });
  }
  const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 2);
  const lowBooks = await Book.find({ availableCopies: { $lte: threshold } });
  for (const book of lowBooks) {
    const key = `low-stock:${book._id}`;
    activeKeys.push(key);
    await upsertAlert(key, { priority: book.availableCopies === 0 ? 'Critical' : 'High', title: 'Low book inventory', message: `${book.title} has ${book.availableCopies} available copies.`, book: book._id });
  }
  const pending = await Reservation.find({ status: 'Pending' }).populate('student book');
  for (const item of pending) {
    const key = `reservation:${item._id}`;
    activeKeys.push(key);
    await upsertAlert(key, { priority: 'Normal', title: 'New reservation', message: `${item.student?.name || 'A student'} requested ${item.book?.title || 'a book'}.`, student: item.student?._id, book: item.book?._id });
  }
  await Alert.updateMany({ key: { $nin: activeKeys }, resolved: false }, { $set: { resolved: true } });
  if (io) io.emit('alerts:updated');
}
module.exports = { refreshAlerts };
