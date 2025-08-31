// Convert manager 'branches' from arrays to single string (first element)
// Usage: node scripts/migrateBranchesToString.js

const mongoose = require('mongoose');
const db = require('../src/config/db');

let User;
try { User = require('../src/models/User'); } catch { User = require('../models/User'); }

async function main(){
  await db();
  const users = await User.find({ role: { $ne: 'admin' } }).select('branches role').lean();
  let updates = 0;
  for (const u of users) {
    if (Array.isArray(u.branches)) {
      const next = u.branches[0] ? String(u.branches[0]) : '';
      await User.updateOne({ _id: u._id }, { $set: { branches: next } });
      updates++;
    }
  }
  console.log(`Updated ${updates} users to string branches.`);
  await mongoose.connection.close();
}

main().catch(e=>{ console.error(e); process.exit(1); });

