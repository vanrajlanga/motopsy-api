const User = require('../models/user.model');
const { sequelize } = require('../config/database');
const { hashPassword, verifyPassword } = require('../utils/hash.helper');
const { generateToken, generateEmailToken, generatePasswordResetToken, verifyPurposeToken } = require('../utils/jwt.helper');
const Result = require('../utils/result');
const logger = require('../config/logger');
const emailService = require('./email.service');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class AccountService {
  /**
   * Register new user
   */
  async registerAsync(request) {
    try {
      const { email, password, firstName, lastName, phoneNumber } = request;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { normalized_email: email.toUpperCase() }
      });

      if (existingUser) {
        return Result.failure('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Generate security stamp and concurrency stamp
      const securityStamp = crypto.randomBytes(16).toString('hex').toUpperCase();
      const concurrencyStamp = uuidv4();

      // Get next available ID
      const maxUser = await User.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('id')), 'maxId']],
        raw: true
      });
      const nextId = (maxUser && maxUser.maxId) ? maxUser.maxId + 1 : 1;

      // Create user
      const user = await User.create({
        id: nextId,
        email: email,
        normalized_email: email.toUpperCase(),
        user_name: email,
        normalized_user_name: email.toUpperCase(),
        password_hash: hashedPassword,
        email_confirmed: false,
        phone_number: phoneNumber,
        phone_number_confirmed: false,
        two_factor_enabled: false,
        lockout_enabled: true,
        access_failed_count: 0,
        is_admin: false,
        first_name: firstName,
        last_name: lastName,
        security_stamp: securityStamp,
        concurrency_stamp: concurrencyStamp,
        created_at: new Date()
      });

      logger.info(`User registered: ${email}, userId: ${user.id}`);

      // Generate email confirmation token with userId
      const emailToken = generateEmailToken(email, user.id);

      // Send email confirmation
      await emailService.sendEmailConfirmationAsync(email, user.id, emailToken);

      // Return UserDto matching .NET API
      return Result.success({
        id: user.id,
        name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
        emailAddress: user.email,
        phoneNumber: user.phone_number || null,
        isAdmin: user.is_admin,
        createdAt: user.created_at
      });
    } catch (error) {
      logger.error('Registration error:', error);
      return Result.failure(error.message || 'Registration failed');
    }
  }

  /**
   * Confirm email
   */
  async confirmEmailAsync(request) {
    try {
      const { userId, code } = request;

      // Validate input
      if (!userId || !code) {
        return Result.failure('UserId and code are required');
      }

      // Find user (id is the primary key column name)
      const user = await User.findOne({
        where: { id: userId }
      });

      if (!user) {
        return Result.failure('User not found');
      }

      // Verify the confirmation code
      try {
        const decoded = verifyPurposeToken(code, 'email-confirmation');

        // Verify the token belongs to this user
        if (decoded.userId !== userId) {
          return Result.failure('Invalid confirmation code');
        }
      } catch (error) {
        logger.error('Email confirmation token verification error:', error);
        return Result.failure('Invalid or expired confirmation code');
      }

      // Check if already confirmed
      if (user.email_confirmed) {
        return Result.success({ message: 'Email already confirmed' });
      }

      // Update email confirmed
      user.email_confirmed = true;
      user.modified_at = new Date();
      await user.save();

      logger.info(`Email confirmed for userId: ${userId}, email: ${user.email}`);

      return Result.success({ message: 'Email confirmed successfully' });
    } catch (error) {
      logger.error('Email confirmation error:', error);
      return Result.failure('Email confirmation failed');
    }
  }

  /**
   * Login user
   */
  async loginAsync(request) {
    try {
      const { email, password } = request;

      // Find user
      const user = await User.findOne({
        where: { normalized_email: email.toUpperCase() }
      });

      if (!user) {
        return Result.failure('Invalid email or password');
      }

      // Check if account is locked out
      if (user.lockout_enabled && user.lockout_end && new Date(user.lockout_end) > new Date()) {
        return Result.failure('Account is locked. Please try again later.');
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password_hash);

      if (!isValidPassword) {
        // Increment access failed count
        user.access_failed_count += 1;

        // Lock account if max attempts reached (10 attempts)
        if (user.access_failed_count >= 10) {
          user.lockout_end = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
          logger.warn(`Account locked for: ${email}`);
        }

        await user.save();
        return Result.failure('Invalid email or password');
      }

      // Check if email is confirmed
      if (!user.email_confirmed) {
        return Result.failure('Please confirm your email before logging in');
      }

      // Reset access failed count on successful login
      user.access_failed_count = 0;
      user.lockout_end = null;
      user.modified_at = new Date();
      await user.save();

      // Generate JWT token (returns { accessToken, validTo, validFrom })
      const tokenData = generateToken(user);

      logger.info(`User logged in: ${email}`);

      return Result.success(tokenData);
    } catch (error) {
      logger.error('Login error:', error);
      return Result.failure(error.message || 'Login failed');
    }
  }

  /**
   * Forgot password
   */
  async forgetPasswordAsync(request) {
    try {
      const { email } = request;

      // Find user
      const user = await User.findOne({
        where: { normalized_email: email.toUpperCase() }
      });

      if (!user) {
        // Don't reveal if user exists or not for security - always return success
        logger.info(`Forgot password requested for non-existent email: ${email}`);
        return Result.success();
      }

      // Check if email is confirmed
      if (!user.email_confirmed) {
        logger.warn(`Forgot password request for unconfirmed email: ${email}`);
        return Result.success();
      }

      // Generate password reset token
      const resetToken = generatePasswordResetToken(email);

      // Send password reset email with userId and code
      await emailService.sendPasswordResetAsync(email, user.id, resetToken);

      logger.info(`Password reset email sent to: ${email}, userId: ${user.id}`);

      // Return empty success matching .NET API
      return Result.success();
    } catch (error) {
      logger.error('Forgot password error:', error);
      return Result.failure(error.message || 'Password reset request failed');
    }
  }

  /**
   * Reset password
   * Matches .NET API: accepts { userId, newPassword, confirmPassword, code }
   */
  async resetPasswordAsync(request) {
    try {
      const { userId, newPassword, confirmPassword, code } = request;

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        return Result.failure('The password and confirmation password do not match');
      }

      // Find user by ID
      const user = await User.findOne({
        where: { id: userId }
      });

      if (!user) {
        return Result.failure('User not found');
      }

      // Verify the reset code
      try {
        const decoded = verifyPurposeToken(code, 'password-reset');

        // Verify the code belongs to this user's email
        if (decoded.email.toUpperCase() !== user.normalized_email) {
          return Result.failure('Invalid reset code');
        }
      } catch (error) {
        logger.error('Password reset token verification error:', error);
        return Result.failure('Invalid or expired reset code');
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      user.password_hash = hashedPassword;
      user.security_stamp = crypto.randomBytes(16).toString('hex').toUpperCase();
      user.modified_at = new Date();
      await user.save();

      logger.info(`Password reset for userId: ${userId}, email: ${user.email}`);

      // Send confirmation email
      await emailService.sendPasswordResetSuccessAsync(user.email, user.user_name || user.email);

      // Return string message matching .NET API (not wrapped in object)
      return Result.success('Password updated successfully');
    } catch (error) {
      logger.error('Reset password error:', error);
      return Result.failure('Password reset failed');
    }
  }

  /**
   * Contact us
   * Matches .NET API: accepts { name, email, phoneNumber, registrationNumber (optional), message }
   */
  async contactUsAsync(request) {
    try {
      const { name, email, phoneNumber, registrationNumber, message } = request;

      // Send email to admin
      await emailService.sendContactUsEmailAsync(name, email, phoneNumber, registrationNumber, message);

      logger.info(`Contact form email sent from: ${email}`);

      // Return empty success matching .NET API
      return Result.success();
    } catch (error) {
      logger.error('Contact us error:', error);
      return Result.failure(error.message || 'Failed to send message');
    }
  }
}

module.exports = new AccountService();
