const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Book = require('../models/Book');
const Reservation = require('../models/Reservation');
const Loan = require('../models/Loan');
const Fine = require('../models/Fine');
const Alert = require('../models/Alert');
const Notification = require('../models/Notification');
const { refreshAlerts } = require('../utils/alerts');

router.use(requireAuth, requireRole('admin'));
router.get('/', async (req, res, next) => {
  try {
    await refreshAlerts(req.io);
    const [students, books, available, issued, reservations, overdue, unpaid, collected, returnRequests, alerts, recentReservations] = await Promise.all([
      User.countDocuments({ role: 'student' }), Book.countDocuments(), Book.aggregate([{ $group: { _id: null, n: { $sum: '$availableCopies' } } }]),
      Loan.countDocuments({ status: { $in: ['Issued', 'Return Requested'] } }),
      Reservation.countDocuments({ status: 'Pending' }),
      Loan.countDocuments({ status: { $in: ['Issued', 'Return Requested'] }, dueAt: { $lt: new Date() } }),
      Fine.aggregate([{ $match: { status: 'Unpaid' } }, { $group: { _id: null, n: { $sum: '$amount' } } }]),
      Fine.aggregate([{ $match: { status: 'Paid' } }, { $group: { _id: null, n: { $sum: '$amount' } } }]),
      Loan.countDocuments({ status: 'Return Requested' }),
      Alert.find({ resolved: false }).populate('student book').sort({ priority: 1, createdAt: -1 }).limit(30),
      Reservation.find().populate('student book').sort({ createdAt: -1 }).limit(8)
    ]);
    res.render('admin/dashboard', { title: 'Admin Dashboard', stats: { students, books, available: available[0]?.n || 0, issued, reservations, overdue, unpaid: unpaid[0]?.n || 0, collected: collected[0]?.n || 0, returnRequests }, alerts, recentReservations });
  } catch (e) { next(e); }
});
router.get('/books', async (req, res, next) => {
  try { const books = await Book.find().sort({ createdAt: -1 }); res.render('admin/books', { title: 'Manage Books', books }); } catch (e) { next(e); }
});
router.post('/books', async (req, res, next) => {
  try {
    const total = Math.max(0, Number(req.body.totalCopies || 0));
    await Book.create({ title: req.body.title, author: req.body.author, isbn: req.body.isbn || undefined, category: req.body.category, coverUrl: req.body.coverUrl, totalCopies: total, availableCopies: total, description: req.body.description });
    req.io.emit('admin:activity'); req.session.flash = 'Book added successfully.'; res.redirect('/admin/books');
  } catch (e) { next(e); }
});
router.post('/books/:id/delete', async (req, res, next) => {
  try { await Book.findByIdAndDelete(req.params.id); req.io.emit('admin:activity'); req.session.flash = 'Book deleted.'; res.redirect('/admin/books'); } catch (e) { next(e); }
});
router.get('/students', async (req, res, next) => {
  try { const students = await User.find({ role: 'student' }).sort({ name: 1 }); res.render('admin/students', { title: 'Students', students }); } catch (e) { next(e); }
});
router.get('/reservations', async (req, res, next) => {
  try { const reservations = await Reservation.find().populate('student book').sort({ createdAt: -1 }); res.render('admin/reservations', { title: 'Reservations', reservations }); } catch (e) { next(e); }
});
router.post('/reservations/:id/:action', async (req, res, next) => {
  try {
    const item = await Reservation.findById(req.params.id).populate('student book');
    if (!item || item.status !== 'Pending') return res.status(400).send('Reservation is no longer pending.');
    if (req.params.action === 'approve') {
      if (!item.book || item.book.availableCopies < 1) { req.session.flash = 'No available copies. Reservation cannot be approved.'; return res.redirect('/admin/reservations'); }
      item.status = 'Approved';
    } else item.status = 'Rejected';
    item.reviewedAt = new Date(); await item.save();
    if (item.student) await Notification.create({ recipient: item.student._id, title: 'Reservation update', message: `Your reservation for ${item.book?.title || 'a book'} was ${item.status.toLowerCase()}.` });
    req.io.emit('student:notification', item.student?._id.toString()); req.io.emit('admin:activity');
    req.session.flash = `Reservation ${item.status.toLowerCase()}.`; res.redirect('/admin/reservations');
  } catch (e) { next(e); }
});
router.get('/loans', async (req, res, next) => {
  try { const loans = await Loan.find().populate('student book').sort({ createdAt: -1 }); const students = await User.find({ role: 'student' }).sort({ name: 1 }); const books = await Book.find({ availableCopies: { $gt: 0 } }).sort({ title: 1 }); res.render('admin/loans', { title: 'Issue & Return', loans, students, books }); } catch (e) { next(e); }
});
router.post('/loans/issue', async (req, res, next) => {
  try {
    const [student, book] = await Promise.all([User.findOne({ _id: req.body.student, role: 'student' }), Book.findById(req.body.book)]);
    if (!student || !book || book.availableCopies < 1) { req.session.flash = 'Invalid student or book unavailable.'; return res.redirect('/admin/loans'); }
    const dueAt = new Date(req.body.dueAt);
    if (Number.isNaN(dueAt.getTime()) || dueAt <= new Date()) { req.session.flash = 'Choose a valid future due date.'; return res.redirect('/admin/loans'); }
    book.availableCopies -= 1; await book.save();
    const loan = await Loan.create({ student: student._id, book: book._id, dueAt });
    await Notification.create({ recipient: student._id, title: 'Book issued', message: `${book.title} has been issued. Due date: ${dueAt.toLocaleDateString()}.` });
    req.io.emit('student:notification', student._id.toString()); req.io.emit('admin:activity');
    req.session.flash = `Book issued to ${student.name}.`; res.redirect('/admin/loans');
  } catch (e) { next(e); }
});
router.post('/loans/:id/return', async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id).populate('student book');
    if (!loan || loan.status === 'Returned') return res.status(400).send('Loan already returned or not found.');
    loan.status = 'Returned'; loan.returnedAt = new Date(); await loan.save();
    if (loan.book) { loan.book.availableCopies = Math.min(loan.book.totalCopies, loan.book.availableCopies + 1); await loan.book.save(); }
    const overdueDays = Math.max(0, Math.ceil((loan.returnedAt - loan.dueAt) / 86400000));
    if (overdueDays > 0) {
      const amount = overdueDays * Number(process.env.FINE_PER_DAY || 5);
      await Fine.findOneAndUpdate({ loan: loan._id }, { student: loan.student._id, loan: loan._id, overdueDays, amount, status: 'Unpaid' }, { upsert: true, new: true });
      await Notification.create({ recipient: loan.student._id, title: 'Fine generated', message: `A fine of ₹${amount} has been generated for ${loan.book?.title || 'the returned book'}.` });
    }
    await Notification.create({ recipient: loan.student._id, title: 'Book return confirmed', message: `${loan.book?.title || 'Your book'} has been marked as returned.` });
    req.io.emit('student:notification', loan.student._id.toString()); req.io.emit('admin:activity');
    req.session.flash = overdueDays ? `Return completed. Fine of ₹${overdueDays * Number(process.env.FINE_PER_DAY || 5)} generated.` : 'Book return completed.';
    res.redirect('/admin/loans');
  } catch (e) { next(e); }
});
router.get('/fines', async (req, res, next) => {
  try { const fines = await Fine.find().populate('student loan').sort({ createdAt: -1 }); res.render('admin/fines', { title: 'Fine Management', fines }); } catch (e) { next(e); }
});
router.post('/fines/:id/paid', async (req, res, next) => {
  try {
    const fine = await Fine.findById(req.params.id).populate('student');
    if (!fine) return res.status(404).send('Fine not found');
    fine.status = 'Paid'; fine.paidAt = new Date(); fine.paymentReference = String(req.body.reference || 'Admin-confirmed').slice(0, 100); await fine.save();
    if (fine.student) await Notification.create({ recipient: fine.student._id, title: 'Fine payment updated', message: `Your fine of ₹${fine.amount} is marked as paid.` });
    req.io.emit('student:notification', fine.student?._id.toString()); req.io.emit('admin:activity');
    req.session.flash = 'Fine marked as paid after admin confirmation.'; res.redirect('/admin/fines');
  } catch (e) { next(e); }
});
router.post('/alerts/:id/read', async (req, res, next) => {
  try { await Alert.findByIdAndUpdate(req.params.id, { read: true }); res.redirect('/admin'); } catch (e) { next(e); }
});
router.post('/alerts/:id/resolve', async (req, res, next) => {
  try { await Alert.findByIdAndUpdate(req.params.id, { resolved: true, read: true }); res.redirect('/admin'); } catch (e) { next(e); }
});
router.get('/api/analytics', async (req, res, next) => {
  try {
    const byMonth = await Loan.aggregate([{ $group: { _id: { $dateToString: { format: '%Y-%m', date: '$issuedAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 12 }]);
    const categories = await Book.aggregate([{ $group: { _id: '$category', count: { $sum: '$totalCopies' } } }, { $sort: { count: -1 } }, { $limit: 8 }]);
    res.json({ byMonth, categories });
  } catch (e) { next(e); }
});
module.exports = router;
