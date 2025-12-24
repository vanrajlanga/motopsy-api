const logger = require('../config/logger');
const Result = require('../utils/result');
const emailService = require('../services/email.service');

/**
 * Global error handling middleware (matching .NET ErrorHandlingMiddleware)
 * Catches all unhandled errors and returns consistent error responses
 */
const errorHandler = (err, req, res, next) => {
  // Determine status code
  let statusCode = err.statusCode || 500;

  // Default error message
  let errorMessage = err.message || 'Internal Server Error';

  // Handle specific error types first to determine final status code
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = err.message;
  } else if (err.name === 'UnauthorizedError' || err.message.includes('token')) {
    statusCode = 401;
    errorMessage = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorMessage = 'Forbidden';
  } else if (err.name === 'NotFoundError' || errorMessage.toLowerCase().includes('not found')) {
    statusCode = 404;
  }

  // Enhanced error logging with full details
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    statusCode: statusCode,
    timestamp: new Date().toISOString(),

    // Request details
    request: {
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      query: req.query,
      body: req.body ? (req.body.password ? { ...req.body, password: '[REDACTED]' } : req.body) : {},
      headers: {
        'user-agent': req.get('user-agent'),
        'content-type': req.get('content-type'),
        'origin': req.get('origin'),
        'referer': req.get('referer')
      },
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.userId || 'anonymous'
    },

    // Error details
    error: {
      name: err.name,
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      sql: err.sql // If it's a database error
    }
  };

  // Log the error with all details
  logger.error('API Error occurred', errorDetails);

  // Send error notification email for server errors (500+) only
  // Skip 4xx client errors (auth failures, not found, validation errors)
  if (statusCode >= 500) {
    emailService.sendErrorNotificationAsync(errorDetails).catch(emailErr => {
      logger.error('Failed to send error notification email:', emailErr.message);
    });
  }

  // Create Result object matching .NET response format
  const result = Result.failure(errorMessage);

  res.status(statusCode).json(result);
};

module.exports = errorHandler;
