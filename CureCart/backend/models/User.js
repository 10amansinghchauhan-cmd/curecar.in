const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  name:     { type: String, required: [true,"Name required"], trim: true, minlength: 2, maxlength: 50 },
  email:    { type: String, required: [true,"Email required"], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, "Invalid email"] },
  phone:    { type: String },   // completely optional, no unique constraint
  password: { type: String, required: [true,"Password required"], minlength: 6, select: false },
  role:     { type: String, enum: ["user","admin"], default: "user" },
  avatar:   { type: String, default: "" },
  isActive: { type: Boolean, default: true },
  address: {
    street: String, city: String, state: String,
    pincode: String, country: { type: String, default: "India" }
  },
  otp: { code: String, expiresAt: Date },
}, { timestamps: true });

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(pwd) { return bcrypt.compare(pwd, this.password); };
userSchema.methods.generateToken   = function() {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "7d" });
};
userSchema.methods.setOTP = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = { code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
  return code;
};
userSchema.methods.verifyOTP = function(code) {
  if (!this.otp?.code || !this.otp?.expiresAt) return false;
  if (new Date() > this.otp.expiresAt) return false;
  return this.otp.code === code;
};

module.exports = mongoose.model("User", userSchema);
