const router = require("express").Router();
const { register, login, getMe, updateProfile, changePassword,
        sendOTPForRegistration, sendOTPForLogin, loginWithOTP } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// ── Public ──────────────────────────────────────────────────────────────────
router.post("/register", register);   // name + email + password
router.post("/login",    login);      // email + password

// Legacy OTP routes (return 410 Gone — kept so old clients get a clear error)
router.post("/send-otp",         sendOTPForRegistration);
router.post("/login/send-otp",   sendOTPForLogin);
router.post("/login/verify-otp", loginWithOTP);

// ── Protected ────────────────────────────────────────────────────────────────
router.get("/me",              protect, getMe);
router.put("/me",              protect, updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;
