const Order   = require("../models/Order");
const Product = require("../models/Product");
const Cart    = require("../models/Cart");

const SHIPPING_THRESHOLD = 499;
const SHIPPING_CHARGE    = 49;

exports.placeOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod = "COD", notes = "" } = req.body;
  const productIds = items.map(i => i.product);
  const products   = await Product.find({ _id: { $in: productIds }, isActive: true });
  if (products.length !== productIds.length)
    return res.status(400).json({ success: false, message: "One or more products unavailable" });

  let itemsTotal = 0;
  const orderItems = [];
  for (const item of items) {
    const product = products.find(p => p._id.toString() === item.product);
    if (product.stock < item.qty)
      return res.status(400).json({ success: false, message: `Insufficient stock for "${product.title}". Available: ${product.stock}` });
    itemsTotal += product.price * item.qty;
    orderItems.push({ product: product._id, title: product.title, image: product.images[0]?.url || "", price: product.price, qty: item.qty });
  }

  const shippingCharge = itemsTotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
  const totalAmount    = itemsTotal + shippingCharge;

  await Promise.all(items.map(item => Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } })));
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

  const order = await Order.create({ user: req.user._id, items: orderItems, shippingAddress, paymentMethod, itemsTotal, shippingCharge, totalAmount, notes });
  res.status(201).json({ success: true, message: "Order placed successfully", order });
};

exports.getMyOrders = async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const filter = { user: req.user._id };
  if (status) filter.orderStatus = status;
  const p = parseInt(page), l = parseInt(limit);
  const [orders, total] = await Promise.all([Order.find(filter).sort("-createdAt").skip((p-1)*l).limit(l), Order.countDocuments(filter)]);
  res.json({ success: true, orders, total, pages: Math.ceil(total/l), currentPage: p });
};

exports.getOrder = async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user","name email");
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin")
    return res.status(403).json({ success: false, message: "Access denied" });
  res.json({ success: true, order });
};

exports.cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Access denied" });
  if (!["placed","confirmed"].includes(order.orderStatus))
    return res.status(400).json({ success: false, message: `Cannot cancel order with status: ${order.orderStatus}` });
  await Promise.all(order.items.map(item => Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } })));
  order.orderStatus = "cancelled";
  await order.save();
  res.json({ success: true, message: "Order cancelled", order });
};
