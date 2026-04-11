const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    title: String, image: String, price: Number, qty: Number,
  }],
  shippingAddress: {
    name: { type: String, required: true }, street: { type: String, required: true },
    city: { type: String, required: true },  state: { type: String, required: true },
    pincode: { type: String, required: true }, phone: { type: String, required: true },
  },
  paymentMethod:  { type: String, enum: ["COD","RAZORPAY"], default: "COD" },
  paymentStatus:  { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentId:      { type: String, default: "" },
  razorpayOrderId:{ type: String, default: "" },
  orderStatus:    { type: String, enum: ["placed","confirmed","shipped","out_for_delivery","delivered","cancelled"], default: "placed" },
  itemsTotal:     { type: Number, required: true },
  shippingCharge: { type: Number, default: 0 },
  totalAmount:    { type: Number, required: true },
  trackingId:     { type: String, default: "" },
  deliveredAt:    { type: Date },
  notes:          { type: String, default: "" },
}, { timestamps: true });
orderSchema.virtual("orderId").get(function() { return `CC-${this._id.toString().slice(-8).toUpperCase()}`; });
orderSchema.set("toJSON",   { virtuals: true });
orderSchema.set("toObject", { virtuals: true });
module.exports = mongoose.model("Order", orderSchema);
