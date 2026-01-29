const Otp = require('./otp.service');
const User = require('../user/user.model');
const jwt = require('jsonwebtoken');
const Vendor = require("../vendor/vendor.model");


/**
 * SEND OTP
 */
exports.sendOtp = async (req, res) => {
  try {
    const { phone, role = 'CUSTOMER' } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!['CUSTOMER', 'VENDOR'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // TEMP OTP
    const otp = '1234';

    await Otp.saveOtp(phone, otp, role);

    console.log(` OTP (TEMP) for ${role} ${phone}: ${otp}`);

    return res.status(200).json({
      message: 'OTP sent successfully'
    });

  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

/**
 * VERIFY OTP
 */
exports.verifyOtp = async (req, res) => {
  try {
    let { phone, otp, role = 'CUSTOMER' } = req.body;

    // Normalize role
    role = role.toUpperCase();

    if (!phone || !otp) {
      return res.status(400).json({
        message: 'Phone and OTP are required'
      });
    }

    const isValid = await Otp.verifyOtp(phone, otp, role);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    let entity = null;

    if (role === 'CUSTOMER') {
      entity = await User.findOne({ phone });
      if (!entity) {
        entity = await User.create({ phone });
      }
    } 
    else if (role === 'VENDOR') {
      entity = await Vendor.findOne({ phone });
      if (!entity) {
        entity = await Vendor.create({
          phone,
          name: 'New Vendor',
          storeName: 'My Store'
        });
      }
    } 
    else {
      return res.status(400).json({ message: 'Invalid role type' });
    }

    //  safety check
    if (!entity) {
      console.error(" ENTITY NOT CREATED");
      return res.status(500).json({ message: "User creation failed" });
    }

    // JWT safety
    if (!process.env.JWT_SECRET) {
      console.error(" JWT_SECRET MISSING");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = jwt.sign(
      {
        userId: entity._id,
        role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(" OTP VERIFIED + TOKEN SENT");

    return res.status(200).json({
      message: 'Login successful',
      token,
      role,
      data: entity
    });

  } catch (error) {
    console.error(' VERIFY OTP ERROR:', error);
    return res.status(500).json({ 
      message: 'Something went wrong',
      error: error.message
    });
  }
};
