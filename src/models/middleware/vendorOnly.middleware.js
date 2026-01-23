
const vendorOnly = (req, res, next) => {
  if (req.role !== 'VENDOR') {
    return res.status(403).json({ message: 'Vendor access only' });
  }

  //  block not-approved vendors
  if (req.user?.onboardingStatus !== 'APPROVED') {
    return res.status(403).json({
      message: 'Vendor not approved yet',
      onboardingStatus: req.user?.onboardingStatus || 'PENDING',
    });
  }

  next();
};

module.exports = vendorOnly;
