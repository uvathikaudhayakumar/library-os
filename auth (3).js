const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

router.get('/', (req, res) => req.session.user ? res.redirect(req.session.user.role === 'admin' ? '/admin' : '/student') : res.redirect('/login'));
router.get('/login', (req, res) => res.render('login', { title: 'Sign in', error: null }));
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, portal } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase(), active: true });
    if (!user || user.role !== portal || !(await bcrypt.compare(password || '', user.passwordHash))) {
      return res.status(401).render('login', { title: 'Sign in', error: 'Invalid credentials or incorrect portal selected.' });
    }
    req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role, registrationNo: user.registrationNo };
    res.redirect(user.role === 'admin' ? '/admin' : '/student');
  } catch (e) { next(e); }
});
router.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));
module.exports = router;
