const Joi = require("joi");
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: false });
  if (error) return res.status(400).json({ success: false, message: error.details.map(d => d.message.replace(/"/g,"'")).join(", ") });
  next();
};

exports.validateSendOTP = validate(Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({ "string.pattern.base": "Invalid Indian mobile number (10 digits, starting with 6-9)" }),
}));

exports.validateRegister = validate(Joi.object({
  name:     Joi.string().min(2).max(50).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).max(64).required(),
}));

exports.validateLogin = validate(Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
}));

exports.validateVerifyOTP = validate(Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  otp:   Joi.string().length(6).required(),
}));

exports.validateProduct = validate(Joi.object({
  title:         Joi.string().max(200).required(),
  description:   Joi.string().max(2000).required(),
  price:         Joi.number().min(0).required(),
  originalPrice: Joi.number().min(0).required(),
  category:      Joi.string().valid("electronics","fashion","gaming","home","books","sports","beauty").required(),
  tag:           Joi.string().max(30).allow("").optional(),
  brand:         Joi.string().max(50).allow("").optional(),
  stock:         Joi.number().min(0).default(100),
  isFeatured:    Joi.boolean().default(false),
  imageUrl:      Joi.string().uri().optional().allow(""),
}));

exports.validateReview = validate(Joi.object({
  rating:  Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(5).max(500).required(),
}));

exports.validateOrder = validate(Joi.object({
  items: Joi.array().items(Joi.object({ product: Joi.string().required(), qty: Joi.number().min(1).required() })).min(1).required(),
  shippingAddress: Joi.object({
    name: Joi.string().required(), street: Joi.string().required(),
    city: Joi.string().required(),  state: Joi.string().required(),
    pincode: Joi.string().length(6).pattern(/^\d+$/).required(),
    phone: Joi.string().min(10).max(13).required(),
  }).required(),
  paymentMethod: Joi.string().valid("COD","RAZORPAY").default("COD"),
  notes: Joi.string().max(300).allow("").optional(),
}));

exports.validateCartItem = validate(Joi.object({
  productId: Joi.string().required(),
  qty: Joi.number().min(1).default(1),
}));
