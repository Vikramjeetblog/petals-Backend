module.exports = (err, req, res, next) => {
  console.error('UNHANDLED ERROR:', err);
  if (res.headersSent) return next(err);

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};
