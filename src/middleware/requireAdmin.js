function requireAdmin(req, res, next) {
  const role = req.user?.role;
  if (role === 'admin') return next();
  return res.status(403).json({ message: 'Admin only' });
}

module.exports = { requireAdmin };

