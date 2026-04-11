const User = require("../models/User");

const sendToken = (user, statusCode, res, message = "Success") => {
  const token = user.generateToken();
  res.status(statusCode).json({
    success: true, message, token,
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar, address: user.address },
  });
};

// Helper: turn MongoDB duplicate-key errors into readable messages
const handleMongoError = (err) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    if (field === "email") return "Email already registered. Please login.";
    return "An account with these details already exists.";
  }
  return err.message || "Something went wrong. Please try again.";
};

// ── POST /api/auth/register ── Register with name + email + password
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ success: false, message: "Name, email, and password (min 6 chars) required." });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ success: false, message: "Email already registered. Please login." });

    const user = new User({ name: name.trim(), email: email.toLowerCase().trim(), password });
    await user.save();
    sendToken(user, 201, res, "Account created successfully! Welcome to CureCart 🎉");
  } catch (err) {
    res.status(400).json({ success: false, message: handleMongoError(err) });
  }
};

// ── POST /api/auth/login ── Login with email + password
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    if (!user.isActive)
      return res.status(403).json({ success: false, message: "Account has been deactivated." });

    sendToken(user, 200, res, "Logged in successfully");
  } catch (err) {
    res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
};

// ── GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: { id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone, role: req.user.role, avatar: req.user.avatar, address: req.user.address, createdAt: req.user.createdAt } });
};

// ── PUT /api/auth/me
exports.updateProfile = async (req, res) => {
  try {
    const allowed = ["name", "avatar", "address", "phone"];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: false });
    res.json({ success: true, message: "Profile updated", user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: "Valid current and new password (6+ chars) required." });
    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(currentPassword)))
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    user.password = newPassword;
    await user.save();
    sendToken(user, 200, res, "Password changed successfully");
  } catch (err) {
    res.status(500).json({ success: false, message: "Password change failed." });
  }
};

// ── Legacy OTP stubs (return clear error if old clients hit these)
exports.sendOTPForRegistration = (req, res) => res.status(410).json({ success: false, message: "OTP registration no longer supported." });
exports.sendOTPForLogin        = (req, res) => res.status(410).json({ success: false, message: "OTP login no longer supported." });
exports.loginWithOTP           = (req, res) => res.status(410).json({ success: false, message: "OTP login no longer supported." });
