// One-off script: backfill missing Stock rows for all branch × product pairs
// Usage: node scripts/backfillStock.js

const mongoose = require('mongoose');

const db = require('../src/config/db');
const Branch = require('../src/models/Branch');
const Product = require('../src/models/Product');
const Stock = require('../src/models/Stock');

async function main() {
  try {
    await db();

    const branches = await Branch.find().lean();
    const products = await Product.find().select('_id').lean();

    if (!branches.length || !products.length) {
      console.log('No branches or products found. Nothing to backfill.');
      await mongoose.connection.close();
      return;
    }

    let created = 0;
    for (const b of branches) {
      for (const p of products) {
        const exists = await Stock.exists({ branchId: b.code, productId: p._id });
        if (!exists) {
          await Stock.create({ branchId: b.code, productId: p._id, onHand: 0 });
          created++;
        }
      }
    }

    console.log(`Backfill complete. Created ${created} missing stock rows.`);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

main();

