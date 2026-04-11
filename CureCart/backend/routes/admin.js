const router = require("express").Router();
const { getDashboardStats, getAllUsers, updateUser, getAllProducts, createProduct, updateProduct, deleteProduct, getAllOrders, updateOrderStatus, uploadImage } = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");

router.use(protect, authorize("admin"));

router.get("/stats",                  getDashboardStats);
router.get("/users",                  getAllUsers);
router.put("/users/:id",              updateUser);
router.get("/products",               getAllProducts);
router.post("/products",              upload.single("image"), createProduct);
router.put("/products/:id",           upload.single("image"), updateProduct);
router.delete("/products/:id",        deleteProduct);
router.post("/upload",                upload.single("image"), uploadImage);
router.get("/orders",                 getAllOrders);
router.put("/orders/:id/status",      updateOrderStatus);

module.exports = router;
