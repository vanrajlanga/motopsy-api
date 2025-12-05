const { verifyToken } = require('../utils/jwt.helper');
const logger = require('../config/logger');

/**
 * Authentication middleware - Verifies JWT token
 * Matches .NET [Authorize] attribute behavior
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        isSuccess: false,
        error: 'Unauthorized - No token provided'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Extract email from unique_name (matching .NET format)
    const email = decoded.unique_name || decoded.email;
    const userId = decoded.sub || decoded.userId;
    const isAdmin = decoded.isAdmin === 'True' || decoded.isAdmin === true;

    // Attach user info to request
    req.user = {
      email: email,
      userId: userId,
      isAdmin: isAdmin,
      identity: {
        name: email
      }
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error.message);
    return res.status(401).json({
      isSuccess: false,
      error: 'Unauthorized - Invalid or expired token'
    });
  }
};

/**
 * Admin authorization middleware
 * Matches .NET [Authorize(Policy = MotopsyPolicies.Admin)] attribute
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      isSuccess: false,
      error: 'Unauthorized'
    });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({
      isSuccess: false,
      error: 'Forbidden - Admin access required'
    });
  }

  next();
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      // Extract email from unique_name (matching .NET format)
      const email = decoded.unique_name || decoded.email;
      const userId = decoded.sub || decoded.userId;
      const isAdmin = decoded.isAdmin === 'True' || decoded.isAdmin === true;

      req.user = {
        email: email,
        userId: userId,
        isAdmin: isAdmin,
        identity: {
          name: email
        }
      };
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth failed:', error.message);
  }

  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth
};
