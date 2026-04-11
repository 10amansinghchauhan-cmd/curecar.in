const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Drop the old phone unique index if it exists (one-time migration)
    // This fixes "phone already exists" errors after removing phone uniqueness
    try {
      await conn.connection.collection("users").dropIndex("phone_1");
      console.log("✅ Dropped old phone unique index");
    } catch (e) {
      // Index doesn't exist — that's fine, no action needed
    }
  } catch (err) {
    console.error(`❌ MongoDB Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
