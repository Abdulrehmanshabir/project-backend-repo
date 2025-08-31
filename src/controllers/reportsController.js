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

// Combined daily transactions: sales (line items) + expenses
exports.dailyTransactions = async (req, res) => {
  const branchId = req.query.branchId;
  const dateStr = req.query.date; // YYYY-MM-DD
  if (!branchId) return res.status(400).json({ message: 'branchId required' });

  const start = dateStr ? new Date(dateStr + 'T00:00:00.000Z') : new Date();
  if (!dateStr) start.setHours(0,0,0,0);
  const end = new Date(start); end.setHours(23,59,59,999);

  // Sales for the day
  const sales = await Sale.find({ branchId, createdAt: { $gte: start, $lte: end } }).lean();
  const productIds = new Set();
  sales.forEach(s => (s.items||[]).forEach(it => productIds.add(String(it.productId))));
  const prods = await Product.find({ _id: { $in: Array.from(productIds) } }).select('sku name retailPrice').lean();
  const pmap = new Map(prods.map(p => [String(p._id), p]));

  const saleRows = [];
  let salesSubtotal = 0;
  let salesDiscount = 0;
  for (const s of sales) {
    salesSubtotal += Number(s.totals?.subtotal||0);
    salesDiscount += Number(s.totals?.discount||0);
    for (const it of (s.items||[])) {
      const p = pmap.get(String(it.productId)) || {};
      saleRows.push({
        type: 'sale',
        createdAt: s.createdAt,
        saleId: s._id,
        productId: it.productId,
        sku: p.sku || '',
        name: p.name || it.name || 'Item',
        qty: Number(it.qty||0),
        unitPrice: Number(it.unitPrice||0),
        lineTotal: Number(it.unitPrice||0) * Number(it.qty||0),
        retailPrice: Number((p && p.retailPrice != null) ? p.retailPrice : 0)
      });
    }
  }

  // Expenses for the day
  const expItems = await Expense.find({ branchId, createdAt: { $gte: start, $lte: end } }).lean();
  const expenseRows = expItems.map(e => ({
    type: 'expense',
    createdAt: e.createdAt,
    expenseId: e._id,
    kind: e.kind || 'branch',
    category: e.category || 'misc',
    subcategory: e.subcategory || '',
    amount: Number(e.amount||0),
    createdByName: e.createdByName || '',
    createdByEmail: e.createdByEmail || '',
    note: e.note || ''
  }));
  const expensesTotal = expItems.reduce((a,x)=>a+Number(x.amount||0),0);

  const rows = [...saleRows, ...expenseRows].sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));
  const salesNet = Math.max(0, salesSubtotal - salesDiscount);
  const net = salesNet - expensesTotal;

  res.json({
    branchId,
    date: start.toISOString().slice(0,10),
    totals: { salesSubtotal, salesDiscount, salesNet, expensesTotal, net },
    rows
  });
};

