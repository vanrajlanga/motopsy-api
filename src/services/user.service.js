const User = require('../models/user.model');
const { hashPassword, verifyPassword } = require('../utils/hash.helper');
const Result = require('../utils/result');
const logger = require('../config/logger');
const { Op } = require('sequelize');

class UserService {
  /**
   * Update password
   */
  async updatePasswordAsync(request, userEmail) {
    try {
      const { currentPassword, newPassword } = request;

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

      return Result.success({ message: 'Password updated successfully' });
    } catch (error) {
      logger.error('Update password error:', error);
      return Result.failure(error.message || 'Password update failed');
    }
  }

  /**
   * Get users (with pagination/filtering)
   */
  getUsers(request) {
    try {
      // TODO: Implement Kendo DataSourceRequest filtering
      // For now, return basic user list
      const { take = 10, skip = 0 } = request;

      const users = User.findAll({
        attributes: ['Id', 'Email', 'UserName', 'FirstName', 'LastName', 'PhoneNumber', 'EmailConfirmed', 'IsAdmin', 'CreatedAt'],
        limit: take,
        offset: skip,
        order: [['CreatedAt', 'DESC']]
      });

      return users;
    } catch (error) {
      logger.error('Get users error:', error);
      throw error;
    }
  }

  /**
   * Get total user count
   */
  async getTotalUserCountAsync() {
    try {
      const count = await User.count();
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

      // Update user details
      if (firstName !== undefined) user.FirstName = firstName;
      if (lastName !== undefined) user.LastName = lastName;
      if (phoneNumber !== undefined) user.PhoneNumber = phoneNumber;
      user.ModifiedAt = new Date();

      await user.save();

      logger.info(`User updated: ${userEmail}`);

      return Result.success({
        message: 'User updated successfully',
        user: {
          id: user.Id,
          email: user.Email,
          firstName: user.FirstName,
          lastName: user.LastName,
          phoneNumber: user.PhoneNumber
        }
      });
    } catch (error) {
      logger.error('Update user error:', error);
      return Result.failure(error.message || 'User update failed');
    }
  }
}

module.exports = new UserService();
