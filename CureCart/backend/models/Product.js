const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name:    { type: String, required: true },
  rating:  { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 500 },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  title:         { type: String, required: [true,"Title required"], trim: true, maxlength: 200 },
  description:   { type: String, required: [true,"Description required"], maxlength: 2000 },
  price:         { type: Number, required: [true,"Price required"], min: 0 },
  originalPrice: { type: Number, required: [true,"Original price required"], min: 0 },
  discount:      { type: Number, default: 0, min: 0, max: 100 },
  category:      { type: String, required: [true,"Category required"], enum: ["electronics","fashion","gaming","home","books","sports","beauty"], lowercase: true },
  tag:           { type: String, default: "", maxlength: 30 },
  brand:         { type: String, default: "", trim: true },
  images: [{
    url:       { type: String, required: true },
    public_id: { type: String, default: "" },
    alt:       { type: String, default: "" },
  }],
  stock:       { type: Number, default: 100, min: 0 },
  rating:      { type: Number, default: 0, min: 0, max: 5 },
  numReviews:  { type: Number, default: 0 },
  reviews:     [reviewSchema],
  isFeatured:  { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
  specifications: { type: Map, of: String, default: {} },
}, { timestamps: true });

productSchema.pre("save", function(next) {
  if (this.originalPrice > 0 && this.price <= this.originalPrice)
    this.discount = Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  next();
});

productSchema.methods.calcRating = function() {
  if (!this.reviews.length) { this.rating = 0; this.numReviews = 0; return; }
  const sum = this.reviews.reduce((a, r) => a + r.rating, 0);
  this.rating = Math.round((sum / this.reviews.length) * 10) / 10;
  this.numReviews = this.reviews.length;
};

productSchema.index({ title: "text", description: "text", brand: "text" });
productSchema.index({ category: 1, price: 1, rating: -1 });

module.exports = mongoose.model("Product", productSchema);
