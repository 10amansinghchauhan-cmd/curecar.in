const User    = require("../models/User");
const Product = require("../models/Product");
const Order   = require("../models/Order");
const { cloudinary } = require("../config/cloudinary");

// ── Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  const [totalUsers, totalProducts, totalOrders, revenueData, ordersByStatus, recentOrders, lowStockProducts] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Product.countDocuments({ isActive: true }),
    Order.countDocuments(),
    Order.aggregate([{ $match: { orderStatus: { $ne: "cancelled" }, paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
    Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
    Order.find().sort("-createdAt").limit(5).populate("user","name email"),
    Product.find({ isActive: true, stock: { $lt: 20 } }).sort("stock").limit(5),
  ]);

  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyRevenue = await Order.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo }, orderStatus: { $ne: "cancelled" } } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  res.json({ success: true, stats: { totalUsers, totalProducts, totalOrders, revenue: revenueData[0]?.total || 0 }, ordersByStatus, recentOrders, lowStockProducts, monthlyRevenue });
};

// ── Users
exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  const filter = {};
  if (role)   filter.role = role;
  if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }, { phone: { $regex: search, $options: "i" } }];
  const p = parseInt(page), l = parseInt(limit);
  const [users, total] = await Promise.all([User.find(filter).sort("-createdAt").skip((p-1)*l).limit(l), User.countDocuments(filter)]);
  res.json({ success: true, users, total, pages: Math.ceil(total/l), currentPage: p });
};

exports.updateUser = async (req, res) => {
  const { role, isActive } = req.body;
  if (req.params.id === req.user._id.toString()) return res.status(400).json({ success: false, message: "Cannot modify your own account" });
  const user = await User.findByIdAndUpdate(req.params.id, { ...(role && { role }), ...(isActive !== undefined && { isActive }) }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, message: "User updated", user });
};

// ── Products
exports.getAllProducts = async (req, res) => {
  const { page = 1, limit = 20, search, category } = req.query;
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (search)   filter.$text = { $search: search };
  const p = parseInt(page), l = parseInt(limit);
  const [products, total] = await Promise.all([Product.find(filter).sort("-createdAt").skip((p-1)*l).limit(l), Product.countDocuments(filter)]);
  res.json({ success: true, products, total, pages: Math.ceil(total/l), currentPage: p });
};

exports.createProduct = async (req, res) => {
  const { title, description, price, originalPrice, category, tag, brand, stock, isFeatured, imageUrl } = req.body;

  let images = [];
  // If file uploaded via multer-cloudinary
  if (req.file) {
    images = [{ url: req.file.path, public_id: req.file.filename, alt: title }];
  } else if (imageUrl) {
    images = [{ url: imageUrl, alt: title }];
  }

  if (!images.length) return res.status(400).json({ success: false, message: "At least one product image is required." });

  const product = await Product.create({ title, description, price: Number(price), originalPrice: Number(originalPrice), category, tag: tag||"", brand: brand||"", stock: Number(stock)||100, isFeatured: isFeatured==="true"||isFeatured===true, images });
  res.status(201).json({ success: true, message: "Product created", product });
};

exports.updateProduct = async (req, res) => {
  const { title, description, price, originalPrice, category, tag, brand, stock, isFeatured, imageUrl } = req.body;
  const existing = await Product.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: "Product not found" });

  const updates = { title, description, price: Number(price), originalPrice: Number(originalPrice), category, tag: tag||"", brand: brand||"", stock: Number(stock), isFeatured: isFeatured==="true"||isFeatured===true };

  // New image uploaded
  if (req.file) {
    // Delete old Cloudinary image if exists
    const oldPid = existing.images?.[0]?.public_id;
    if (oldPid) await cloudinary.uploader.destroy(oldPid).catch(() => {});
    updates.images = [{ url: req.file.path, public_id: req.file.filename, alt: title }];
  } else if (imageUrl && imageUrl !== existing.images?.[0]?.url) {
    updates.images = [{ url: imageUrl, alt: title }];
  }

  const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  res.json({ success: true, message: "Product updated", product });
};

exports.deleteProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  res.json({ success: true, message: "Product deleted" });
};

// ── Orders
exports.getAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = status ? { orderStatus: status } : {};
  const p = parseInt(page), l = parseInt(limit);
  const [orders, total, rev] = await Promise.all([
    Order.find(filter).populate("user","name email phone").sort("-createdAt").skip((p-1)*l).limit(l),
    Order.countDocuments(filter),
    Order.aggregate([{ $match: { orderStatus: { $ne: "cancelled" } } }, { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }]),
  ]);
  res.json({ success: true, orders, total, pages: Math.ceil(total/l), currentPage: p, revenue: rev[0] || { total: 0, count: 0 } });
};

exports.updateOrderStatus = async (req, res) => {
  const { orderStatus, paymentStatus, trackingId } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  if (orderStatus) order.orderStatus = orderStatus;
  if (paymentStatus) order.paymentStatus = paymentStatus;
  if (trackingId !== undefined) order.trackingId = trackingId;
  if (orderStatus === "delivered") order.deliveredAt = new Date();
  await order.save();
  res.json({ success: true, message: "Order updated", order });
};

// ── Upload image (standalone endpoint)
exports.uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No image file provided" });
  res.json({ success: true, url: req.file.path, public_id: req.file.filename });
};
