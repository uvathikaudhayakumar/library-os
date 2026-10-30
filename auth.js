exports.requireAuth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};
exports.requireRole = role => (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.role !== role) return res.status(403).render('error', { title: 'Access denied', message: 'You do not have permission to view this page.' });
  next();
};
