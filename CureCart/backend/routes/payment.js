const router = require("express").Router();
const { createRazorpayOrder, verifyPayment, getKey } = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

router.get("/key",           protect, getKey);
router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify",       protect, verifyPayment);

module.exports = router;
