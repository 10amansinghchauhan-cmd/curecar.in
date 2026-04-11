const router = require("express").Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require("../controllers/cartController");
const { protect } = require("../middleware/auth");
const { validateCartItem } = require("../middleware/validate");

router.use(protect);
router.get("/",              getCart);
router.post("/",             validateCartItem, addToCart);
router.put("/:productId",    updateCartItem);
router.delete("/clear",      clearCart);
router.delete("/:productId", removeFromCart);

module.exports = router;
