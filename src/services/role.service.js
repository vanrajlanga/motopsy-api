const { Role, UserRole, User } = require('../models');
const { sequelize } = require('../config/database');
const { hashPassword } = require('../utils/hash.helper');
const Result = require('../utils/result');
const logger = require('../config/logger');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class RoleService {
  /**
   * Get all roles
   */
  async getAllRolesAsync() {
    try {
      const roles = await Role.findAll({
        order: [['id', 'ASC']]
      });

      return Result.success(roles);
    } catch (error) {
      logger.error('Get all roles error:', error);
      return Result.failure(error.message || 'Failed to fetch roles');
    }
  }

  /**
   * Get admin users with their roles (only users who have roles assigned)
   */
  async getUsersWithRolesAsync(page = 1, pageSize = 20, search = '') {
    try {
      const offset = (page - 1) * pageSize;
      const { Op } = require('sequelize');

      // Get user IDs that have roles assigned
      const userIdsWithRoles = await UserRole.findAll({
        attributes: ['user_id'],
        group: ['user_id'],
        raw: true
      });
      const adminUserIds = userIdsWithRoles.map(ur => ur.user_id);

      if (adminUserIds.length === 0) {
        return Result.success({
          users: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0
        });
      }

      const whereClause = {
        id: { [Op.in]: adminUserIds }
      };

      if (search) {
        whereClause[Op.and] = [
          { id: { [Op.in]: adminUserIds } },
          {
            [Op.or]: [
              { email: { [Op.like]: `%${search}%` } },
              { first_name: { [Op.like]: `%${search}%` } },
              { last_name: { [Op.like]: `%${search}%` } }
            ]
          }
        ];
        delete whereClause.id;
      }

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        include: [{
          model: Role,
          as: 'Roles',
          through: { attributes: [] }
        }],
        attributes: ['id', 'email', 'first_name', 'last_name', 'is_admin', 'created_at'],
        order: [['id', 'DESC']],
        limit: pageSize,
        offset: offset
      });

      const result = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isAdmin: user.is_admin,
        roles: user.Roles?.map(r => ({ id: r.id, name: r.name })) || [],
        createdAt: user.created_at
      }));

      return Result.success({
        users: result,
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize)
      });
    } catch (error) {
      logger.error('Get users with roles error:', error);
      return Result.failure(error.message || 'Failed to fetch users');
    }
  }

  /**
   * Assign role to user
   */
  async assignRoleAsync(userId, roleId) {
    try {
      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return Result.failure('User not found');
      }

      // Check if role exists
      const role = await Role.findByPk(roleId);
      if (!role) {
        return Result.failure('Role not found');
      }

      // Check if already assigned
      const existing = await UserRole.findOne({
        where: { user_id: userId, role_id: roleId }
      });

      if (existing) {
        return Result.failure('User already has this role');
      }

      // Assign role
      await UserRole.create({
        user_id: userId,
        role_id: roleId
      });

      // If assigning Admin role, also set is_admin flag
      if (role.normalized_name === 'ADMIN') {
        user.is_admin = true;
        await user.save();
      }

      logger.info(`Role '${role.name}' assigned to user ${user.email}`);

      return Result.success({ message: `Role '${role.name}' assigned successfully` });
    } catch (error) {
      logger.error('Assign role error:', error);
      return Result.failure(error.message || 'Failed to assign role');
    }
  }

  /**
   * Remove role from user
   */
  async removeRoleAsync(userId, roleId) {
    try {
      // Check if assignment exists
      const userRole = await UserRole.findOne({
        where: { user_id: userId, role_id: roleId },
        include: [
          { model: User, as: 'User' },
          { model: Role, as: 'Role' }
        ]
      });

      if (!userRole) {
        return Result.failure('User does not have this role');
      }

      const roleName = userRole.Role?.name;
      const userEmail = userRole.User?.email;

      // Remove role
      await userRole.destroy();

      // If removing Admin role, also remove is_admin flag
      if (userRole.Role?.normalized_name === 'ADMIN') {
        const user = await User.findByPk(userId);
        if (user) {
          user.is_admin = false;
          await user.save();
        }
      }

      logger.info(`Role '${roleName}' removed from user ${userEmail}`);

      return Result.success({ message: `Role '${roleName}' removed successfully` });
    } catch (error) {
      logger.error('Remove role error:', error);
      return Result.failure(error.message || 'Failed to remove role');
    }
  }

  /**
   * Get roles for a specific user
   */
  async getUserRolesAsync(userId) {
    try {
      const user = await User.findByPk(userId, {
        include: [{
          model: Role,
          as: 'Roles',
          through: { attributes: [] }
        }]
      });

      if (!user) {
        return Result.failure('User not found');
      }

      return Result.success(user.Roles || []);
    } catch (error) {
      logger.error('Get user roles error:', error);
      return Result.failure(error.message || 'Failed to fetch user roles');
    }
  }

  /**
   * Create a new admin user with a specific role
   */
  async createAdminUserAsync(userData) {
    const transaction = await sequelize.transaction();

    try {
      const { email, password, firstName, lastName, phoneNumber, roleId } = userData;

      // Validate required fields
      if (!email || !password || !roleId) {
        return Result.failure('Email, password, and role are required');
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { normalized_email: email.toUpperCase() }
      });

      if (existingUser) {
        return Result.failure('User with this email already exists');
      }

      // Check if role exists
      const role = await Role.findByPk(roleId);
      if (!role) {
        return Result.failure('Invalid role selected');
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

      // Determine if user should have is_admin flag based on role
      const isAdmin = role.normalized_name === 'ADMIN';

      // Create user
      const user = await User.create({
        id: nextId,
        email: email,
        normalized_email: email.toUpperCase(),
        user_name: email,
        normalized_user_name: email.toUpperCase(),
        password_hash: hashedPassword,
        email_confirmed: true, // Admin-created users are pre-confirmed
        phone_number: phoneNumber || null,
        phone_number_confirmed: false,
        two_factor_enabled: false,
        lockout_enabled: true,
        access_failed_count: 0,
        is_admin: isAdmin,
        first_name: firstName || null,
        last_name: lastName || null,
        security_stamp: securityStamp,
        concurrency_stamp: concurrencyStamp,
        created_at: new Date()
      }, { transaction });

      // Assign role to user
      await UserRole.create({
        user_id: user.id,
        role_id: roleId
      }, { transaction });

      await transaction.commit();

      logger.info(`Admin user created: ${email} with role ${role.name}`);

      return Result.success({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: role.name,
        message: `User created successfully with ${role.name} role`
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Create admin user error:', error);
      return Result.failure(error.message || 'Failed to create admin user');
    }
  }
  /**
   * Update password for an admin user
   */
  async updateAdminUserPasswordAsync(userId, newPassword) {
    try {
      if (!userId || !newPassword) {
        return Result.failure('User ID and new password are required');
      }

      if (newPassword.length < 6) {
        return Result.failure('Password must be at least 6 characters');
      }

      // Check if user exists and has a role
      const userRole = await UserRole.findOne({
        where: { user_id: userId }
      });

      if (!userRole) {
        return Result.failure('User is not an admin user');
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return Result.failure('User not found');
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      user.password_hash = hashedPassword;
      user.security_stamp = crypto.randomBytes(16).toString('hex').toUpperCase();
      user.modified_at = new Date();
      await user.save();

      logger.info(`Password updated for admin user: ${user.email}`);

      return Result.success({ message: 'Password updated successfully' });
    } catch (error) {
      logger.error('Update admin user password error:', error);
      return Result.failure(error.message || 'Failed to update password');
    }
  }
}

module.exports = new RoleService();
