const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry: A record with this value already exists',
      field: err.detail,
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record not found',
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, AppError };
