const vendorOnly = (req, res, next) => {
  if (req.role !== 'VENDOR') {
    return res.status(403).json({ message: 'Vendor access only' });
  }
  next();
};

module.exports = vendorOnly;
