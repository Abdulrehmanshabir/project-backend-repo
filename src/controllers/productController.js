const Joi = require('joi');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const Branch = require('../models/Branch');

const productSchema = Joi.object({
  sku: Joi.string().trim().required(),
  name: Joi.string().trim().required(),
  brand: Joi.string().allow(''),
  category: Joi.string().allow(''),
  unit: Joi.string().valid('pcs','ml').default('pcs'),
  unitSize: Joi.number().min(1).default(1),
  price: Joi.number().min(0).default(0),
  retailPrice: Joi.number().min(0).allow(null)
});

exports.list = async (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const filter = q
    ? { $or: [{ sku: new RegExp(q, 'i') }, { name: new RegExp(q, 'i') }] }
    : {};
  const items = await Product.find(filter).sort({ createdAt: -1 }).lean();
  res.json(items);
};

exports.create = async (req, res) => {
  const data = await productSchema.validateAsync(req.body);
  const p = await Product.create(data);

  // initialize stock rows for all branches with onHand derived from unitSize
  const branches = await Branch.find().lean();
  const initial = Number(p.unitSize) || 0;
  await Stock.create(
    branches.map(b => ({ branchId: b.code, productId: p._id, onHand: initial }))
  );

  res.status(201).json(p);
};

exports.update = async (req, res) => {
  // Coerce incoming values defensively so PATCH from various clients doesn't fail validation
  const raw = { ...req.body };
  if (raw.unitSize !== undefined) raw.unitSize = Number(raw.unitSize);
  if (raw.price !== undefined) raw.price = Number(raw.price);
  if (raw.retailPrice === '') raw.retailPrice = null;
  if (raw.retailPrice !== undefined && raw.retailPrice !== null) raw.retailPrice = Number(raw.retailPrice);

  const patch = await productSchema
    .fork(['sku','name'], (s)=>s.optional())
    .validateAsync(raw);
  const p = await Product.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
  if (!p) return res.status(404).json({ message: 'Not found' });
  res.json(p);
};

exports.remove = async (req, res) => {
  const p = await Product.findByIdAndDelete(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  await Stock.deleteMany({ productId: p._id });
  res.json({ ok: true });
};
