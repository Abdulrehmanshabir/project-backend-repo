const mongoose = require("mongoose");

const connectDB = async (url) => {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(url, {});
    console.log("Database connected successfully!");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;