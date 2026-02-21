const InspectionModule = require('../models/inspection-module.model');
const InspectionSubGroup = require('../models/inspection-sub-group.model');
const InspectionParameter = require('../models/inspection-parameter.model');
const { Op } = require('sequelize');
const Result = require('../utils/result');
const logger = require('../config/logger');

class ParameterService {
  /**
   * Get all applicable parameters grouped by module > sub-group,
   * filtered by fuel type and transmission type.
   */
  async getApplicableParameters(fuelType, transmissionType) {
    try {
      const modules = await InspectionModule.findAll({
        order: [['sort_order', 'ASC']],
        include: [{
          model: InspectionSubGroup,
          as: 'SubGroups',
          order: [['sort_order', 'ASC']],
          include: [{
            model: InspectionParameter,
            as: 'Parameters',
            order: [['sort_order', 'ASC']]
          }]
        }]
      });

      // Filter parameters by fuel and transmission
      const result = modules.map(mod => {
        const moduleData = mod.toJSON();
        moduleData.SubGroups = moduleData.SubGroups
          .map(sg => {
            sg.Parameters = sg.Parameters.filter(p =>
              p.is_active &&
              this.matchesFilter(p.fuel_filter, fuelType) &&
              this.matchesFilter(p.transmission_filter, transmissionType)
            );
            return sg;
          })
          .filter(sg => sg.Parameters.length > 0);

        // Recalculate check_count after filtering
        moduleData.totalParams = moduleData.SubGroups.reduce(
          (sum, sg) => sum + sg.Parameters.length, 0
        );

        return moduleData;
      }).filter(mod => mod.totalParams > 0);

      return Result.success(result);
    } catch (error) {
      logger.error('Get applicable parameters error:', error);
      return Result.failure(error.message || 'Failed to get parameters');
    }
  }

  /**
   * Check if a parameter's filter matches the vehicle's value.
   * "All" matches everything. Otherwise, check if filter contains the value.
   */
  matchesFilter(filterValue, vehicleValue) {
    if (!filterValue || filterValue.trim().toLowerCase() === 'all') return true;
    if (!vehicleValue) return true;

    const filters = filterValue.split(',').map(f => f.trim().toLowerCase());
    return filters.includes(vehicleValue.toLowerCase());
  }

  /**
   * Get just the module list with active/total counts (no parameters).
   * Used for initial tab load in admin panel.
   */
  async getModules() {
    try {
      const modules = await InspectionModule.findAll({
        order: [['sort_order', 'ASC']],
        include: [{
          model: InspectionSubGroup,
          as: 'SubGroups',
          attributes: ['id', 'name', 'sort_order'],
          include: [{
            model: InspectionParameter,
            as: 'Parameters',
            attributes: ['id', 'is_active']
          }]
        }]
      });

      const result = modules.map(mod => {
        const moduleData = mod.toJSON();
        let totalCount = 0;
        let activeCount = 0;
        moduleData.SubGroups = moduleData.SubGroups.map(sg => {
          const sgActive = sg.Parameters.filter(p => p.is_active).length;
          const sgTotal = sg.Parameters.length;
          totalCount += sgTotal;
          activeCount += sgActive;
          return { id: sg.id, name: sg.name, activeCount: sgActive, totalCount: sgTotal };
        });
        return { id: moduleData.id, name: moduleData.name, icon: moduleData.icon, SubGroups: moduleData.SubGroups, activeCount, totalCount };
      });

      return Result.success(result);
    } catch (error) {
      logger.error('Get modules error:', error);
      return Result.failure(error.message || 'Failed to get modules');
    }
  }

  /**
   * Get sub-groups + parameters for a single module.
   * Used for lazy loading tab content in admin panel.
   */
  async getModuleParameters(moduleId) {
    try {
      const subGroups = await InspectionSubGroup.findAll({
        where: { module_id: moduleId },
        order: [['sort_order', 'ASC']],
        include: [{
          model: InspectionParameter,
          as: 'Parameters',
          order: [['sort_order', 'ASC']]
        }]
      });

      const result = subGroups.map(sg => {
        const sgData = sg.toJSON();
        const active = sgData.Parameters.filter(p => p.is_active).length;
        return { ...sgData, activeCount: active, totalCount: sgData.Parameters.length };
      });

      return Result.success(result);
    } catch (error) {
      logger.error('Get module parameters error:', error);
      return Result.failure(error.message || 'Failed to get module parameters');
    }
  }

