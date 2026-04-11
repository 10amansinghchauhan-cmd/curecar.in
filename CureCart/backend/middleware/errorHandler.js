const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message || "Internal Server Error";

  if (err.name === "CastError")      { statusCode = 400; message = `Invalid ID: ${err.value}`; }
  if (err.code === 11000)            { statusCode = 409; const f = Object.keys(err.keyValue)[0]; message = `${f.charAt(0).toUpperCase()+f.slice(1)} already exists`; }
  if (err.name === "ValidationError"){ statusCode = 400; message = Object.values(err.errors).map(e => e.message).join(", "); }
  if (err.name === "JsonWebTokenError"){ statusCode = 401; message = "Invalid token"; }

  if (process.env.NODE_ENV === "development") console.error("❌", err);
  res.status(statusCode).json({ success: false, message, ...(process.env.NODE_ENV === "development" && { stack: err.stack }) });
};

const notFound = (req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });

module.exports = { errorHandler, notFound };
