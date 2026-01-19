const { Op } = require('sequelize');
const Result = require('../utils/result');
const logger = require('../config/logger');
const { VehicleDetail, VehicleSpecDiscrepancy, User } = require('../models');
const VehicleSpecification = require('../models/vehicle-specification.model');
const resaleValueService = require('./resale-value.service');

/**
 * Discrepancy Service
 * Handles user-flagged vehicle specification discrepancies
 */
class DiscrepancyService {

  /**
   * Create a discrepancy report
   * If user selects a new spec, creates a new vehicle_detail record with corrected data
   * @param {Object} data - Discrepancy data
   * @param {number} data.vehicleDetailId - Current vehicle detail ID
   * @param {number} data.newSpecId - New spec ID selected by user (null if car_not_found)
   * @param {boolean} data.carNotFound - True if user's car not in the list
   * @param {string} data.userNotes - Optional notes from user
   * @param {number} userId - User ID
   */
  async createDiscrepancyAsync(data, userId) {
    try {
      const { vehicleDetailId, newSpecId, carNotFound, userNotes } = data;

      // Get current vehicle detail
      const oldVehicleDetail = await VehicleDetail.findByPk(vehicleDetailId);
      if (!oldVehicleDetail) {
        return Result.failure('Vehicle detail not found');
      }

      // Get old spec info
      let oldSpec = null;
      if (oldVehicleDetail.matched_spec_id) {
        oldSpec = await VehicleSpecification.findByPk(oldVehicleDetail.matched_spec_id);
      }

      // Prepare old spec info
      const oldMake = oldSpec?.naming_make || oldVehicleDetail.maker_description;
      const oldModel = oldSpec?.naming_model || oldVehicleDetail.maker_model;
      const oldVersion = oldSpec?.naming_version || oldVehicleDetail.variant;

      let newVehicleDetailId = null;
      let newSpec = null;
      let newMake = null;
      let newModel = null;
      let newVersion = null;

      // If user selected a new spec (not car_not_found), create new vehicle detail
      if (!carNotFound && newSpecId) {
        newSpec = await VehicleSpecification.findByPk(newSpecId);
        if (!newSpec) {
          return Result.failure('Selected specification not found');
        }

        newMake = newSpec.naming_make;
        newModel = newSpec.naming_model;
        newVersion = newSpec.naming_version;

        // Create a copy of the old vehicle detail with new spec
        const newVehicleDetail = await this.createCorrectedVehicleDetail(
          oldVehicleDetail,
          newSpec,
          userId
        );
        newVehicleDetailId = newVehicleDetail.id;
      }

      // Create discrepancy record
      const discrepancy = await VehicleSpecDiscrepancy.create({
        user_id: userId,
        registration_number: oldVehicleDetail.registration_number,
        old_vehicle_detail_id: vehicleDetailId,
        old_matched_spec_id: oldVehicleDetail.matched_spec_id,
        old_make: oldMake,
        old_model: oldModel,
        old_version: oldVersion,
        new_vehicle_detail_id: newVehicleDetailId,
        new_matched_spec_id: newSpecId || null,
        new_make: newMake,
        new_model: newModel,
        new_version: newVersion,
        car_not_found: carNotFound || false,
        user_notes: userNotes || null
      });

      logger.info(`Discrepancy created: id=${discrepancy.id}, vehicle=${oldVehicleDetail.registration_number}, carNotFound=${carNotFound}`);

      return Result.success({
        discrepancyId: discrepancy.id,
        newVehicleDetailId: newVehicleDetailId,
        message: carNotFound
          ? 'Discrepancy flagged successfully. We will review and update our database.'
          : 'Report regenerated with corrected specification.'
      });

    } catch (error) {
      logger.error('Error creating discrepancy:', error);
      return Result.failure(error.message || 'Failed to create discrepancy');
    }
  }

  /**
   * Create a corrected vehicle detail by copying old one with new spec
   */
  async createCorrectedVehicleDetail(oldVehicleDetail, newSpec, userId) {
    // Get next ID
    const maxVehicle = await VehicleDetail.findOne({
      attributes: [[require('sequelize').fn('MAX', require('sequelize').col('id')), 'maxId']],
      raw: true
    });
    const nextId = (maxVehicle && maxVehicle.maxId) ? maxVehicle.maxId + 1 : 1;

    // Get ex-showroom price from new spec
    const exShowroomPrice = this.parsePrice(newSpec.price_breakdown_ex_showroom_price || newSpec.naming_price);

    // Calculate year from manufacturing date
    const year = this.extractYear(oldVehicleDetail.manufacturing_date_formatted);

    // Calculate resale price range
    let resalePriceRange = null;
    if (exShowroomPrice && year) {
      const vehicleAge = new Date().getFullYear() - year;
      const state = this.extractState(oldVehicleDetail.registered_at);
      const ownerNumber = parseInt(oldVehicleDetail.owner_number) || 1;
      const kmsDriven = oldVehicleDetail.kms_driven || 0;

      const resaleResult = resaleValueService.calculateResaleValue({
        exShowroomPrice,
        vehicleAge,
        make: newSpec.naming_make,
        state,
        ownerNumber,
        kmsDriven
      });

      if (resaleResult.isSuccess) {
        resalePriceRange = resaleResult.value;
      }
    }

    // Create matching log for the manual correction
    const matchingLog = {
      source: 'user_correction',
      timestamp: new Date().toISOString(),
      input: {
        make: newSpec.naming_make,
        model: newSpec.naming_model,
        version: newSpec.naming_version
      },
      correctedFrom: {
        specId: oldVehicleDetail.matched_spec_id,
        vehicleDetailId: oldVehicleDetail.id
      },
      matched: {
        specId: newSpec.id,
        namingVersionId: newSpec.naming_versionId,
        model: newSpec.naming_model,
        version: newSpec.naming_version
      },
      score: 1000 // Manual correction gets max score
    };

    // Copy all fields from old vehicle detail
    const oldData = oldVehicleDetail.toJSON();
    delete oldData.id;
    delete oldData.created_at;
    delete oldData.updated_at;

    // Create new vehicle detail with corrected spec
    const newVehicleDetail = await VehicleDetail.create({
      ...oldData,
      id: nextId,
      user_id: userId,
      matched_spec_id: newSpec.id,
      matching_score: 1000,
      matching_log: matchingLog,
      ex_showroom_price: exShowroomPrice,
      resale_price_range: resalePriceRange ? JSON.stringify(resalePriceRange) : null,
      resale_calculation_source: 'user',
      created_at: new Date()
    });

    logger.info(`Created corrected vehicle detail: id=${newVehicleDetail.id}, spec_id=${newSpec.id}`);

    return newVehicleDetail;
  }

