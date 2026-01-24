const roleService = require('../services/role.service');
const BaseController = require('./base.controller');

class RoleController extends BaseController {
  /**
   * GET /api/admin/roles
   * Get all roles
   */
  async getAllRoles(req, res) {
    const result = await roleService.getAllRolesAsync();
    return this.fromResult(result, res);
  }

  /**
   * POST /api/admin/roles/users
   * Get users with their roles (paginated)
   */
  async getUsersWithRoles(req, res) {
    const { page = 1, pageSize = 20, search = '' } = req.body;
    const result = await roleService.getUsersWithRolesAsync(page, pageSize, search);
    return this.fromResult(result, res);
  }

  /**
   * POST /api/admin/roles/assign
   * Assign role to user
   */
  async assignRole(req, res) {
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({
        isSuccess: false,
        error: 'userId and roleId are required'
      });
    }

    const result = await roleService.assignRoleAsync(userId, roleId);
    return this.fromResult(result, res);
  }

  /**
   * POST /api/admin/roles/remove
   * Remove role from user
   */
  async removeRole(req, res) {
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({
        isSuccess: false,
        error: 'userId and roleId are required'
      });
    }

    const result = await roleService.removeRoleAsync(userId, roleId);
    return this.fromResult(result, res);
  }

  /**
   * GET /api/admin/roles/user/:userId
   * Get roles for a specific user
   */
  async getUserRoles(req, res) {
    const { userId } = req.params;
    const result = await roleService.getUserRolesAsync(parseInt(userId));
    return this.fromResult(result, res);
  }

  /**
   * POST /api/admin/roles/create-user
   * Create a new admin user with a specific role
   */
  async createAdminUser(req, res) {
    const { email, password, firstName, lastName, phoneNumber, roleId } = req.body;

    if (!email || !password || !roleId) {
      return res.status(400).json({
        isSuccess: false,
        error: 'Email, password, and roleId are required'
      });
    }

    const result = await roleService.createAdminUserAsync({
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      roleId
    });
    return this.fromResult(result, res);
  }

  /**
   * POST /api/admin/roles/update-password
   * Update password for an admin user
   */
  async updateAdminUserPassword(req, res) {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({
        isSuccess: false,
        error: 'userId and newPassword are required'
      });
    }

    const result = await roleService.updateAdminUserPasswordAsync(userId, newPassword);
    return this.fromResult(result, res);
  }
}

module.exports = new RoleController();
