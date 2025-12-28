const jwt = require('jsonwebtoken');
const User = require('../user/user.model');

 
const authMiddleware = async (req, res, next) => {
  try {
    // 1️ Read Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: 'Authorization header missing'
      });
    }

    // 2️ Extract token (Bearer <token>)
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'Token missing'
      });
    }

    // 3️ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️ Find user from DB
    const user = await User.findById(decoded.userId).select('-__v');

    if (!user) {
      return res.status(401).json({
        message: 'User not found'
      });
    }

    // 5️ Attach user to request
    req.user = user;

    // 6️  next 
    next();

  } catch (error) {
    console.error('AUTH MIDDLEWARE ERROR:', error.message);
    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }
};

module.exports = authMiddleware;
