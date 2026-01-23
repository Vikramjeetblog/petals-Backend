const customerOnly = (req, res, next) => {
  if (req.role !== 'CUSTOMER') {
    return res.status(403).json({ message: 'Customer access only' });
  }
  next();
};

module.exports = customerOnly;
