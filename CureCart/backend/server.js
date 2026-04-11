require("dotenv").config();
require("express-async-errors");

const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");

connectDB();
const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.set("trust proxy", 1); // Required for Render/Railway (behind reverse proxy)

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true
}));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use("/api/", rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use("/api/auth/send-otp",       rateLimit({ windowMs: 60*1000, max: 3 }));
app.use("/api/auth/login/send-otp", rateLimit({ windowMs: 60*1000, max: 3 }));
app.use("/api/auth/login",          rateLimit({ windowMs: 15*60*1000, max: 20 }));
app.use("/api/auth/register",       rateLimit({ windowMs: 15*60*1000, max: 10 }));

// ── Body Parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// ── Health Check (Render uses this to detect service is up) ───────────────────
app.get("/", (_, res) => res.json({ status: "ok", service: "CureCart API v3" }));
app.get("/api/health", (_, res) => res.json({
  success: true,
  message: "CureCart API v3 🚀",
  version: "3.0.0",
  env: process.env.NODE_ENV,
  services: {
    razorpay:  !!process.env.RAZORPAY_KEY_ID,
    cloudinary:!!process.env.CLOUDINARY_CLOUD_NAME,
    sms:       !!process.env.FAST2SMS_API_KEY,
  },
  timestamp: new Date().toISOString(),
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/cart",     require("./routes/cart"));
app.use("/api/orders",   require("./routes/orders"));
app.use("/api/payment",  require("./routes/payment"));
app.use("/api/admin",    require("./routes/admin"));

// ── Error Handlers ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 CureCart API → http://0.0.0.0:${PORT}`);
  console.log(`📱 SMS      : ${process.env.FAST2SMS_API_KEY  ? "✅ Fast2SMS"  : "⚠️  Dev mode (OTP in console)"}`);
  console.log(`🖼️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? "✅ Ready" : "⚠️  Not set"}`);
  console.log(`💳 Razorpay : ${process.env.RAZORPAY_KEY_ID   ? "✅ Ready"    : "⚠️  Not set"}\n`);
});

process.on("unhandledRejection", err => {
  console.error("❌ Unhandled:", err.message);
  server.close(() => process.exit(1));
});
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  server.close(() => process.exit(0));
});

module.exports = app;