// Range transactions: aggregates multiple days of dailyTransactions
// GET /api/reports/range-transactions?branchId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
exports.rangeTransactions = async (req, res) => {
  try {
    const branchId = req.query.branchId;
    const fromStr = req.query.from; // YYYY-MM-DD
    const toStr = req.query.to; // YYYY-MM-DD
    // Support all-branches mode for admin/owner when branchId is 'all'
    const role = req.user?.role;
    const isAll = !branchId || String(branchId).toLowerCase() === 'all';
    if (isAll && !(role === 'admin' || role === 'owner')) return res.status(403).json({ message: 'Forbidden' });
    if (!isAll && !branchId) return res.status(400).json({ message: 'branchId required' });
    if (!fromStr || !toStr) return res.status(400).json({ message: 'from and to required (YYYY-MM-DD)' });

    const from = new Date(fromStr + 'T00:00:00.000Z');
    const toEnd = new Date(toStr + 'T23:59:59.999Z');

    // Fetch all sales and expenses in range, then group per-day
    const match = isAll ? { createdAt: { $gte: from, $lte: toEnd } } : { branchId, createdAt: { $gte: from, $lte: toEnd } };
    const [sales, expenses] = await Promise.all([
      Sale.find(match).lean(),
      Expense.find(match).lean(),
    ]);

    // Preload product map for sales items
    const productIds = new Set();
    sales.forEach(s => (s.items || []).forEach(it => productIds.add(String(it.productId))));
    const prods = await Product.find({ _id: { $in: Array.from(productIds) } }).select('sku name').lean();
    const pmap = new Map(prods.map(p => [String(p._id), p]));

    // Helper to date key YYYY-MM-DD in UTC
    const toKey = (d) => new Date(d).toISOString().slice(0, 10);

    const days = new Map(); // key -> { date, totals, rows }

    const ensureDay = (key) => {
      if (!days.has(key)) {
        days.set(key, {
          date: key,
          totals: { salesSubtotal: 0, salesDiscount: 0, salesNet: 0, expensesTotal: 0, net: 0 },
          rows: [],
        });
      }
      return days.get(key);
    };

    // Process sales
    for (const s of sales) {
      const key = toKey(s.createdAt);
      const day = ensureDay(key);
      const subtotal = Number(s.totals?.subtotal || 0);
      const discount = Number(s.totals?.discount || 0);
      day.totals.salesSubtotal += subtotal;
      day.totals.salesDiscount += discount;
      for (const it of (s.items || [])) {
        const p = pmap.get(String(it.productId)) || {};
        day.rows.push({
          type: 'sale',
          createdAt: s.createdAt,
          saleId: s._id,
          productId: it.productId,
          sku: p.sku || '',
          name: p.name || it.name || 'Item',
          qty: Number(it.qty || 0),
          unitPrice: Number(it.unitPrice || 0),
          lineTotal: Number(it.unitPrice || 0) * Number(it.qty || 0),
        });
      }
    }

    // Process expenses
    for (const e of expenses) {
      const key = toKey(e.createdAt);
      const day = ensureDay(key);
      const amount = Number(e.amount || 0);
      day.totals.expensesTotal += amount;
      day.rows.push({
        type: 'expense',
        createdAt: e.createdAt,
        expenseId: e._id,
        kind: e.kind || 'branch',
        category: e.category || 'misc',
        subcategory: e.subcategory || '',
        amount,
        createdByName: e.createdByName || '',
        createdByEmail: e.createdByEmail || '',
        note: e.note || '',
      });
    }

    // Finalize per-day totals and sort rows by time
    const dayArray = Array.from(days.values())
      .map(d => {
        const salesNet = Math.max(0, d.totals.salesSubtotal - d.totals.salesDiscount);
        const net = salesNet - d.totals.expensesTotal;
        d.totals.salesNet = salesNet;
        d.totals.net = net;
        d.rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return d;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Overall totals
    const overall = dayArray.reduce(
      (acc, d) => {
        acc.salesSubtotal += d.totals.salesSubtotal;
        acc.salesDiscount += d.totals.salesDiscount;
        acc.salesNet += d.totals.salesNet;
        acc.expensesTotal += d.totals.expensesTotal;
        acc.net += d.totals.net;
        return acc;
      },
      { salesSubtotal: 0, salesDiscount: 0, salesNet: 0, expensesTotal: 0, net: 0 }
    );

    res.json({ branchId: isAll ? 'all' : branchId, from: fromStr, to: toStr, overall, days: dayArray, _debug: { matchedSales: sales.length, matchedExpenses: expenses.length } });
  } catch (err) {
    console.error('rangeTransactions error', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
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
      { $group: { _id: null, qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.qty'] } } } },
    ]),
    Sale.aggregate([
      { $match: { branchId, createdAt: { $gte: start7d } } },
      { $unwind: '$items' },
      { $group: { _id: null, qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.qty'] } } } },
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
      { $group: { _id: '$branchId', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.qty'] } } } },
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: start7d } } },
      { $unwind: '$items' },
      { $group: { _id: '$branchId', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.qty'] } } } },
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
  const subcategory = req.body.subcategory || '';
  const kind = (req.body.kind === 'user' || req.body.kind === 'branch') ? req.body.kind : 'branch';
  const expenseUserId = req.body.expenseUserId || req.body.userId || '';
  const attributeToEmployee = req.body.attributeToEmployee === true || req.body.attributeToEmployee === 'true';
  const note = req.body.note || '';
  if (!branchId) return res.status(400).json({ message: 'branchId required' });
  if (!(amount >= 0)) return res.status(400).json({ message: 'amount invalid' });
  const by = req.user || {};
  // Option A: if admin/owner selected an employee and wants attribution to employee,
  // override createdBy fields to that employee. Otherwise keep actor as creator.
  let createdBy = by.sub || by._id || '';
  let createdByName = by.name || by.username || '';
  let createdByEmail = by.email || '';
  if ((by.role === 'admin' || by.role === 'owner') && attributeToEmployee && expenseUserId) {
    createdBy = String(expenseUserId);
    // Name/email not available here without extra query; leave blank to avoid stale data
    createdByName = '';
    createdByEmail = '';
  }
  const doc = await Expense.create({
    branchId,
    amount,
    category,
    subcategory,
    kind,
    expenseUserId: (by.role === 'admin' || by.role === 'owner') ? expenseUserId : '',
    note,
    createdBy,
    createdByName,
    createdByEmail,
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
  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.subcategory) filter.subcategory = req.query.subcategory;
  if (from || to) filter.createdAt = {};
  if (from) filter.createdAt.$gte = from;
  if (to) filter.createdAt.$lte = to;
  const list = await Expense.find(filter).sort({ createdAt: -1 }).lean();
  const total = list.reduce((a, x) => a + (x.amount || 0), 0);
  res.json({ total, items: list });
};

// Per-user hisab within a branch and date range
exports.expensesByUser = async (req, res) => {
  const branchId = req.query.branchId; // optional when admin/owner wants all branches
  const userId = req.query.userId;
  const role = req.user?.role;
  const allBranches = !branchId || String(branchId).toLowerCase() === 'all';
  if (allBranches && !(role === 'admin' || role === 'owner')) return res.status(403).json({ message: 'Forbidden' });
  if (!branchId && !allBranches) return res.status(400).json({ message: 'branchId required' });
  if (!userId) return res.status(400).json({ message: 'userId required' });
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  const filter = { createdBy: String(userId) };
  if (!allBranches) filter.branchId = branchId;
  if (from || to) filter.createdAt = {};
  if (from) filter.createdAt.$gte = from;
  if (to) filter.createdAt.$lte = to;
  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.subcategory) filter.subcategory = req.query.subcategory;
  const items = await Expense.find(filter).sort({ createdAt: -1 }).lean();
  const total = items.reduce((a, x) => a + (x.amount || 0), 0);
  res.json({ branchId: allBranches ? 'all' : branchId, userId, total, items });
};

// Per-branch hisab in date range
exports.expensesByBranch = async (req, res) => {
  const branchId = req.query.branchId;
  if (!branchId) return res.status(400).json({ message: 'branchId required' });
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  const filter = { branchId };
  if (from || to) filter.createdAt = {};
  if (from) filter.createdAt.$gte = from;
  if (to) filter.createdAt.$lte = to;
  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.subcategory) filter.subcategory = req.query.subcategory;
  const items = await Expense.find(filter).sort({ createdAt: -1 }).lean();
  const total = items.reduce((a, x) => a + (x.amount || 0), 0);
  res.json({ branchId, total, items });
};

// Admin/owner: summary across branches for a date range
exports.expensesSummaryByBranch = async (req, res) => {
  const role = req.user?.role;
  if (!(role === 'admin' || role === 'owner')) return res.status(403).json({ message: 'Forbidden' });
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  const match = {};
  if (from || to) match.createdAt = {};
  if (from) match.createdAt.$gte = from;
  if (to) match.createdAt.$lte = to;
  const agg = await Expense.aggregate([
    { $match: match },
    { $group: { _id: '$branchId', total: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }
  ]);
  const totals = Object.fromEntries(agg.map(r => [r._id, r.total]));
  const totalAll = agg.reduce((a, x) => a + (x.total || 0), 0);
  res.json({ totals, totalAll });
};

exports.expensesSummary = async (req, res) => {
  const branchId = req.query.branchId;
  if (!branchId) return res.status(400).json({ message: 'branchId required' });
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  const match = { branchId };
  if (from || to) match.createdAt = {};
  if (from) match.createdAt.$gte = from;
  if (to) match.createdAt.$lte = to;

  const agg = await Expense.aggregate([
    { $match: match },
    { $group: { _id: { userId: '$createdBy', name: '$createdByName', email: '$createdByEmail' }, total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);
  const total = agg.reduce((a, x) => a + (x.total || 0), 0);
  const byUser = agg.map(r => ({ userId: r._id.userId, name: r._id.name, email: r._id.email, total: r.total }));
  res.json({ branchId, total, byUser });
};

// Range analytics: per-day and overall KPIs for orders/sales/discount/expenses/net/margin
// GET /api/reports/range-analytics?branchId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
exports.rangeAnalytics = async (req, res) => {
  try {
    const branchId = req.query.branchId;
    const fromStr = req.query.from; // YYYY-MM-DD
    const toStr = req.query.to; // YYYY-MM-DD
    if (!branchId) return res.status(400).json({ message: 'branchId required' });
    if (!fromStr || !toStr) return res.status(400).json({ message: 'from and to required (YYYY-MM-DD)' });

    const from = new Date(fromStr + 'T00:00:00.000Z');
    const toEnd = new Date(toStr + 'T23:59:59.999Z');

    const [sales, expenses] = await Promise.all([
      Sale.find({ branchId, createdAt: { $gte: from, $lte: toEnd } }).lean(),
      Expense.find({ branchId, createdAt: { $gte: from, $lte: toEnd } }).lean(),
    ]);

    // Preload product map for margin calc (uses retailPrice as cost baseline if present)
    const productIds = new Set();
    sales.forEach(s => (s.items || []).forEach(it => productIds.add(String(it.productId))));
    const prods = await Product.find({ _id: { $in: Array.from(productIds) } }).select('retailPrice').lean();
    const pmap = new Map(prods.map(p => [String(p._id), p]));

    const toKey = (d) => new Date(d).toISOString().slice(0, 10);
    const days = new Map();
    const ensure = (k) => {
      if (!days.has(k)) days.set(k, { date: k, orders: 0, sales: 0, discount: 0, expenses: 0, net: 0, productProfit: 0 });
      return days.get(k);
    };
    // Pre-seed days between from..to so we always return day buckets
    const cursor = new Date(from);
    const endCursor = new Date(toEnd);
    cursor.setHours(0,0,0,0);
    endCursor.setHours(0,0,0,0);
    while (cursor <= endCursor) {
      ensure(toKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const s of sales) {
      const k = toKey(s.createdAt);
      const d = ensure(k);
      d.orders += 1;
      d.discount += Number(s.totals?.discount || 0);
      for (const it of (s.items || [])) {
        const qty = Number(it.qty || 0);
        const up = Number(it.unitPrice || 0);
        d.sales += up * qty;
        const cost = Number(pmap.get(String(it.productId))?.retailPrice ?? 0);
        if (!Number.isNaN(cost) && cost > 0) d.productProfit += (up - cost) * qty;
      }
    }

    for (const e of expenses) {
      const k = toKey(e.createdAt);
      const d = ensure(k);
      d.expenses += Number(e.amount || 0);
    }

    const dayArray = Array.from(days.values())
      .map(d => ({ ...d, net: (d.sales - d.discount) - d.expenses }))
      .sort((a,b) => a.date.localeCompare(b.date));

    const overall = dayArray.reduce((acc, d) => ({
      orders: acc.orders + d.orders,
      sales: acc.sales + d.sales,
      discount: acc.discount + d.discount,
      expenses: acc.expenses + d.expenses,
      net: acc.net + d.net,
      productProfit: acc.productProfit + d.productProfit,
    }), { orders:0, sales:0, discount:0, expenses:0, net:0, productProfit:0 });

    res.json({ branchId, from: fromStr, to: toStr, overall, days: dayArray });
  } catch (err) {
    console.error('rangeAnalytics error', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
