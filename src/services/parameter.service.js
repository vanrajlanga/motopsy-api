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
  async getApplicableParameters(fuelType, transmissionType, context = {}) {
    const {
      hasLift = true,
      roadTestPossible = true,
      templateSlug = null,
      parameterVersion = 1,
      vehicleFeatures = null
    } = context;
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

      // Filter parameters by fuel, transmission, context, template, features, and version
      const result = modules.map(mod => {
        const moduleData = mod.toJSON();
        moduleData.SubGroups = moduleData.SubGroups
          .map(sg => {
            sg.Parameters = sg.Parameters.filter(p => {
              // Base filters (same as before)
              if (!p.is_active) return false;
              if (!this.matchesFilter(p.fuel_filter, fuelType)) return false;
              if (!this.matchesFilter(p.transmission_filter, transmissionType)) return false;
              if (!this.matchesContextFilter(p.context_filter, hasLift, roadTestPossible)) return false;
              if (!this.matchesTemplateFilter(p.template_filter, templateSlug)) return false;

              // Feature filter (v2): exclude params requiring features the car doesn't have
              if (!this.matchesFeatureFilter(p.feature_filter, vehicleFeatures)) return false;

              // Version filter: v2 loads only composites, v1 loads only non-composites
              if (parameterVersion >= 2) {
                return p.is_composite === 1;
              } else {
                return p.is_composite === 0 && p.parent_id === null;
              }
            });
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
  matchesContextFilter(contextFilter, hasLift, roadTestPossible) {
    if (!contextFilter) return true;
    const filters = contextFilter.split(',').map(f => f.trim());
    if (filters.includes('lift_required') && !hasLift) return false;
    if (filters.includes('road_test_required') && !roadTestPossible) return false;
    return true;
  }

  matchesTemplateFilter(templateFilter, templateSlug) {
    // NULL / empty / 'all' → applies to every template
    if (!templateFilter || templateFilter.trim().toLowerCase() === 'all') return true;
    // If no specific template context, include everything
    if (!templateSlug) return true;
    const slugs = templateFilter.split(',').map(s => s.trim().toLowerCase());
    return slugs.includes(templateSlug.toLowerCase());
  }

  /**
   * Check if a parameter's feature_filter matches the vehicle's detected features.
   * NULL filter = universal (applies to all cars).
   * "sunroof" = only include if vehicleFeatures.sunroof is true.
   * "sunroof,panoramic_roof" = include if ANY listed feature is present (OR logic).
   */
  matchesFeatureFilter(featureFilter, vehicleFeatures) {
    // No feature requirement → universal param, always include
    if (!featureFilter) return true;
    // No features detected yet → include everything (features not yet set)
    if (!vehicleFeatures) return true;

    const requiredFeatures = featureFilter.split(',').map(f => f.trim().toLowerCase());
    // Include if ANY of the required features is present on the vehicle (OR logic)
    return requiredFeatures.some(f => vehicleFeatures[f] === true);
  }

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
            attributes: ['id', 'is_active', 'weightage']
          }]
        }]
      });

      const result = modules.map(mod => {
        const moduleData = mod.toJSON();
        let totalCount = 0;
        let activeCount = 0;
        let weightTotal = 0;
        let activeWeightTotal = 0;
        moduleData.SubGroups = moduleData.SubGroups.map(sg => {
          const sgActive = sg.Parameters.filter(p => p.is_active).length;
          const sgTotal = sg.Parameters.length;
          totalCount += sgTotal;
          activeCount += sgActive;
          sg.Parameters.forEach(p => {
            const wt = parseFloat(p.weightage || 0);
            weightTotal += wt;
            if (p.is_active) activeWeightTotal += wt;
          });
          return { id: sg.id, name: sg.name, activeCount: sgActive, totalCount: sgTotal };
        });
        return {
          id: moduleData.id, name: moduleData.name, icon: moduleData.icon,
          SubGroups: moduleData.SubGroups, activeCount, totalCount,
          weightTotal: parseFloat(weightTotal.toFixed(2)),
          activeWeightTotal: parseFloat(activeWeightTotal.toFixed(2))
        };
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
      const modules = await InspectionModule.findAll({
        where: { id: moduleId },
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

      if (!modules.length) return Result.failure('Module not found');

      const mod = modules[0].toJSON();
      const subGroups = mod.SubGroups.map(sg => {
        const active = sg.Parameters.filter(p => p.is_active).length;
        return { ...sg, activeCount: active, totalCount: sg.Parameters.length };
      });

      return Result.success(subGroups);
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
    const VALID_TEMPLATE_SLUGS = new Set(['used_car', 'new_car_pdi']);

    try {
      const param = await InspectionParameter.findByPk(id);
      if (!param) {
        return Result.failure('Parameter not found');
      }

      // Validate template_filter if provided
      if (data.template_filter != null) {
        const slugs = data.template_filter.split(',').map(s => s.trim()).filter(Boolean);
        for (const slug of slugs) {
          if (!VALID_TEMPLATE_SLUGS.has(slug)) {
            return Result.failure(`Invalid template_filter value: "${slug}". Allowed: ${[...VALID_TEMPLATE_SLUGS].join(', ')}`);
          }
        }
      }

      const allowedFields = [
        'name', 'detail', 'input_type',
        'option_1', 'option_2', 'option_3', 'option_4', 'option_5',
        'score_1', 'score_2', 'score_3', 'score_4', 'score_5',
        'fuel_filter', 'transmission_filter', 'context_filter', 'template_filter',
        'feature_filter', 'sub_items_json',
        'is_red_flag', 'is_composite', 'parent_id', 'sort_order',
        'weightage', 'weightage_pdi'
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
   * Get weight summary for a module: total weight, active weight, param count.
   * Used by admin panel to show whether weights sum to ~100%.
   */
  async getModuleWeightSummary(moduleId) {
    try {
      const subGroups = await InspectionSubGroup.findAll({
        where: { module_id: moduleId },
        attributes: ['id']
      });
      const subGroupIds = subGroups.map(sg => sg.id);

      const params = await InspectionParameter.findAll({
        where: { sub_group_id: { [Op.in]: subGroupIds } },
        attributes: ['id', 'weightage', 'weightage_pdi', 'is_active', 'template_filter']
      });

      const totalWeight  = params.reduce((s, p) => s + parseFloat(p.weightage), 0);
      const activeWeight = params.filter(p => p.is_active).reduce((s, p) => s + parseFloat(p.weightage), 0);

      // Per-template effective weight: only params visible to that template
      // PDI uses weightage_pdi if set, otherwise falls back to weightage
      const usedCarParams = params.filter(p => !p.template_filter || p.template_filter === 'used_car');
      const pdiParams     = params.filter(p => !p.template_filter || p.template_filter === 'new_car_pdi');
      const usedCarWeight = usedCarParams.reduce((s, p) => s + parseFloat(p.weightage), 0);
      const pdiWeight     = pdiParams.reduce((s, p) => s + parseFloat(p.weightage_pdi ?? p.weightage), 0);

      return Result.success({
        moduleId,
        totalWeight:     parseFloat(totalWeight.toFixed(2)),
        activeWeight:    parseFloat(activeWeight.toFixed(2)),
        totalParams:     params.length,
        activeParams:    params.filter(p => p.is_active).length,
        usedCarWeight:   parseFloat(usedCarWeight.toFixed(2)),
        usedCarParams:   usedCarParams.length,
        pdiWeight:       parseFloat(pdiWeight.toFixed(2)),
        pdiParams:       pdiParams.length,
      });
    } catch (error) {
      logger.error('Get module weight summary error:', error);
      return Result.failure(error.message || 'Failed to get weight summary');
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
