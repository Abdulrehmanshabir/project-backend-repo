function branchScope(req, res, next) {
  const { role, branches } = req.user || {};
  if (role === 'owner' || branches === '*' || (Array.isArray(branches) && branches.length === 0)) return next();
  const target = req.params.branchId || req.query.branchId || req.body.branchId;
  if (!target) return res.status(400).json({ message: 'branchId required' });
  if (Array.isArray(branches) && branches.includes(target)) return next();
  return res.status(403).json({ message: 'Forbidden: branch scope' });
}
module.exports = { branchScope };
