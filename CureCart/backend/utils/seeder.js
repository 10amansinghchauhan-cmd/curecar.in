require("dotenv").config();
const connectDB = require("../config/db");
const User    = require("../models/User");
const Product = require("../models/Product");

const seed = async () => {
  await connectDB();
  await Product.deleteMany({});
  await User.deleteMany({ role: "admin" });

  // Admin user (no phone OTP needed for seeded admin)
  const admin = new User({ name: "CureCart Admin", email: "admin@curecart.com", password: "Admin@123", phone: "9999999999", role: "admin", isPhoneVerified: true });
  await admin.save();
  console.log(`👤 Admin: admin@curecart.com / Admin@123`);
  console.log(`✅ DB seeded. Add products via Admin Panel.`);
  process.exit(0);
};

seed().catch(err => { console.error("❌", err); process.exit(1); });
