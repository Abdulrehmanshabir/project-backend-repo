let User;
try { User = require('../models/User'); } catch (_) {
  try { User = require('../../models/User'); } catch (_) { User = null; }
}

async function branchScope(req, res, next) {
  const { role } = req.user || {};
  const target = req.params.branchId || req.query.branchId || req.body.branchId;
  // Allow admin/owner to request all branches aggregate with branchId=all
  if ((role === 'admin' || role === 'owner') && String(target).toLowerCase() === 'all') {
    return next();
  }
  if (!target) return res.status(400).json({ message: 'branchId required' });
  if (role === 'owner' || req.user?.branches === '*') return next();

  // Load latest branches from DB for managers, so changes reflect without re-login
  let allowed = [];
  if (User && req.user?.sub) {
    try {
      const u = await User.findById(req.user.sub).select('branches role').lean();
      if (u?.role === 'admin' || u?.branches === '*') return next();
      if (Array.isArray(u?.branches)) allowed = u.branches;
      else if (typeof u?.branches === 'string' && u.branches) allowed = [u.branches];
    } catch {}
  }
  if (!allowed.length) {
    let branches = req.user?.branches;
    if (typeof branches === 'string' && branches) branches = [branches];
    if (!Array.isArray(branches)) branches = [];
    allowed = branches;
  }

  if (allowed.includes(target)) return next();
  return res.status(403).json({ message: 'Forbidden: branch scope' });
}
module.exports = { branchScope };
