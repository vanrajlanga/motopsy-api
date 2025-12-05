const User = require('../models/user.model');
const { hashPassword, verifyPassword } = require('../utils/hash.helper');
const Result = require('../utils/result');
const logger = require('../config/logger');
const { Op } = require('sequelize');
const { toDataSourceResult } = require('../utils/kendo-datasource');
const userActivityLogService = require('./user-activity-log.service');

class UserService {
  /**
   * Update password
   * Matches .NET API: accepts { currentPassword, newPassword, confirmPassword }
   */
  async updatePasswordAsync(request, userEmail) {
    try {
      const { currentPassword, newPassword, confirmPassword } = request;

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        return Result.failure('The password and confirmation password do not match');
      }

      // Find user
      const user = await User.findOne({
        where: { NormalizedEmail: userEmail.toUpperCase() }
      });

      if (!user) {
        return Result.failure('User not found');
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, user.PasswordHash);

      if (!isValidPassword) {
        return Result.failure('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      user.PasswordHash = hashedPassword;
      user.ModifiedAt = new Date();
      await user.save();

      logger.info(`Password updated for: ${userEmail}`);

      // Log activity (matches .NET)
      await userActivityLogService.logActivityAsync(user.Id, 'PasswordUpdate', 'Profile', { ip: '0.0.0.0' });

      // Return string message matching .NET API (not wrapped in object)
      return Result.success('Password updated successfully');
    } catch (error) {
      logger.error('Update password error:', error);
      return Result.failure(error.message || 'Password update failed');
    }
  }

  /**
   * Get users (with pagination/filtering)
   * Matches .NET: DataSourceResult with Kendo filtering/sorting
   */
  async getUsers(request) {
    try {
      const result = await toDataSourceResult(User, request, {
        baseWhere: { IsAdmin: false },
        order: [['CreatedAt', 'DESC']],
        transform: (user) => ({
          id: user.Id,
          name: `${user.FirstName || ''} ${user.LastName || ''}`.trim() || user.Email,
          emailAddress: user.Email,
          phoneNumber: user.PhoneNumber,
          isAdmin: user.IsAdmin,
          createdAt: user.CreatedAt
        })
      });

      return result;
    } catch (error) {
      logger.error('Get users error:', error);
      throw error;
    }
  }

  /**
   * Get total user count (excluding admins)
   */
  async getTotalUserCountAsync() {
    try {
      const count = await User.count({
        where: { IsAdmin: false }
      });
      // Return number directly matching .NET API
      return Result.success(count);
    } catch (error) {
      logger.error('Get user count error:', error);
      return Result.failure(error.message || 'Failed to get user count');
    }
  }

  /**
   * Get logged in user details
   */
  async getLoggedInUserAsync(userEmail) {
    try {
      // Validate userEmail
      if (!userEmail) {
        return Result.failure('User email is required');
      }

      const user = await User.findOne({
        where: { NormalizedEmail: userEmail.toUpperCase() },
        attributes: ['Id', 'Email', 'FirstName', 'LastName', 'PhoneNumber', 'IsAdmin', 'CreatedAt']
      });

      if (!user) {
        return Result.failure('User not found');
      }

      // Transform to match .NET API response format
      const response = {
        id: user.Id,
        name: `${user.FirstName || ''} ${user.LastName || ''}`.trim() || user.Email,
        emailAddress: user.Email,
        phoneNumber: user.PhoneNumber,
        isAdmin: user.IsAdmin,
        createdAt: user.CreatedAt
      };

      return Result.success(response);
    } catch (error) {
      logger.error('Get logged in user error:', error);
      return Result.failure(error.message || 'Failed to get user details');
    }
  }

  /**
   * Update user details
   * Matches .NET API: accepts { firstName, lastName, phoneNumber }
   */
  async updateUserAsync(userEmail, request) {
    try {
      const { firstName, lastName, phoneNumber } = request;

      const user = await User.findOne({
        where: { NormalizedEmail: userEmail.toUpperCase() }
      });

      if (!user) {
        return Result.failure('User not found');
      }

      // Update user details (always update all fields like .NET does)
      user.FirstName = firstName;
      user.LastName = lastName;
      user.PhoneNumber = phoneNumber;
      user.ModifiedAt = new Date();

      await user.save();

      logger.info(`User updated: ${userEmail}`);

      // Log activity (matches .NET)
      await userActivityLogService.logActivityAsync(user.Id, 'ProfileUpdate', 'Profile', { ip: '0.0.0.0' });

      // Return empty success matching .NET API
      return Result.success();
    } catch (error) {
      logger.error('Update user error:', error);
      return Result.failure(error.message || 'User update failed');
    }
  }
}

module.exports = new UserService();
