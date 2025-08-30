const Stock = require('../models/Stock');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Investment = require('../models/Investment');
const Expense = require('../models/Expense');

exports.lowStock = async (req, res) => {
  const branchId = req.query.branchId;
  const threshold = Number(req.query.threshold ?? 5);
  if (!branchId) return res.status(400).json({ message: 'branchId required' });

  const rows = await Stock.find({ branchId }).populate('productId').lean();
  const low = rows
    .filter(r => r.onHand <= threshold)
    .map(r => ({ productId: r.productId._id, sku: r.productId.sku, name: r.productId.name, onHand: r.onHand }));
  res.json(low);
};

exports.dailySales = async (req, res) => {
  const branchId = req.query.branchId;
  const since = new Date(); since.setHours(0, 0, 0, 0);
  const match = { createdAt: { $gte: since } };
  if (branchId) match.branchId = branchId;
  const items = await Sale.find(match).sort({ createdAt: -1 }).lean();
  res.json(items);
};

exports.analytics = async (req, res) => {
  const branchId = req.query.branchId;
  if (!branchId) return res.status(400).json({ message: 'branchId required' });

  const startToday = new Date(); startToday.setHours(0,0,0,0);
  const start7d = new Date(); start7d.setDate(start7d.getDate() - 6); start7d.setHours(0,0,0,0);

  const [todayAgg, weekAgg, topAgg, lowCount, expenses7d, investments7d] = await Promise.all([
    Sale.aggregate([
      { $match: { branchId, createdAt: { $gte: startToday } } },
      { $unwind: '$items' },
      { $group: { _id: null, qty: { $sum: '$items.qty' }, revenue: { $sum: { $add: [ { $multiply: ['$items.unitPrice', '$items.qty'] }, { $multiply: ['$items.taxRate', '$items.unitPrice', '$items.qty'] } ] } } } },
    ]),
    Sale.aggregate([
      { $match: { branchId, createdAt: { $gte: start7d } } },
      { $unwind: '$items' },
      { $group: { _id: null, qty: { $sum: '$items.qty' }, revenue: { $sum: { $add: [ { $multiply: ['$items.unitPrice', '$items.qty'] }, { $multiply: ['$items.taxRate', '$items.unitPrice', '$items.qty'] } ] } } } },
    ]),
    Sale.aggregate([
      { $match: { branchId, createdAt: { $gte: start7d } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', qty: { $sum: '$items.qty' } } },
      { $sort: { qty: -1 } },
      { $limit: 5 },
    ]),
    (async () => {
      const threshold = Number(req.query.lowThreshold ?? 5);
      const rows = await Stock.find({ branchId }).select('onHand').lean();
      return rows.filter(r => r.onHand <= threshold).length;
    })(),
    Expense.aggregate([
      { $match: { branchId, createdAt: { $gte: start7d } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Investment.aggregate([
      { $match: { branchId, createdAt: { $gte: start7d } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  // Attach product info to top products
  let topProducts = [];
  if (topAgg.length) {
    const prods = await Product.find({ _id: { $in: topAgg.map(t => t._id) } }).select('name sku').lean();
    const map = new Map(prods.map(p => [String(p._id), p]));
    topProducts = topAgg.map(t => ({ productId: t._id, qty: t.qty, name: map.get(String(t._id))?.name || 'Item', sku: map.get(String(t._id))?.sku || '' }));
  }

  const expensesTotal = expenses7d[0]?.total || 0;
  const investmentsTotal = investments7d[0]?.total || 0;
  const revenue7d = weekAgg[0]?.revenue || 0;
  const profit7d = revenue7d - expensesTotal; // COGS placeholder = 0
  const roi7d = investmentsTotal ? (profit7d / investmentsTotal) : null;

  res.json({
    branchId,
    today: { qty: todayAgg[0]?.qty || 0, revenue: todayAgg[0]?.revenue || 0 },
    last7d: { qty: weekAgg[0]?.qty || 0, revenue: revenue7d, expenses: expensesTotal, investments: investmentsTotal, profit: profit7d, roi: roi7d },
    topProducts,
    lowStockCount: lowCount || 0,
  });
};

exports.overview = async (req, res) => {
  // Only for elevated roles; simple check using req.user.role
  const role = req.user?.role;
  if (!role || (role !== 'owner' && role !== 'admin')) return res.status(403).json({ message: 'Forbidden' });

  const startToday = new Date(); startToday.setHours(0,0,0,0);
  const start7d = new Date(); start7d.setDate(start7d.getDate() - 6); start7d.setHours(0,0,0,0);

  const [todayAgg, weekAgg] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: startToday } } },
      { $unwind: '$items' },
      { $group: { _id: '$branchId', qty: { $sum: '$items.qty' }, revenue: { $sum: { $add: [ { $multiply: ['$items.unitPrice', '$items.qty'] }, { $multiply: ['$items.taxRate', '$items.unitPrice', '$items.qty'] } ] } } } },
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: start7d } } },
      { $unwind: '$items' },
      { $group: { _id: '$branchId', qty: { $sum: '$items.qty' }, revenue: { $sum: { $add: [ { $multiply: ['$items.unitPrice', '$items.qty'] }, { $multiply: ['$items.taxRate', '$items.unitPrice', '$items.qty'] } ] } } } },
    ]),
  ]);

  // Normalize arrays into { branchId: { qty, revenue } }
  const norm = (arr) => Object.fromEntries(arr.map(r => [r._id, { qty: r.qty, revenue: r.revenue }]));
  res.json({ today: norm(todayAgg), last7d: norm(weekAgg) });
};

exports.addInvestment = async (req, res) => {
  const branchId = req.body.branchId || req.query.branchId;
  const amount = Number(req.body.amount);
  const note = req.body.note || '';
  if (!branchId) return res.status(400).json({ message: 'branchId required' });
  if (!(amount >= 0)) return res.status(400).json({ message: 'amount invalid' });
  const doc = await Investment.create({ branchId, amount, note });
  res.status(201).json(doc);
};

exports.listInvestments = async (req, res) => {
  const branchId = req.query.branchId;
  if (!branchId) return res.status(400).json({ message: 'branchId required' });
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  const filter = { branchId };
  if (from || to) filter.createdAt = {};
  if (from) filter.createdAt.$gte = from;
  if (to) filter.createdAt.$lte = to;
  const list = await Investment.find(filter).sort({ createdAt: -1 }).lean();
  const total = list.reduce((a, x) => a + (x.amount || 0), 0);
  res.json({ total, items: list });
};

exports.addExpense = async (req, res) => {
  const branchId = req.body.branchId || req.query.branchId;
  const amount = Number(req.body.amount);
  const category = req.body.category || 'misc';
  const note = req.body.note || '';
  if (!branchId) return res.status(400).json({ message: 'branchId required' });
  if (!(amount >= 0)) return res.status(400).json({ message: 'amount invalid' });
  const by = req.user || {};
  const doc = await Expense.create({
    branchId,
    amount,
    category,
    note,
    createdBy: by.sub || by._id || '',
    createdByName: by.name || by.username || '',
    createdByEmail: by.email || '',
  });
  res.status(201).json(doc);
};

exports.listExpenses = async (req, res) => {
  const branchId = req.query.branchId;
  if (!branchId) return res.status(400).json({ message: 'branchId required' });
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  const filter = { branchId };
  // allow filtering by user
  if (req.query.mine === 'true') {
    const uid = req.user?.sub || req.user?._id;
    if (uid) filter.createdBy = String(uid);
  } else if (req.query.userId) {
    filter.createdBy = String(req.query.userId);
  }
  if (from || to) filter.createdAt = {};
  if (from) filter.createdAt.$gte = from;
  if (to) filter.createdAt.$lte = to;
  const list = await Expense.find(filter).sort({ createdAt: -1 }).lean();
  const total = list.reduce((a, x) => a + (x.amount || 0), 0);
  res.json({ total, items: list });
};
