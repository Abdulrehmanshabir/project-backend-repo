const Joi = require('joi');
const Branch = require('../models/Branch');
let User;
try {
  // Prefer src/models when available
  User = require('../models/User');
} catch (e) {
  // Fallback to legacy root models path
  User = require('../../models/User');
}

const createSchema = Joi.object({
  code: Joi.string().trim().required(),
  name: Joi.string().trim().required(),
  address: Joi.string().allow(''),
  phone: Joi.string().allow(''),
});

exports.create = async (req, res) => {
  const data = await createSchema.validateAsync(req.body);
  const exists = await Branch.findOne({ code: data.code });
  if (exists) return res.status(400).json({ message: 'Branch code exists' });
  const b = await Branch.create(data);
  res.status(201).json(b);
};

exports.list = async (req, res) => {
  if (req.user?.role === 'admin' || req.user?.branches === '*') {
    const all = await Branch.find().sort({ createdAt: -1 }).lean();
    return res.json(all);
  }
  // Read current permissions from DB to reflect latest assignments
  const uid = req.user?.sub || req.user?._id || req.user?.id;
  let allowed = [];
  if (uid) {
    const u = await User.findById(uid).select('branches role').lean();
    if (u?.role === 'admin' || u?.branches === '*') {
      const all = await Branch.find().sort({ createdAt: -1 }).lean();
      return res.json(all);
    }
    if (Array.isArray(u?.branches)) allowed = u.branches;
    else if (typeof u?.branches === 'string' && u.branches) allowed = [u.branches];
  } else {
    if (Array.isArray(req.user?.branches)) allowed = req.user.branches;
    else if (typeof req.user?.branches === 'string' && req.user.branches) allowed = [req.user.branches];
  }
  const items = await Branch.find({ code: { $in: allowed } }).sort({ createdAt: -1 }).lean();
  res.json(items);
};

exports.listWithManagers = async (req, res) => {
  const role = req.user?.role;
  const isElevated = role === 'admin' || role === 'owner' || req.user?.branches === '*';
  if (!isElevated) return res.status(403).json({ message: 'Forbidden' });

  const branches = await Branch.find().sort({ createdAt: -1 }).lean();
  const users = await User.find({ role: { $in: ['manager','admin'] } }).select('name email role branches').lean();
  const map = new Map(branches.map(b => [b.code, { ...b, managers: [] }]));
  for (const u of users) {
    if (u.role === 'admin' || u.branches === '*') {
      // Admins considered managers for all branches
      for (const code of map.keys()) map.get(code).managers.push({ _id: u._id, name: u.name, email: u.email, role: u.role });
    } else if (Array.isArray(u.branches)) {
      for (const code of u.branches) if (map.has(code)) map.get(code).managers.push({ _id: u._id, name: u.name, email: u.email, role: u.role });
    } else if (typeof u.branches === 'string' && u.branches) {
      const code = String(u.branches);
      if (map.has(code)) map.get(code).managers.push({ _id: u._id, name: u.name, email: u.email, role: u.role });
    }
  }
  res.json(Array.from(map.values()));
};

const assignSchema = Joi.object({
  userId: Joi.string().required(),
});

exports.assignManager = async (req, res) => {
  const { code } = req.params;
  const { userId } = await assignSchema.validateAsync(req.body);
  const branch = await Branch.findOne({ code });
  if (!branch) return res.status(404).json({ message: 'Branch not found' });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Ensure role is manager (don’t downgrade admin)
  if (user.role !== 'admin') user.role = 'manager';

  if (user.role === 'admin' || user.branches === '*') {
    // Admins already have all; no change needed
  } else {
    // Single-branch managers: set to this code only
    const codeStr = String(code).trim();
    user.branches = codeStr;
  }
  await user.save();
  res.json({ ok: true, user: { id: user._id, role: user.role, branches: user.branches } });
};

exports.unassignManager = async (req, res) => {
  const { code } = req.params;
  const { userId } = await assignSchema.validateAsync(req.body);
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.role === 'admin' || user.branches === '*') {
    return res.status(400).json({ message: 'Cannot unassign admin or wildcard user' });
  }
  const codeStr = String(code).trim();
  const current = Array.isArray(user.branches) ? user.branches : [];
  user.branches = current.filter(c => c !== codeStr);
  await user.save();
  res.json({ ok: true, user: { id: user._id, role: user.role, branches: user.branches } });
};

