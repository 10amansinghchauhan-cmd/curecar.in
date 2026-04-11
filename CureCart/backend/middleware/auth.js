const jwt  = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer "))
    token = req.headers.authorization.split(" ")[1];

  if (!token)
    return res.status(401).json({ success: false, message: "Not authorized. Please login." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password -otp");
    if (!req.user || !req.user.isActive)
      return res.status(401).json({ success: false, message: "User not found or deactivated." });
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError" ? "Session expired. Please login again." : "Invalid token.";
    return res.status(401).json({ success: false, message: msg });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: `Access denied. Required: ${roles.join(" or ")}` });
  next();
};
