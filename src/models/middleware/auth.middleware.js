const jwt = require('jsonwebtoken');
const User = require('../user/user.model');
const Vendor = require('../vendor/vendor.model');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let entity = null;

    //  ROLE BASED FETCH
    if (decoded.role === 'CUSTOMER') {
      entity = await User.findById(decoded.userId).select('-__v');
    } 
    else if (decoded.role === 'VENDOR') {
      entity = await Vendor.findById(decoded.userId).select('-__v');
    }

    if (!entity) {
      return res.status(401).json({ message: 'Account not found' });
    }

    req.user = entity;       // actual user/vendor
    req.role = decoded.role; // CUSTOMER | VENDOR

    next();

  } catch (error) {
    console.error('AUTH ERROR:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
