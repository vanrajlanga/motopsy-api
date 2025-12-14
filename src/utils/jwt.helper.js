const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token with user claims (matching .NET format)
 * @param {Object} user - User object
 * @returns {Object} Token object with accessToken, validTo, validFrom
 */
const generateToken = (user) => {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 24 * 60 * 60; // 24 hours in seconds
  const exp = now + expiresIn;

  const payload = {
    sub: String(user.id || user.Id),
    unique_name: user.email || user.Email,
    isAdmin: String(user.is_admin || user.isAdmin || user.IsAdmin || false),
    nbf: now,
    exp: exp,
    iat: now,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256'
  });

  return {
    accessToken,
    validTo: new Date(exp * 1000).toISOString(),
    validFrom: new Date(now * 1000).toISOString()
  };
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generate email confirmation token (6 hours expiry)
 * @param {string} email - User email
 * @param {number} userId - User ID
 * @returns {string} Email confirmation token
 */
const generateEmailToken = (email, userId) => {
  return jwt.sign(
    { email, userId, purpose: 'email-confirmation' },
    JWT_SECRET,
    { expiresIn: process.env.EMAIL_TOKEN_EXPIRES_IN || '6h' }
  );
};

/**
 * Generate password reset token (6 hours expiry)
 * @param {string} email - User email
 * @returns {string} Password reset token
 */
const generatePasswordResetToken = (email) => {
  return jwt.sign(
    { email, purpose: 'password-reset' },
    JWT_SECRET,
    { expiresIn: process.env.EMAIL_TOKEN_EXPIRES_IN || '6h' }
  );
};

/**
 * Verify email or password reset token
 * @param {string} token - Token to verify
 * @param {string} purpose - Token purpose ('email-confirmation' or 'password-reset')
 * @returns {Object} Decoded payload
 */
const verifyPurposeToken = (token, purpose) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== purpose) {
      throw new Error('Invalid token purpose');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

module.exports = {
  generateToken,
  verifyToken,
  generateEmailToken,
  generatePasswordResetToken,
  verifyPurposeToken
};
