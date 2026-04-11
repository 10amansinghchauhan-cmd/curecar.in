const router = require("express").Router();
const { getProducts, getProduct, addReview, getCategorySummary } = require("../controllers/productController");
const { protect } = require("../middleware/auth");
const { validateReview } = require("../middleware/validate");

router.get("/",                    getProducts);
router.get("/categories/summary",  getCategorySummary);
router.get("/:id",                 getProduct);
router.post("/:id/reviews", protect, validateReview, addReview);

module.exports = router;
