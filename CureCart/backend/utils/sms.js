const axios = require("axios");

/**
 * Send OTP via Fast2SMS
 * Docs: https://docs.fast2sms.com
 */
const sendOTP = async (phone, otp) => {
  if (!process.env.FAST2SMS_API_KEY) {
    // Dev fallback — just log the OTP
    console.log(`\n📱 [DEV MODE] OTP for ${phone}: ${otp}\n`);
    return { success: true, dev: true };
  }

  try {
    const res = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        variables_values: otp,
        route: "otp",
        numbers: phone,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 8000,
      }
    );
    return { success: true, data: res.data };
  } catch (err) {
    console.error("Fast2SMS Error:", err.response?.data || err.message);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

module.exports = { sendOTP };
