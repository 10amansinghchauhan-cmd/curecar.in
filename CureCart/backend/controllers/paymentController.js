const Razorpay = require("razorpay");
const crypto   = require("crypto");
const Order    = require("../models/Order");

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    throw new Error("Razorpay keys not configured in .env");
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
};

exports.createRazorpayOrder = async (req, res) => {
  const { amount, currency = "INR", orderId } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ success: false, message: "Valid amount required" });
  const rzpOrder = await getRazorpay().orders.create({
    amount: Math.round(amount * 100), currency,
    receipt: `cc_${orderId || Date.now()}`,
    notes: { user_id: req.user._id.toString(), user_email: req.user.email },
  });
  res.json({ success: true, razorpayOrderId: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency, keyId: process.env.RAZORPAY_KEY_ID });
};

exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return res.status(400).json({ success: false, message: "Missing payment fields" });
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
  if (expected !== razorpay_signature)
    return res.status(400).json({ success: false, message: "Payment verification failed." });
  if (orderId) await Order.findByIdAndUpdate(orderId, { paymentStatus: "paid", paymentId: razorpay_payment_id, razorpayOrderId: razorpay_order_id, orderStatus: "confirmed" });
  res.json({ success: true, message: "Payment verified", paymentId: razorpay_payment_id });
};

exports.getKey = async (req, res) => res.json({ success: true, keyId: process.env.RAZORPAY_KEY_ID || "" });
