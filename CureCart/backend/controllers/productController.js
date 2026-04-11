const Product   = require("../models/Product");
const { cloudinary } = require("../config/cloudinary");

exports.getProducts = async (req, res) => {
  const { search, category, minPrice, maxPrice, minRating, sort = "-createdAt", page = 1, limit = 20, featured } = req.query;
  const filter = { isActive: true };
  if (search)           filter.$text = { $search: search };
  if (category)         filter.category = category;
  if (featured === "true") filter.isFeatured = true;
  if (minPrice || maxPrice) { filter.price = {}; if (minPrice) filter.price.$gte = Number(minPrice); if (maxPrice) filter.price.$lte = Number(maxPrice); }
  if (minRating)        filter.rating = { $gte: Number(minRating) };

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((pageNum-1)*limitNum).limit(limitNum).lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ success: true, count: products.length, total, pages: Math.ceil(total/limitNum), currentPage: pageNum, products });
};

exports.getProduct = async (req, res) => {
  const product = await Product.findById(req.params.id).populate("reviews.user","name avatar");
  if (!product || !product.isActive) return res.status(404).json({ success: false, message: "Product not found" });
  res.json({ success: true, product });
};

exports.addReview = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  if (product.reviews.find(r => r.user.toString() === req.user._id.toString()))
    return res.status(400).json({ success: false, message: "You have already reviewed this product" });
  product.reviews.push({ user: req.user._id, name: req.user.name, rating: req.body.rating, comment: req.body.comment });
  product.calcRating();
  await product.save();
  res.status(201).json({ success: true, message: "Review added", rating: product.rating, numReviews: product.numReviews });
};

exports.getCategorySummary = async (req, res) => {
  const summary = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$category", count: { $sum: 1 }, avgPrice: { $avg: "$price" }, avgRating: { $avg: "$rating" } } },
    { $sort: { count: -1 } },
  ]);
  res.json({ success: true, categories: summary });
};
