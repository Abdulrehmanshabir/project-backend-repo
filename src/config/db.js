const mongoose = require('mongoose');

async function connect(uri) {
  if (!uri) throw new Error('MONGO_URI missing');
  if (mongoose.connection.readyState === 1) return;
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('Mongo connected');
}

module.exports = { connect };
