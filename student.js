const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const Book = require('../models/Book');
const Reservation = require('../models/Reservation');
const Loan = require('../models/Loan');
const Fine = require('../models/Fine');
const Notification = require('../models/Notification');
const User = require('../models/User');

router.use(requireAuth, requireRole('student'));
router.get('/', async (req, res, next) => {
  try {
    const id = req.session.user.id;
    const [student, books, reservations, loans, fines, notifications] = await Promise.all([
      User.findById(id), Book.find().sort({ createdAt: -1 }).limit(12),
      Reservation.find({ student: id }).populate('book').sort({ createdAt: -1 }).limit(8),
      Loan.find({ student: id }).populate('book').sort({ createdAt: -1 }).limit(10),
      Fine.find({ student: id, status: 'Unpaid' }),
      Notification.find({ recipient: id }).sort({ createdAt: -1 }).limit(8)
    ]);
    res.render('student/dashboard', { title: 'Student Dashboard', student, books, reservations, loans, fines, notifications, query: '' });
  } catch (e) { next(e); }
});
router.get('/books', async (req, res, next) => {
  try {
    const q = String(req.query.q || '');
    const filter = q ? { $or: [{ title: new RegExp(q, 'i') }, { author: new RegExp(q, 'i') }, { category: new RegExp(q, 'i') }, { isbn: new RegExp(q, 'i') }] } : {};
    const books = await Book.find(filter).sort({ title: 1 });
    res.render('student/books', { title: 'Book Catalogue', books, query: q });
  } catch (e) { next(e); }
});
router.post('/reserve/:bookId', async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).send('Book not found');
    const duplicate = await Reservation.findOne({ student: req.session.user.id, book: book._id, status: { $in: ['Pending', 'Approved', 'Issued'] } });
    if (duplicate) { req.session.flash = 'You already have an active reservation for this book.'; return res.redirect('/student/books'); }
    if (book.availableCopies < 1) { req.session.flash = 'This book is currently unavailable. Please check back later.'; return res.redirect('/student/books'); }
    await Reservation.create({ student: req.session.user.id, book: book._id });
    req.io.emit('admin:activity');
    req.session.flash = 'Reservation request submitted successfully.';
    res.redirect('/student');
  } catch (e) { next(e); }
});
router.post('/return-request/:loanId', async (req, res, next) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.loanId, student: req.session.user.id, status: 'Issued' });
    if (!loan) return res.status(404).send('Active loan not found');
    loan.status = 'Return Requested'; await loan.save();
    req.io.emit('admin:activity');
    req.session.flash = 'Return request sent to the library admin.';
    res.redirect('/student');
  } catch (e) { next(e); }
});
module.exports = router;
