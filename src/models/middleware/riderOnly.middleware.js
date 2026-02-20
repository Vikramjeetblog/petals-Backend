const riderOnly = (req, res, next) => {
  if (req.role !== 'RIDER') {
    return res.status(403).json({ message: 'Rider access only' });
  }

  next();
};

module.exports = riderOnly;
