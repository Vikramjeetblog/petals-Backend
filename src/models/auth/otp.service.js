
const otpStore = new Map();

/**
 * Save OTP
 */
exports.saveOtp = async (phone, otp) => {
  otpStore.set(phone, {
    otp,
    expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes
  });
};