  /**
   * Get full hierarchy of modules → sub-groups → parameters with is_active status.
   * Used by admin panel for parameter management.
   */
  async getParameterHierarchy() {
    try {
      const modules = await InspectionModule.findAll({
        order: [['sort_order', 'ASC']],
        include: [{
          model: InspectionSubGroup,
          as: 'SubGroups',
          order: [['sort_order', 'ASC']],
          include: [{
            model: InspectionParameter,
            as: 'Parameters',
            order: [['sort_order', 'ASC']]
          }]
        }]
      });

      const result = modules.map(mod => {
        const moduleData = mod.toJSON();
        const totalParams = moduleData.SubGroups.reduce((sum, sg) => sum + sg.Parameters.length, 0);
        const activeParams = moduleData.SubGroups.reduce(
          (sum, sg) => sum + sg.Parameters.filter(p => p.is_active).length, 0
        );

        moduleData.SubGroups = moduleData.SubGroups.map(sg => {
          const sgActive = sg.Parameters.filter(p => p.is_active).length;
          return {
            ...sg,
            activeCount: sgActive,
            totalCount: sg.Parameters.length
          };
        });

        return {
          ...moduleData,
          activeCount: activeParams,
          totalCount: totalParams
        };
      });

      return Result.success(result);
    } catch (error) {
      logger.error('Get parameter hierarchy error:', error);
      return Result.failure(error.message || 'Failed to get parameter hierarchy');
    }
  }

  /**
   * Toggle a single parameter's is_active status.
   */
  async toggleParameterStatus(parameterId, isActive) {
    try {
      const param = await InspectionParameter.findByPk(parameterId);
      if (!param) {
        return Result.failure('Parameter not found');
      }

      await param.update({ is_active: isActive ? 1 : 0 });
      return Result.success({ id: parameterId, is_active: isActive });
    } catch (error) {
      logger.error('Toggle parameter status error:', error);
      return Result.failure(error.message || 'Failed to toggle parameter status');
    }
  }

  /**
   * Bulk toggle all parameters in a sub-group.
   */
  async toggleSubGroupStatus(subGroupId, isActive) {
    try {
      const subGroup = await InspectionSubGroup.findByPk(subGroupId);
      if (!subGroup) {
        return Result.failure('Sub-group not found');
      }

      const [affectedCount] = await InspectionParameter.update(
        { is_active: isActive ? 1 : 0 },
        { where: { sub_group_id: subGroupId } }
      );

      return Result.success({ subGroupId, isActive, affectedCount });
    } catch (error) {
      logger.error('Toggle sub-group status error:', error);
      return Result.failure(error.message || 'Failed to toggle sub-group status');
    }
  }

  /**
   * Get a single parameter by ID with all fields.
   */
  async getParameterById(id) {
    try {
      const param = await InspectionParameter.findByPk(id);
      if (!param) {
        return Result.failure('Parameter not found');
      }
      return Result.success(param.toJSON());
    } catch (error) {
      logger.error('Get parameter by ID error:', error);
      return Result.failure(error.message || 'Failed to get parameter');
    }
  }

  /**
   * Update a parameter's editable fields.
   */
  async updateParameter(id, data) {
    try {
      const param = await InspectionParameter.findByPk(id);
      if (!param) {
        return Result.failure('Parameter not found');
      }

      const allowedFields = [
        'name', 'detail', 'input_type',
        'option_1', 'option_2', 'option_3', 'option_4', 'option_5',
        'score_1', 'score_2', 'score_3', 'score_4', 'score_5',
        'fuel_filter', 'transmission_filter', 'is_red_flag', 'sort_order'
      ];

      const updateData = {};
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }

      updateData.modified_at = new Date();

      await param.update(updateData);
      return Result.success(param.toJSON());
    } catch (error) {
      logger.error('Update parameter error:', error);
      return Result.failure(error.message || 'Failed to update parameter');
    }
  }

  /**
   * Bulk toggle all parameters in a module (across all its sub-groups).
   */
  async toggleModuleStatus(moduleId, isActive) {
    try {
      const mod = await InspectionModule.findByPk(moduleId);
      if (!mod) {
        return Result.failure('Module not found');
      }

      const subGroups = await InspectionSubGroup.findAll({
        where: { module_id: moduleId },
        attributes: ['id']
      });

      const subGroupIds = subGroups.map(sg => sg.id);

      const [affectedCount] = await InspectionParameter.update(
        { is_active: isActive ? 1 : 0 },
        { where: { sub_group_id: { [Op.in]: subGroupIds } } }
      );

      return Result.success({ moduleId, isActive, affectedCount });
    } catch (error) {
      logger.error('Toggle module status error:', error);
      return Result.failure(error.message || 'Failed to toggle module status');
    }
  }
}

module.exports = new ParameterService();
