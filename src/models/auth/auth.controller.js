const User = require('../user/user.model');
const jwt = require('jsonwebtoken');

/**
 * Send OTP Controller (DEV ONLY)
 */
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: 'Phone number is required'
      });
    }

    // ✅ DEV MODE: fixed OTP
    console.log(`DEV OTP for ${phone} is 1234`);

    return res.status(200).json({
      message: 'OTP sent successfully (DEV)',
      otp: '1234' // optional, frontend testing ke liye
    });

  } catch (error) {
    return res.status(500).json({
      message: 'Something went wrong'
    });
  }
};

/**
 * Verify OTP Controller (DEV ONLY)
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        message: 'Phone and OTP are required'
      });
    }

    // ✅ FORCE CLEAN + CHECK
    const cleanOtp = otp.toString().replace(/\D/g, '');

    if (cleanOtp !== '1234') {
      return res.status(400).json({
        message: 'Invalid OTP'
      });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ phone });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('VERIFY OTP ERROR:', error);
    return res.status(500).json({
      message: 'Something went wrong'
    });
  }
};
