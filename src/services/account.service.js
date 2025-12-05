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
        where: { NormalizedEmail: email.toUpperCase() }
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
        attributes: [[sequelize.fn('MAX', sequelize.col('Id')), 'maxId']],
        raw: true
      });
      const nextId = (maxUser && maxUser.maxId) ? maxUser.maxId + 1 : 1;

      // Create user
      const user = await User.create({
        Id: nextId,
        Email: email,
        NormalizedEmail: email.toUpperCase(),
        UserName: email,
        NormalizedUserName: email.toUpperCase(),
        PasswordHash: hashedPassword,
        EmailConfirmed: false,
        PhoneNumber: phoneNumber,
        PhoneNumberConfirmed: false,
        TwoFactorEnabled: false,
        LockoutEnabled: true,
        AccessFailedCount: 0,
        IsAdmin: false,
        FirstName: firstName,
        LastName: lastName,
        SecurityStamp: securityStamp,
        ConcurrencyStamp: concurrencyStamp,
        CreatedAt: new Date()
      });

      logger.info(`User registered: ${email}, userId: ${user.Id}`);

      // Generate email confirmation token with userId
      const emailToken = generateEmailToken(email, user.Id);

      // Send email confirmation
      await emailService.sendEmailConfirmationAsync(email, user.Id, emailToken);

      // Return UserDto matching .NET API
      return Result.success({
        id: user.Id,
        name: `${user.FirstName} ${user.LastName}`.trim(),
        emailAddress: user.Email,
        phoneNumber: user.PhoneNumber,
        isAdmin: user.IsAdmin,
        createdAt: user.CreatedAt
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

      // Find user (Id is the primary key column name)
      const user = await User.findOne({
        where: { Id: userId }
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
      if (user.EmailConfirmed) {
        return Result.success({ message: 'Email already confirmed' });
      }

      // Update email confirmed
      user.EmailConfirmed = true;
      user.ModifiedAt = new Date();
      await user.save();

      logger.info(`Email confirmed for userId: ${userId}, email: ${user.Email}`);

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
        where: { NormalizedEmail: email.toUpperCase() }
      });

      if (!user) {
        return Result.failure('Invalid email or password');
      }

      // Check if account is locked out
      if (user.LockoutEnabled && user.LockoutEnd && new Date(user.LockoutEnd) > new Date()) {
        return Result.failure('Account is locked. Please try again later.');
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.PasswordHash);

      if (!isValidPassword) {
        // Increment access failed count
        user.AccessFailedCount += 1;

        // Lock account if max attempts reached (10 attempts)
        if (user.AccessFailedCount >= 10) {
          user.LockoutEnd = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
          logger.warn(`Account locked for: ${email}`);
        }

        await user.save();
        return Result.failure('Invalid email or password');
      }

      // Check if email is confirmed
      if (!user.EmailConfirmed) {
        return Result.failure('Please confirm your email before logging in');
      }

      // Reset access failed count on successful login
      user.AccessFailedCount = 0;
      user.LockoutEnd = null;
      user.ModifiedAt = new Date();
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
        where: { NormalizedEmail: email.toUpperCase() }
      });

      if (!user) {
        // Don't reveal if user exists or not for security - always return success
        logger.info(`Forgot password requested for non-existent email: ${email}`);
        return Result.success();
      }

      // Check if email is confirmed
      if (!user.EmailConfirmed) {
        logger.warn(`Forgot password request for unconfirmed email: ${email}`);
        return Result.success();
      }

      // Generate password reset token
      const resetToken = generatePasswordResetToken(email);

      // Send password reset email with userId and code
      await emailService.sendPasswordResetAsync(email, user.Id, resetToken);

      logger.info(`Password reset email sent to: ${email}, userId: ${user.Id}`);

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
        where: { Id: userId }
      });

      if (!user) {
        return Result.failure('User not found');
      }

      // Verify the reset code
      try {
        const decoded = verifyPurposeToken(code, 'password-reset');

        // Verify the code belongs to this user's email
        if (decoded.email.toUpperCase() !== user.NormalizedEmail) {
          return Result.failure('Invalid reset code');
        }
      } catch (error) {
        logger.error('Password reset token verification error:', error);
        return Result.failure('Invalid or expired reset code');
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      user.PasswordHash = hashedPassword;
      user.SecurityStamp = crypto.randomBytes(16).toString('hex').toUpperCase();
      user.ModifiedAt = new Date();
      await user.save();

      logger.info(`Password reset for userId: ${userId}, email: ${user.Email}`);

      // Send confirmation email
      await emailService.sendPasswordResetSuccessAsync(user.Email, user.UserName || user.Email);

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
