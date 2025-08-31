// Seed "Tokyo Flavors" nic salt products with 30ml unit size
// and create 3 mg variants (30 mg, 50 mg, 60 mg),
// initializing stock to 10 bottles per branch for each product.
// Usage: node scripts/seedTokyoFlavors.js

const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB(){
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (uri) {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    return;
  }
  try {
    const dbModule = require('../src/config/db');
    if (typeof dbModule === 'function') { await dbModule(); return; }
    if (dbModule && typeof dbModule.connect === 'function') { await dbModule.connect(); return; }
  } catch {}
  throw new Error('No Mongo URI found and could not load src/config/db');
}

const Branch = require('../src/models/Branch');
const Product = require('../src/models/Product');
const Stock = require('../src/models/Stock');

const FLAVORS = [
  'Mango', 'Strawberry', 'Mint', 'Blueberry', 'Grape',
  'Watermelon', 'Lemon', 'Lychee', 'Peach', 'Tobacco'
];
const MGS = ['30 mg', '50 mg', '60 mg'];

async function ensureProduct({ sku, name, brand, category, unit, unitSize, price=0, retailPrice=null }) {
  let p = await Product.findOne({ sku });
  if (!p) {
    p = await Product.create({ sku, name, brand, category, unit, unitSize, price, retailPrice });
  }
  return p;
}

async function main() {
  await connectDB();
  const branches = await Branch.find().lean();
  if (!branches.length) {
    console.log('No branches found. Aborting.');
    await mongoose.connection.close();
    return;
  }

  const unit = 'ml';
  const unitSize = 30; // 30ml bottle
  const bottles = 10;
  const initialUnits = bottles * unitSize; // stock tracked in base units

  let created = 0;
  for (const flavor of FLAVORS) {
    for (const mg of MGS) {
      const sku = `TOKYO-${flavor.toUpperCase().replace(/[^A-Z0-9]+/g,'-')}-${mg.replace(/\s+/g,'')}`;
      const name = `${flavor} Nic Salt ${mg}`;
      const brand = 'Tokyo Flavors';
      const category = mg; // store mg in category

      const p = await ensureProduct({ sku, name, brand, category, unit, unitSize, price: 3000, retailPrice: null });

      // Set stock for each branch to 10 bottles (in units)
      for (const b of branches) {
        const s = await Stock.findOne({ branchId: b.code, productId: p._id });
        if (!s) {
          await Stock.create({ branchId: b.code, productId: p._id, onHand: initialUnits });
        } else {
          // If exists and onHand is lower than desired, set to desired; else keep existing
          if ((s.onHand || 0) < initialUnits) {
            s.onHand = initialUnits;
            await s.save();
          }
        }
      }
      created++;
    }
  }

  console.log(`Seed complete. Processed ${created} products (${FLAVORS.length} flavors × ${MGS.length} mg).`);
  await mongoose.connection.close();
}

main().catch(e=>{ console.error(e); process.exit(1); });
