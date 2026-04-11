const Cart    = require("../models/Cart");
const Product = require("../models/Product");

const getPopulated = (userId) => Cart.findOne({ user: userId }).populate("items.product","title images price originalPrice discount stock isActive");

exports.getCart = async (req, res) => {
  const cart = await getPopulated(req.user._id);
  if (!cart) return res.json({ success: true, items: [], total: 0, itemCount: 0 });
  const activeItems = cart.items.filter(i => i.product?.isActive);
  if (activeItems.length !== cart.items.length) { cart.items = activeItems; await cart.save(); }
  res.json({ success: true, items: cart.items, total: cart.total, itemCount: cart.itemCount });
};

exports.addToCart = async (req, res) => {
  const { productId, qty = 1 } = req.body;
  const product = await Product.findById(productId);
  if (!product || !product.isActive) return res.status(404).json({ success: false, message: "Product not found" });
  if (product.stock < qty) return res.status(400).json({ success: false, message: `Only ${product.stock} item(s) in stock` });

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [{ product: productId, qty, price: product.price }] });
  } else {
    const idx = cart.items.findIndex(i => i.product.toString() === productId);
    if (idx > -1) {
      const newQty = cart.items[idx].qty + qty;
      if (newQty > product.stock) return res.status(400).json({ success: false, message: `Only ${product.stock} available` });
      cart.items[idx].qty   = newQty;
      cart.items[idx].price = product.price;
    } else {
      cart.items.push({ product: productId, qty, price: product.price });
    }
    await cart.save();
  }
  const populated = await getPopulated(req.user._id);
  res.json({ success: true, message: "Added to cart", items: populated.items, total: populated.total, itemCount: populated.itemCount });
};

exports.updateCartItem = async (req, res) => {
  const { qty } = req.body;
  if (!qty || qty < 1) return res.status(400).json({ success: false, message: "Qty must be ≥ 1" });
  const product = await Product.findById(req.params.productId);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  if (qty > product.stock) return res.status(400).json({ success: false, message: `Only ${product.stock} available` });
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });
  const item = cart.items.find(i => i.product.toString() === req.params.productId);
  if (!item) return res.status(404).json({ success: false, message: "Item not in cart" });
  item.qty = qty;
  await cart.save();
  const populated = await getPopulated(req.user._id);
  res.json({ success: true, items: populated.items, total: populated.total, itemCount: populated.itemCount });
};

exports.removeFromCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });
  cart.items = cart.items.filter(i => i.product.toString() !== req.params.productId);
  await cart.save();
  const populated = await getPopulated(req.user._id);
  res.json({ success: true, items: populated.items, total: populated.total, itemCount: populated.itemCount });
};

exports.clearCart = async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
  res.json({ success: true, items: [], total: 0, itemCount: 0 });
};
