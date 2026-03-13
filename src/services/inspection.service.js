const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const Inspection = require('../models/inspection.model');
const InspectionResponse = require('../models/inspection-response.model');
const InspectionParameter = require('../models/inspection-parameter.model');
const InspectionSubGroup = require('../models/inspection-sub-group.model');
const InspectionModule = require('../models/inspection-module.model');
const InspectionScore = require('../models/inspection-score.model');
const InspectionCertificate = require('../models/inspection-certificate.model');
const InspectionPhoto = require('../models/inspection-photo.model');
const User = require('../models/user.model');
const ServiceOrder = require('../models/service-order.model');
const ServicePlan = require('../models/service-plan.model');
const InspectionTemplate = require('../models/inspection-template.model');
const parameterService = require('./parameter.service');
const scoringService = require('./scoring.service');
const vehicleDetailService = require('./vehicle-detail.service');
const { getRepairTier, calculateMarketValue } = require('../config/repair-tiers');
const Result = require('../utils/result');
const logger = require('../config/logger');

// service_type → template_id mapping
// service_type=4 is New Vehicle PDI → template 2 (new_car_pdi)
// all others with inspections → template 1 (used_car)
const NEW_CAR_PDI_SERVICE_TYPE = 4;

class InspectionService {
  /**
   * Create a new inspection and pre-populate response rows for applicable parameters.
   */
  async create(technicianId, vehicleData) {
    const transaction = await sequelize.transaction();
    try {
      const { vehicleRegNumber, vehicleMake, vehicleModel, vehicleYear,
              fuelType, transmissionType, odometerKm,
              gpsLatitude, gpsLongitude, gpsAddress, inspectorName,
              serviceOrderId, hasLift = false, roadTestPossible = false,
              templateId: explicitTemplateId = null,
              vehicleFeatures = null, parameterVersion = 1 } = vehicleData;

      // For v2 inspections, default to empty features (not null) so feature-filtered
      // params start excluded and inspector toggles ON what they see on the car.
      // null = "features not set yet, include everything" (backward compat for v1).
      const effectiveFeatures = parameterVersion >= 2 && !vehicleFeatures ? {} : vehicleFeatures;

      // If linked to a service order, return existing inspection instead of creating a duplicate
      if (serviceOrderId) {
        const existing = await Inspection.findOne({ where: { service_order_id: serviceOrderId } });
        if (existing) {
          await transaction.rollback();
          logger.info(`Inspection already exists for order ${serviceOrderId}, returning existing #${existing.id}`);
          return Result.success({
            id: existing.id,
            uuid: existing.uuid,
            status: existing.status,
            resumed: true
          });
        }
      }

      // Determine inspection template:
      // Priority 1: explicit templateId passed in request (manual override)
      // Priority 2: inferred from service order's plan type
      // Priority 3: default to used_car
      let templateId = 1;
      let templateSlug = 'used_car';

      if (explicitTemplateId) {
        // Caller explicitly chose a template — resolve its slug
        try {
          const tpl = await InspectionTemplate.findByPk(explicitTemplateId, { attributes: ['id', 'slug'] });
          if (tpl) { templateId = tpl.id; templateSlug = tpl.slug; }
        } catch (e) {
          logger.warn(`Could not resolve explicit templateId ${explicitTemplateId}, defaulting to used_car`);
        }
      } else if (serviceOrderId) {
        try {
          const order = await ServiceOrder.findByPk(serviceOrderId, { attributes: ['service_plan_id'] });
          if (order) {
            const plan = await ServicePlan.findByPk(order.service_plan_id, { attributes: ['service_type'] });
            if (plan?.service_type === NEW_CAR_PDI_SERVICE_TYPE) {
              templateId = 2;
              templateSlug = 'new_car_pdi';
            }
          }
        } catch (e) {
          logger.warn(`Could not resolve template from service order ${serviceOrderId}, defaulting to used_car`);
        }
      }

      // Get applicable parameters (fuel + transmission + context + template + feature + version filtered)
      const paramResult = await parameterService.getApplicableParameters(fuelType, transmissionType, {
        hasLift, roadTestPossible, templateSlug, parameterVersion, vehicleFeatures: effectiveFeatures
      });
      if (!paramResult.isSuccess) {
        await transaction.rollback();
        return Result.failure('Failed to load parameters');
      }

      const modules = paramResult.value;
      const allParamIds = [];
      modules.forEach(mod => {
        mod.SubGroups.forEach(sg => {
          sg.Parameters.forEach(p => allParamIds.push(p.id));
        });
      });

      // Create the inspection
      const inspection = await Inspection.create({
        uuid: uuidv4(),
        technician_id: technicianId,
        service_order_id: serviceOrderId || null,
        template_id: templateId,
        parameter_version: parameterVersion,
        vehicle_reg_number: vehicleRegNumber,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_year: vehicleYear,
        fuel_type: fuelType,
        transmission_type: transmissionType,
        odometer_km: odometerKm,
        gps_latitude: gpsLatitude,
        gps_longitude: gpsLongitude,
        gps_address: gpsAddress,
        inspector_name: inspectorName || null,
        has_lift: hasLift ? 1 : 0,
        road_test_possible: roadTestPossible ? 1 : 0,
        vehicle_features: effectiveFeatures,
        status: 'in_progress',
        total_applicable_params: allParamIds.length,
        total_answered_params: 0,
        started_at: new Date(),
        created_at: new Date()
      }, { transaction });

      // Pre-populate response rows (unanswered)
      const responseRows = allParamIds.map(paramId => ({
        inspection_id: inspection.id,
        parameter_id: paramId,
        selected_option: null,
        severity_score: null,
        notes: null,
        created_at: new Date()
      }));

      await InspectionResponse.bulkCreate(responseRows, { transaction });

      // Auto-populate vehicle valuation (non-blocking — won't fail inspection creation)
      try {
        const valuation = await this.resolveVehicleValuation(
          vehicleMake, vehicleModel, vehicleYear, serviceOrderId
        );
        if (valuation.exShowroomPrice || valuation.repairTier) {
          await inspection.update({
            ex_showroom_price: valuation.exShowroomPrice || null,
            vehicle_market_value: valuation.marketValue || null,
            repair_cost_tier: valuation.repairTier || null,
          }, { transaction });
        }
        logger.info(`Valuation: tier=${valuation.repairTier}, exShowroom=${valuation.exShowroomPrice}, marketValue=${valuation.marketValue}`);
      } catch (valErr) {
        logger.warn('Vehicle valuation lookup failed (non-blocking):', valErr.message);
      }

      await transaction.commit();

      logger.info(`Inspection created: ${inspection.uuid} with ${allParamIds.length} params`);
      return Result.success({
        id: inspection.id,
        uuid: inspection.uuid,
        totalApplicableParams: allParamIds.length,
        status: inspection.status
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Create inspection error:', error);
      return Result.failure(error.message || 'Failed to create inspection');
    }
  }

  /**
   * Get a full inspection with responses grouped by module/subgroup.
   */
  async getById(inspectionId) {
    try {
      const inspection = await Inspection.findByPk(inspectionId, {
        include: [
          {
            model: InspectionTemplate,
            as: 'Template',
            attributes: ['id', 'name', 'slug']
          },
          {
            model: User,
            as: 'Technician',
            attributes: ['id', 'first_name', 'last_name', 'email']
          },
          {
            model: InspectionResponse,
            as: 'Responses',
            include: [
              {
                model: InspectionParameter,
                as: 'Parameter',
                include: [{
                  model: InspectionSubGroup,
                  as: 'SubGroup',
                  include: [{
                    model: InspectionModule,
                    as: 'Module'
                  }]
                }]
              },
              {
                model: InspectionPhoto,
                as: 'Photos'
              }
            ]
          },
          {
            model: InspectionScore,
            as: 'Score'
          },
          {
            model: InspectionCertificate,
            as: 'Certificate'
          }
        ]
      });

      if (!inspection) {
        return Result.failure('Inspection not found');
      }

      // Group responses by module > sub-group
      const grouped = this.groupResponsesByModule(inspection);

      return Result.success(grouped);
    } catch (error) {
      logger.error('Get inspection error:', error);
      return Result.failure(error.message || 'Failed to get inspection');
    }
  }

  /**
   * Save a single response for one parameter.
   */
  async saveResponse(inspectionId, parameterId, selectedOption, notes) {
    try {
      const response = await InspectionResponse.findOne({
        where: { inspection_id: inspectionId, parameter_id: parameterId }
      });

      if (!response) {
        return Result.failure('Response row not found for this parameter');
      }

      // Look up the severity score from the parameter definition
      let severityScore = null;
      if (selectedOption) {
        const param = await InspectionParameter.findByPk(parameterId);
        if (param) {
          // Validate: ensure selected option exists for this parameter
          const optionLabel = param[`option_${selectedOption}`];
          if (!optionLabel) {
            return Result.failure(`Invalid option ${selectedOption} for parameter ${parameterId} — only options with labels are valid`);
          }
          severityScore = param[`score_${selectedOption}`];
        }
      }

      const wasUnanswered = response.selected_option === null;
      const isNowAnswered = selectedOption !== null;

      await response.update({
        selected_option: selectedOption,
        severity_score: severityScore,
        notes: notes !== undefined ? notes : response.notes,
        modified_at: new Date()
      });

      // Update answered count
      if (wasUnanswered && isNowAnswered) {
        await Inspection.increment('total_answered_params', {
          by: 1,
          where: { id: inspectionId }
        });
      } else if (!wasUnanswered && !isNowAnswered) {
        await Inspection.decrement('total_answered_params', {
          by: 1,
          where: { id: inspectionId }
        });
      }

      return Result.success({
        parameterId,
        selectedOption,
        severityScore
      });
    } catch (error) {
      logger.error('Save response error:', error);
      return Result.failure(error.message || 'Failed to save response');
    }
  }

  /**
   * Save multiple responses in a batch (transaction).
   */
  async saveBatchResponses(inspectionId, responses) {
    const transaction = await sequelize.transaction();
    try {
      let answeredDelta = 0;

      for (const resp of responses) {
        const existing = await InspectionResponse.findOne({
          where: { inspection_id: inspectionId, parameter_id: resp.parameterId },
          transaction
        });

        if (!existing) continue;

        let severityScore = null;
        if (resp.selectedOption) {
          const param = await InspectionParameter.findByPk(resp.parameterId, { transaction });
          if (param) {
            severityScore = param[`score_${resp.selectedOption}`];
          }
        }

        const wasUnanswered = existing.selected_option === null;
        const isNowAnswered = resp.selectedOption !== null;

        await existing.update({
          selected_option: resp.selectedOption,
          severity_score: severityScore,
          notes: resp.notes !== undefined ? resp.notes : existing.notes,
          modified_at: new Date()
        }, { transaction });

        if (wasUnanswered && isNowAnswered) answeredDelta++;
        else if (!wasUnanswered && !isNowAnswered) answeredDelta--;
      }

      if (answeredDelta !== 0) {
        if (answeredDelta > 0) {
          await Inspection.increment('total_answered_params', {
            by: answeredDelta,
            where: { id: inspectionId },
            transaction
          });
        } else {
          await Inspection.decrement('total_answered_params', {
            by: Math.abs(answeredDelta),
            where: { id: inspectionId },
            transaction
          });
        }
      }

      await transaction.commit();
      return Result.success({ updated: responses.length });
    } catch (error) {
      await transaction.rollback();
      logger.error('Save batch responses error:', error);
      return Result.failure(error.message || 'Failed to save batch responses');
    }
  }

  /**
   * Complete an inspection: validate all answered, trigger scoring.
   */
  async complete(inspectionId) {
    try {
      const inspection = await Inspection.findByPk(inspectionId);
      if (!inspection) {
        return Result.failure('Inspection not found');
      }

      // Check that all params are answered
      const unansweredCount = await InspectionResponse.count({
        where: {
          inspection_id: inspectionId,
          selected_option: null
        }
      });

      if (unansweredCount > 0) {
        return Result.failure(`${unansweredCount} parameters still unanswered`);
      }

      // Mark as completed
      await inspection.update({
        status: 'completed',
        completed_at: new Date(),
        modified_at: new Date()
      });

      // Trigger scoring
      const scoreResult = await scoringService.calculateScores(inspectionId);
      if (!scoreResult.isSuccess) {
        return Result.failure('Inspection completed but scoring failed: ' + scoreResult.error);
      }

      // Update status to scored
      await inspection.update({
        status: 'scored',
        modified_at: new Date()
      });

      return Result.success({
        inspectionId,
        status: 'scored',
        score: scoreResult.value
      });
    } catch (error) {
      logger.error('Complete inspection error:', error);
      return Result.failure(error.message || 'Failed to complete inspection');
    }
  }

  /**
   * List inspections with pagination and optional filters.
   */
  async list(filters = {}) {
    try {
      const { technicianId, status, page = 1, limit = 20 } = filters;

      const where = {};
      if (technicianId) where.technician_id = technicianId;
      if (status) where.status = status;

      const offset = (page - 1) * limit;

      const { count, rows } = await Inspection.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'Technician',
            attributes: ['id', 'first_name', 'last_name', 'email']
          },
          {
            model: InspectionScore,
            as: 'Score',
            attributes: ['rating', 'certification', 'has_red_flags', 'total_repair_cost']
          },
          {
            model: InspectionTemplate,
            as: 'Template',
            attributes: ['id', 'name', 'slug']
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      return Result.success({
        inspections: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      });
    } catch (error) {
      logger.error('List inspections error:', error);
      return Result.failure(error.message || 'Failed to list inspections');
    }
  }

  /**
   * Update inspection context (lift / road test) and reconcile response rows.
   * Adding context back creates new response rows; removing deletes unanswered ones
   * (answered ones are preserved so no data is lost).
   */
  async updateContext(inspectionId, hasLift, roadTestPossible) {
    const transaction = await sequelize.transaction();
    try {
      const inspection = await Inspection.findByPk(inspectionId, { transaction });
      if (!inspection) {
        await transaction.rollback();
        return Result.failure('Inspection not found');
      }

      const oldHasLift = !!inspection.has_lift;
      const oldRoadTest = !!inspection.road_test_possible;

      // Determine what changed
      const liftTurnedOff  = oldHasLift && !hasLift;
      const liftTurnedOn   = !oldHasLift && hasLift;
      const roadTurnedOff  = oldRoadTest && !roadTestPossible;
      const roadTurnedOn   = !oldRoadTest && roadTestPossible;

      let applicableDelta = 0;

      // Helper: get param IDs by context_filter that are fuel/trans applicable for this inspection
      const getContextParamIds = async (contextValue) => {
        const params = await InspectionParameter.findAll({
          where: { context_filter: contextValue, is_active: 1 },
          attributes: ['id', 'fuel_filter', 'transmission_filter'],
          transaction
        });
        return params
          .filter(p =>
            parameterService.matchesFilter(p.fuel_filter, inspection.fuel_type) &&
            parameterService.matchesFilter(p.transmission_filter, inspection.transmission_type)
          )
          .map(p => p.id);
      };

      // Remove unanswered responses when context turned OFF
      if (liftTurnedOff || roadTurnedOff) {
        const filterVal = liftTurnedOff ? 'lift_required' : 'road_test_required';
        const paramIds = await getContextParamIds(filterVal);
        if (paramIds.length) {
          const deleted = await InspectionResponse.destroy({
            where: {
              inspection_id: inspectionId,
              parameter_id: paramIds,
              selected_option: null  // only delete unanswered — preserve inspector's work
            },
            transaction
          });
          applicableDelta -= deleted;
        }
      }

      // Add new response rows when context turned ON
      if (liftTurnedOn || roadTurnedOn) {
        const filterVal = liftTurnedOn ? 'lift_required' : 'road_test_required';
        const paramIds = await getContextParamIds(filterVal);
        if (paramIds.length) {
          // Only insert rows that don't already exist
          const existing = await InspectionResponse.findAll({
            where: { inspection_id: inspectionId, parameter_id: paramIds },
            attributes: ['parameter_id'],
            transaction
          });
          const existingIds = new Set(existing.map(r => r.parameter_id));
          const toCreate = paramIds
            .filter(id => !existingIds.has(id))
            .map(id => ({
              inspection_id: inspectionId,
              parameter_id: id,
              selected_option: null,
              severity_score: null,
              notes: null,
              created_at: new Date()
            }));
          if (toCreate.length) {
            await InspectionResponse.bulkCreate(toCreate, { transaction });
            applicableDelta += toCreate.length;
          }
        }
      }

      // Update inspection record
      await inspection.update({
        has_lift: hasLift ? 1 : 0,
        road_test_possible: roadTestPossible ? 1 : 0,
        total_applicable_params: inspection.total_applicable_params + applicableDelta,
        modified_at: new Date()
      }, { transaction });

      await transaction.commit();

      return Result.success({
        hasLift,
        roadTestPossible,
        totalApplicableParams: inspection.total_applicable_params + applicableDelta,
        delta: applicableDelta
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Update context error:', error);
      return Result.failure(error.message || 'Failed to update inspection context');
    }
  }

  /**
   * Update vehicle features mid-inspection and reconcile response rows.
   * Similar to updateContext: adds/removes responses based on feature changes.
   */
  async updateFeatures(inspectionId, vehicleFeatures) {
    const transaction = await sequelize.transaction();
    try {
      const inspection = await Inspection.findByPk(inspectionId, { transaction });
      if (!inspection) {
        await transaction.rollback();
        return Result.failure('Inspection not found');
      }

      // Only relevant for v2 (composite) inspections
      if (inspection.parameter_version < 2) {
        await inspection.update({ vehicle_features: vehicleFeatures, modified_at: new Date() }, { transaction });
        await transaction.commit();
        return Result.success({ vehicleFeatures, delta: 0 });
      }

      const oldFeatures = inspection.vehicle_features || {};
      let applicableDelta = 0;

      // Find all feature-filtered params applicable to this inspection's fuel/trans/template
      const templateSlug = inspection.template_id === 2 ? 'new_car_pdi' : 'used_car';
      const featureParams = await InspectionParameter.findAll({
        where: {
          is_active: 1,
          is_composite: 1,
          feature_filter: { [Op.ne]: null }
        },
        attributes: ['id', 'feature_filter', 'fuel_filter', 'transmission_filter', 'template_filter', 'context_filter'],
        transaction
      });

      const applicableFeatureParams = featureParams.filter(p =>
        parameterService.matchesFilter(p.fuel_filter, inspection.fuel_type) &&
        parameterService.matchesFilter(p.transmission_filter, inspection.transmission_type) &&
        parameterService.matchesTemplateFilter(p.template_filter, templateSlug) &&
        parameterService.matchesContextFilter(p.context_filter, !!inspection.has_lift, !!inspection.road_test_possible)
      );

      for (const param of applicableFeatureParams) {
        const wasApplicable = parameterService.matchesFeatureFilter(param.feature_filter, oldFeatures);
        const isNowApplicable = parameterService.matchesFeatureFilter(param.feature_filter, vehicleFeatures);

        if (wasApplicable && !isNowApplicable) {
          // Feature removed — delete unanswered response
          const deleted = await InspectionResponse.destroy({
            where: {
              inspection_id: inspectionId,
              parameter_id: param.id,
              selected_option: null
            },
            transaction
          });
          applicableDelta -= deleted;
        } else if (!wasApplicable && isNowApplicable) {
          // Feature added — create response row if not exists
          const existing = await InspectionResponse.findOne({
            where: { inspection_id: inspectionId, parameter_id: param.id },
            transaction
          });
          if (!existing) {
            await InspectionResponse.create({
              inspection_id: inspectionId,
              parameter_id: param.id,
              selected_option: null,
              severity_score: null,
              notes: null,
              created_at: new Date()
            }, { transaction });
            applicableDelta++;
          }
        }
      }

      await inspection.update({
        vehicle_features: vehicleFeatures,
        total_applicable_params: inspection.total_applicable_params + applicableDelta,
        modified_at: new Date()
      }, { transaction });

      await transaction.commit();

      return Result.success({
        vehicleFeatures,
        totalApplicableParams: inspection.total_applicable_params + applicableDelta,
        delta: applicableDelta
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Update features error:', error);
      return Result.failure(error.message || 'Failed to update vehicle features');
    }
  }

  /**
   * Resolve vehicle market value and repair tier from make/model/year.
   * Looks up ex-showroom price from vehicle_specifications, applies IRDAI depreciation.
   */
  async resolveVehicleValuation(vehicleMake, vehicleModel, vehicleYear, serviceOrderId) {
    // 1. Determine repair tier from brand/model
    const tierInfo = getRepairTier(vehicleMake, vehicleModel);
    const repairTier = tierInfo.tier;

    // 2. Look up ex-showroom price
    let exShowroomPrice = null;

    // Try from vehicle_specifications via make/model
    if (vehicleMake && vehicleModel) {
      try {
        exShowroomPrice = await vehicleDetailService.lookupExShowroomPrice(vehicleMake, vehicleModel);
      } catch (e) {
        logger.warn(`Ex-showroom price lookup failed for ${vehicleMake} ${vehicleModel}:`, e.message);
      }
    }

    // Fallback: try from service order's linked vehicle detail
    if (!exShowroomPrice && serviceOrderId) {
      try {
        const order = await ServiceOrder.findByPk(serviceOrderId, { attributes: ['registration_number'] });
        if (order?.registration_number) {
          const VehicleDetail = require('../models/vehicle-detail.model');
          const vd = await VehicleDetail.findOne({
            where: { registration_number: order.registration_number },
            attributes: ['ex_showroom_price'],
            order: [['created_at', 'DESC']]
          });
          if (vd?.ex_showroom_price) {
            exShowroomPrice = parseFloat(vd.ex_showroom_price);
          }
        }
      } catch (e) {
        logger.warn('Service order vehicle detail lookup failed:', e.message);
      }
    }

    // 3. Calculate depreciated market value
    let marketValue = null;
    if (exShowroomPrice && exShowroomPrice > 0) {
      const currentYear = new Date().getFullYear();
      const vehicleAge = vehicleYear ? (currentYear - vehicleYear) : 5;
      marketValue = calculateMarketValue(exShowroomPrice, vehicleAge);
    }

    return { exShowroomPrice, marketValue, repairTier };
  }

  /**
   * Group responses by module and sub-group for the frontend.
   */
  groupResponsesByModule(inspection) {
    const data = inspection.toJSON();
    const moduleMap = {};

    for (const resp of data.Responses || []) {
      const param = resp.Parameter;
      if (!param || !param.SubGroup || !param.SubGroup.Module) continue;

      const mod = param.SubGroup.Module;
      const sg = param.SubGroup;

      if (!moduleMap[mod.id]) {
        moduleMap[mod.id] = {
          id: mod.id,
          name: mod.name,
          slug: mod.slug,
          icon: mod.icon,
          weight: mod.weight,
          sort_order: mod.sort_order,
          subGroups: {}
        };
      }

      if (!moduleMap[mod.id].subGroups[sg.id]) {
        moduleMap[mod.id].subGroups[sg.id] = {
          id: sg.id,
          name: sg.name,
          sort_order: sg.sort_order,
          responses: []
        };
      }

      // Parse sub_items_json (MySQL may return string)
      let subItems = param.sub_items_json || null;
      if (typeof subItems === 'string') {
        try { subItems = JSON.parse(subItems); } catch (e) { subItems = null; }
      }

      moduleMap[mod.id].subGroups[sg.id].responses.push({
        responseId: resp.id,
        parameterId: param.id,
        paramNumber: param.param_number,
        paramName: param.name,
        paramDetail: param.detail,
        inputType: param.input_type,
        isComposite: !!param.is_composite,
        subItems: subItems,
        featureFilter: param.feature_filter || null,
        options: [param.option_1, param.option_2, param.option_3, param.option_4, param.option_5].filter(Boolean),
        scores: [param.score_1, param.score_2, param.score_3, param.score_4, param.score_5].filter(s => s != null),
        isRedFlag: param.is_red_flag,
        contextFilter: param.context_filter || null,
        selectedOption: resp.selected_option,
        severityScore: resp.severity_score,
        notes: resp.notes,
        photos: (resp.Photos || []).map(p => ({
          id: p.id,
          filePath: this._resolvePhotoUrl(p.file_path),
          fileName: p.file_name,
          fileSize: p.file_size
        }))
      });
    }

    // Convert maps to sorted arrays
    const modules = Object.values(moduleMap)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mod => ({
        ...mod,
        subGroups: Object.values(mod.subGroups)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(sg => ({
            ...sg,
            responses: sg.responses.sort((a, b) => a.paramNumber - b.paramNumber)
          }))
      }));

    // Compute per-module progress
    modules.forEach(mod => {
      let total = 0;
      let answered = 0;
      mod.subGroups.forEach(sg => {
        total += sg.responses.length;
        answered += sg.responses.filter(r => r.selectedOption !== null).length;
      });
      mod.totalParams = total;
      mod.answeredParams = answered;
    });

    return {
      id: data.id,
      uuid: data.uuid,
      templateId: data.template_id || 1,
      templateSlug: data.Template?.slug || 'used_car',
      templateName: data.Template?.name || 'Used Vehicle Inspection',
      isPDI: data.Template?.slug === 'new_car_pdi',
      technician: data.Technician,
      vehicleRegNumber: data.vehicle_reg_number,
      vehicleMake: data.vehicle_make,
      vehicleModel: data.vehicle_model,
      vehicleYear: data.vehicle_year,
      fuelType: data.fuel_type,
      transmissionType: data.transmission_type,
      odometerKm: data.odometer_km,
      gpsLatitude: data.gps_latitude,
      gpsLongitude: data.gps_longitude,
      gpsAddress: data.gps_address,
      inspectorName: data.inspector_name,
      inspectorPhotoPath: data.inspector_photo_path,
      vehiclePhotoPath: data.vehicle_photo_path,
      status: data.status,
      parameterVersion: data.parameter_version || 1,
      hasLift: !!data.has_lift,
      roadTestPossible: !!data.road_test_possible,
      vehicleFeatures: data.vehicle_features || null,
      totalApplicableParams: data.total_applicable_params,
      totalAnsweredParams: data.total_answered_params,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      modules,
      score: data.Score ? this.transformScore(data.Score) : null,
      certificate: data.Certificate ? {
        id: data.Certificate.id,
        inspectionId: data.Certificate.inspection_id,
        certificateNumber: data.Certificate.certificate_number,
        qrCodeData: data.Certificate.qr_code_data,
        rating: data.Certificate.rating,
        certification: data.Certificate.certification,
        issuedAt: data.Certificate.issued_at,
        expiresAt: data.Certificate.expires_at
      } : null
    };
  }

  _resolvePhotoUrl(filePath) {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5001';
    // Handle old absolute paths (e.g. /Users/.../uploads/file.jpg) and new relative paths (uploads/file.jpg)
    const filename = path.basename(filePath);
    return `${serverUrl}/uploads/${filename}`;
  }

  transformScore(score) {
    const moduleRisks = {};
    const riskColumns = {
      engine_risk: 'engine_system',
      transmission_risk: 'transmission_drivetrain',
      structural_risk: 'structural_integrity',
      paint_risk: 'paint_panel',
      suspension_risk: 'suspension_brakes',
      electrical_risk: 'electrical_electronics',
      interior_risk: 'interior_safety',
      documents_risk: 'documentation',
      road_test_risk: 'road_test',
    };

    for (const [col, slug] of Object.entries(riskColumns)) {
      // Include 0-risk modules (perfect score) — only skip if column is truly NULL
      if (score[col] != null) {
        moduleRisks[slug] = parseFloat(score[col]);
      }
    }

    // Safe-parse JSON fields (MySQL may return strings)
    let breakdown = score.repair_cost_breakdown || {};
    if (typeof breakdown === 'string') {
      try { breakdown = JSON.parse(breakdown); } catch (e) { breakdown = {}; }
    }

    let redFlagParams = score.red_flag_params || [];
    if (typeof redFlagParams === 'string') {
      try { redFlagParams = JSON.parse(redFlagParams); } catch (e) { redFlagParams = []; }
    }

    return {
      vri: parseFloat(score.vri || 0),
      baseRating: parseFloat(score.base_rating || score.rating || 0),
      rating: parseFloat(score.rating || 0),
      certification: score.certification,
      hasRedFlags: !!score.has_red_flags,
      redFlagPenalty: parseInt(score.red_flag_penalty || 0),
      redFlagParams,
      totalRepairCost: parseFloat(score.total_repair_cost || 0),
      repairCostBreakdown: breakdown,
      moduleRisks
    };
  }
}

module.exports = new InspectionService();
