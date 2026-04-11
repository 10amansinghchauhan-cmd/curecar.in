const router = require("express").Router();
const { placeOrder, getMyOrders, getOrder, cancelOrder } = require("../controllers/orderController");
const { protect } = require("../middleware/auth");
const { validateOrder } = require("../middleware/validate");

router.use(protect);
router.post("/",           validateOrder, placeOrder);
router.get("/my",          getMyOrders);
router.get("/:id",         getOrder);
router.put("/:id/cancel",  cancelOrder);

module.exports = router;
