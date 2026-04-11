const mongoose = require("mongoose");
const cartSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    qty:     { type: Number, required: true, min: 1, default: 1 },
    price:   { type: Number, required: true },
  }],
}, { timestamps: true });
cartSchema.virtual("total").get(function() { return this.items.reduce((s,i) => s + i.price * i.qty, 0); });
cartSchema.virtual("itemCount").get(function() { return this.items.reduce((s,i) => s + i.qty, 0); });
cartSchema.set("toJSON", { virtuals: true });
cartSchema.set("toObject", { virtuals: true });
module.exports = mongoose.model("Cart", cartSchema);
