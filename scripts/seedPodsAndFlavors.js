// Seed catalog: Pod devices (OXVA, ARGUS, VOOPOO, VAPORESSO)
// and Tokyo Nic Salt flavors.
//
// Usage:
//   node scripts/seedPodsAndFlavors.js           # seeds both pods + flavors
//   node scripts/seedPodsAndFlavors.js pods      # seeds pods only
//   node scripts/seedPodsAndFlavors.js flavors   # seeds flavors only

require('dotenv').config();
const mongoose = require('mongoose');

async function connectDB(){
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI missing');
  await mongoose.connect(uri);
  console.log('Mongo connected');
}

const Branch = require('../src/models/Branch');
const Product = require('../src/models/Product');
const Stock = require('../src/models/Stock');

const POD_CATALOG = {
  OXVA: [
    { model: 'XLIM Pro', price: 9500 },
    { model: 'XLIM SE', price: 8500 },
    { model: 'XLIM C', price: 8200 },
  ],
  ARGUS: [
    { model: 'Argus P1', price: 9000 },
    { model: 'Argus Z', price: 7800 },
    { model: 'Argus Pod', price: 8200 },
  ],
  VOOPOO: [
    { model: 'DRAG S', price: 10500 },
    { model: 'VINCI Pod', price: 8800 },
    { model: 'ARGUS Pod', price: 8200 },
  ],
  VAPORESSO: [
    { model: 'XROS 3', price: 9200 },
    { model: 'XROS 3 Mini', price: 8800 },
    { model: 'Luxe Q', price: 8700 },
  ],
};

const TOKYO_FLAVORS = [
  'Mango', 'Strawberry', 'Mint', 'Blueberry', 'Grape',
  'Watermelon', 'Lemon', 'Lychee', 'Peach', 'Tobacco'
];
const TOKYO_MGS = ['30 mg', '50 mg', '60 mg'];

function skuize(str){
  return String(str).trim().toUpperCase().replace(/[^A-Z0-9]+/g,'-');
}

async function ensureProduct(doc){
  const found = await Product.findOne({ sku: doc.sku });
  if (found) return found;
  return Product.create(doc);
}

async function ensureStockForAllBranches(productId, initialOnHand){
  const branches = await Branch.find().lean();
  for (const b of branches){
    const existing = await Stock.findOne({ branchId: b.code, productId });
    if (!existing){
      await Stock.create({ branchId: b.code, productId, onHand: initialOnHand });
    }
  }
}

async function seedPods(){
  const unit = 'pcs';
  const unitSize = 1;
  const initialQtyPerBranch = 5; // 5 devices per branch (onHand tracked in units)
  let created = 0;
  for (const [brand, items] of Object.entries(POD_CATALOG)){
    for (const it of items){
      const sku = `${skuize(brand)}-${skuize(it.model)}`;
      const name = `${brand} ${it.model}`;
      const doc = { sku, name, brand, category: 'Pods', unit, unitSize, price: Number(it.price)||0, retailPrice: null };
      const p = await ensureProduct(doc);
      await ensureStockForAllBranches(p._id, initialQtyPerBranch);
      created++;
    }
  }
  console.log(`Pods seeded: ${created} products across ${Object.keys(POD_CATALOG).length} brands.`);
}

async function seedTokyoFlavors(){
  const unit = 'ml';
  const unitSize = 30;     // 30ml bottle
  const bottles = 10;      // 10 bottles per branch
  const initialOnHand = bottles * unitSize; // stock counted in base units
  let created = 0;
  for (const flavor of TOKYO_FLAVORS){
    for (const mg of TOKYO_MGS){
      const sku = `TOKYO-${skuize(flavor)}-${skuize(mg)}`;
      const name = `${flavor} Nic Salt ${mg}`;
      const brand = 'Tokyo Flavors';
      const category = mg; // store mg in category
      const p = await ensureProduct({ sku, name, brand, category, unit, unitSize, price: 3000, retailPrice: null });
      await ensureStockForAllBranches(p._id, initialOnHand);
      created++;
    }
  }
  console.log(`Tokyo flavors seeded: ${created} products (${TOKYO_FLAVORS.length} flavors × ${TOKYO_MGS.length} strengths).`);
}

async function main(){
  await connectDB();
  const arg = (process.argv[2]||'both').toLowerCase();
  if (arg === 'pods') await seedPods();
  else if (arg === 'flavors') await seedTokyoFlavors();
  else { await seedPods(); await seedTokyoFlavors(); }
  await mongoose.connection.close();
}

main().catch(e=>{ console.error(e); process.exit(1); });

