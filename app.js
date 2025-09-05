require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { connect } = require('./src/config/db');
const authRoutes = require('./routes/user'); // from your cloned repo (keep it)
const productRoutes = require('./src/routes/products');
const stockRoutes = require('./src/routes/stock');
const salesRoutes = require('./src/routes/sales');
const returnsRoutes = require('./src/routes/returns');
const reportsRoutes = require('./src/routes/reports');
const branchRoutes = require('./src/routes/branches');

const app = express();
app.use(helmet());
// Allow multiple origins via comma-separated env (e.g., local + Vercel)
const allowedOrigins = [
  'http://localhost:5173',
  'https://project-frontend-repo-two.vercel.app'
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // non-browser or same-origin
    // Wildcard support via CORS_ORIGIN="*"
    if (allowedOrigins.includes('*')) return callback(null, true);
    // Exact match
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Match by hostname (ignore port/protocol) for dev convenience
    try {
      const o = new URL(origin);
      if (allowedOrigins.some((a) => {
        try { const u = new URL(a); return u.hostname === o.hostname; } catch { return false; }
      })) return callback(null, true);
    } catch {}
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.options('*', cors());

app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Auth (from the repo you cloned)
app.use('/auth', authRoutes);

// Inventory/Billing APIs
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/branches', branchRoutes);

// 404 handler for unmatched routes
app.use((_req, res, _next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Global error handler with normalized shape
app.use((err, _req, res, _next) => {
  console.error(err);
  // Joi validation
  if (err.isJoi) {
    return res.status(400).json({ message: err.message, code: 'VALIDATION_ERROR' });
  }
  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id', code: 'INVALID_ID' });
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Server error', code: err.code || 'SERVER_ERROR' });
});

const port = process.env.PORT || 3000;
connect(process.env.MONGO_URI).then(() => {
  app.listen(port, () => console.log('API listening on http://localhost:' + port));
});
