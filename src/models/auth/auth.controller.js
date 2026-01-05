const Otp = require('./otp.service');
const User = require('../user/user.model');
const jwt = require('jsonwebtoken');

/**
 * Send OTP Controller
 */
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    // 1️⃣ Phone validation
    if (!phone) {
      return res.status(400).json({
        message: 'Phone number is required'
      });
    }

    // 2️⃣ Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000);

    // 3️⃣ Save OTP temporarily
    await Otp.saveOtp(phone, otp);

    // 4️⃣ Send OTP (for now console)
    console.log(`OTP for ${phone} is ${otp}`);

    return res.status(200).json({
      message: 'OTP sent successfully'
    });

  } catch (error) {
    return res.status(500).json({
      message: 'Something went wrong'
    });
  }
};
/**
 * Verify OTP Controller
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        message: 'Phone and OTP are required'
      });
    }

    // ✅ DEV OTP (GLOBAL)
    if (String(otp).trim() !== '1234') {
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

      
 

  