  /**
   * Parse price string to number
   */
  parsePrice(priceStr) {
    if (!priceStr) return null;
    // Remove currency symbols, commas, and 'Rs' prefix
    const cleaned = String(priceStr).replace(/[₹,Rs\s]/gi, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Extract year from manufacturing date formatted string
   */
  extractYear(manufacturingDateFormatted) {
    if (!manufacturingDateFormatted) return null;
    // Format: "2023-01" or "01/2023" or "2023"
    const match = manufacturingDateFormatted.match(/(\d{4})/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract state from registered_at string
   */
  extractState(registeredAt) {
    if (!registeredAt) return null;
    // Format: "RAJKOT, Gujarat" -> "Gujarat"
    const parts = registeredAt.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim().toLowerCase();
    }
    return registeredAt.toLowerCase();
  }

  /**
   * List all discrepancies with pagination
   */
  async listDiscrepanciesAsync(take = 10, skip = 0) {
    try {
      const { count, rows } = await VehicleSpecDiscrepancy.findAndCountAll({
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['id', 'email', 'first_name', 'last_name']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: take,
        offset: skip
      });

      const discrepancies = rows.map(d => ({
        id: d.id,
        registrationNumber: d.registration_number,
        user: d.User ? {
          id: d.User.id,
          email: d.User.email,
          name: [d.User.first_name, d.User.last_name].filter(Boolean).join(' ') || d.User.email
        } : null,
        oldVehicleDetailId: d.old_vehicle_detail_id,
        oldSpec: {
          id: d.old_matched_spec_id,
          make: d.old_make,
          model: d.old_model,
          version: d.old_version
        },
        newVehicleDetailId: d.new_vehicle_detail_id,
        newSpec: d.car_not_found ? null : {
          id: d.new_matched_spec_id,
          make: d.new_make,
          model: d.new_model,
          version: d.new_version
        },
        carNotFound: d.car_not_found,
        userNotes: d.user_notes,
        createdAt: d.created_at
      }));

      return Result.success({
        discrepancies,
        total: count,
        take,
        skip
      });

    } catch (error) {
      logger.error('Error listing discrepancies:', error);
      return Result.failure(error.message || 'Failed to list discrepancies');
    }
  }

  /**
   * Check discrepancy status for a vehicle detail
   * Returns info about whether this report was flagged or is a corrected report
   */
  async getByVehicleDetailIdAsync(vehicleDetailId) {
    try {
      // Check if this vehicle detail has been flagged (is the old report)
      const flaggedDiscrepancy = await VehicleSpecDiscrepancy.findOne({
        where: { old_vehicle_detail_id: vehicleDetailId },
        order: [['created_at', 'DESC']]
      });

      // Check if this vehicle detail was created from a discrepancy (is the new/corrected report)
      const correctedFromDiscrepancy = await VehicleSpecDiscrepancy.findOne({
        where: { new_vehicle_detail_id: vehicleDetailId }
      });

      // Determine button visibility and status
      let canFlag = true;
      let status = null;
      let correctionInfo = null;

      if (correctedFromDiscrepancy) {
        // This is a corrected report - don't show flag button at all
        canFlag = false;
        status = 'corrected_report';
        correctionInfo = {
          originalVehicleDetailId: correctedFromDiscrepancy.old_vehicle_detail_id,
          correctedAt: correctedFromDiscrepancy.created_at,
          originalMake: correctedFromDiscrepancy.old_make,
          originalModel: correctedFromDiscrepancy.old_model,
          originalVersion: correctedFromDiscrepancy.old_version
        };
      } else if (flaggedDiscrepancy) {
        // This report was already flagged - show disabled button with "Discrepancy Marked"
        canFlag = false;
        status = 'already_flagged';
      }

      return Result.success({
        canFlag,
        status,
        correctionInfo,
        discrepancy: flaggedDiscrepancy ? {
          id: flaggedDiscrepancy.id,
          carNotFound: flaggedDiscrepancy.car_not_found,
          newVehicleDetailId: flaggedDiscrepancy.new_vehicle_detail_id,
          createdAt: flaggedDiscrepancy.created_at
        } : null
      });

    } catch (error) {
      logger.error('Error getting discrepancy:', error);
      return Result.failure(error.message || 'Failed to get discrepancy');
    }
  }
}

module.exports = new DiscrepancyService();
