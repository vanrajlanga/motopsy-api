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
const parameterService = require('./parameter.service');
const scoringService = require('./scoring.service');
const Result = require('../utils/result');
const logger = require('../config/logger');

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
              serviceOrderId } = vehicleData;

      // Get applicable parameters
      const paramResult = await parameterService.getApplicableParameters(fuelType, transmissionType);
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

      moduleMap[mod.id].subGroups[sg.id].responses.push({
        responseId: resp.id,
        parameterId: param.id,
        paramNumber: param.param_number,
        paramName: param.name,
        paramDetail: param.detail,
        inputType: param.input_type,
        options: [param.option_1, param.option_2, param.option_3, param.option_4, param.option_5].filter(Boolean),
        scores: [param.score_1, param.score_2, param.score_3, param.score_4, param.score_5].filter(s => s != null),
        isRedFlag: param.is_red_flag,
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
      const val = parseFloat(score[col] || 0);
      if (val > 0) {
        moduleRisks[slug] = val;
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
      rating: parseFloat(score.rating || 0),
      certification: score.certification,
      hasRedFlags: !!score.has_red_flags,
      redFlagParams,
      totalRepairCost: parseFloat(score.total_repair_cost || 0),
      repairCostBreakdown: breakdown,
      moduleRisks
    };
  }
}

module.exports = new InspectionService();
