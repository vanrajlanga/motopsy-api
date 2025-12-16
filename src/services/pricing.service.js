const PricingSetting = require('../models/pricing-setting.model');
const Result = require('../utils/result');
const logger = require('../config/logger');

// Cache for pricing to avoid repeated DB queries
let pricingCache = {};
let cacheExpiry = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class PricingService {
  /**
   * Get all pricing settings
   */
  async getAllPricingAsync() {
    try {
      const settings = await PricingSetting.findAll({
        order: [['id', 'ASC']]
      });

      return Result.success(settings.map(s => this.transformToDto(s)));
    } catch (error) {
      logger.error('Get all pricing error:', error);
      return Result.failure(error.message || 'Failed to get pricing settings');
    }
  }

  /**
   * Get pricing by key (e.g., 'vehicle_history_report', 'physical_verification')
   */
  async getPricingByKeyAsync(key) {
    try {
      // Check cache first
      if (pricingCache[key] && cacheExpiry && Date.now() < cacheExpiry) {
        return Result.success(pricingCache[key]);
      }

      const setting = await PricingSetting.findOne({
        where: { setting_key: key, is_active: true }
      });

      if (!setting) {
        // Return default from env if not found
        const defaultAmount = parseInt(process.env.RAZORPAY_AMOUNT) || 799;
        return Result.success({
          key: key,
          name: 'Default Price',
          amount: defaultAmount,
          currency: 'INR',
          isActive: true
        });
      }

      const dto = this.transformToDto(setting);

      // Update cache
      pricingCache[key] = dto;
      cacheExpiry = Date.now() + CACHE_DURATION;

      return Result.success(dto);
    } catch (error) {
      logger.error('Get pricing by key error:', error);
      return Result.failure(error.message || 'Failed to get pricing');
    }
  }

  /**
   * Get the vehicle history report price (main payment amount)
   */
  async getVehicleHistoryPriceAsync() {
    return this.getPricingByKeyAsync('vehicle_history_report');
  }

  /**
   * Get the physical verification price
   */
  async getPhysicalVerificationPriceAsync() {
    return this.getPricingByKeyAsync('physical_verification');
  }

  /**
   * Update pricing setting
   */
  async updatePricingAsync(id, data, userId) {
    try {
      const setting = await PricingSetting.findByPk(id);

      if (!setting) {
        return Result.failure('Pricing setting not found');
      }

      // Update fields
      if (data.amount !== undefined) {
        setting.amount = data.amount;
      }
      if (data.settingName !== undefined) {
        setting.setting_name = data.settingName;
      }
      if (data.description !== undefined) {
        setting.description = data.description;
      }
      if (data.isActive !== undefined) {
        setting.is_active = data.isActive;
      }

      setting.modified_at = new Date();
      setting.modified_by = userId;

      await setting.save();

      // Clear cache
      this.clearCache();

      logger.info(`Pricing setting ${id} updated by user ${userId}`);

      return Result.success(this.transformToDto(setting));
    } catch (error) {
      logger.error('Update pricing error:', error);
      return Result.failure(error.message || 'Failed to update pricing');
    }
  }

  /**
   * Create pricing setting (admin only)
   */
  async createPricingAsync(data, userId) {
    try {
      // Check if key already exists
      const existing = await PricingSetting.findOne({
        where: { setting_key: data.settingKey }
      });

      if (existing) {
        return Result.failure('Pricing setting with this key already exists');
      }

      const setting = await PricingSetting.create({
        setting_key: data.settingKey,
        setting_name: data.settingName,
        amount: data.amount,
        currency: data.currency || 'INR',
        description: data.description,
        is_active: data.isActive !== undefined ? data.isActive : true,
        created_at: new Date(),
        modified_by: userId
      });

      // Clear cache
      this.clearCache();

      logger.info(`Pricing setting ${setting.id} created by user ${userId}`);

      return Result.success(this.transformToDto(setting));
    } catch (error) {
      logger.error('Create pricing error:', error);
      return Result.failure(error.message || 'Failed to create pricing');
    }
  }

  /**
   * Clear the pricing cache
   */
  clearCache() {
    pricingCache = {};
    cacheExpiry = null;
  }

  /**
   * Transform to DTO
   */
  transformToDto(setting) {
    return {
      id: setting.id,
      key: setting.setting_key,
      name: setting.setting_name,
      amount: parseFloat(setting.amount),
      currency: setting.currency,
      description: setting.description,
      isActive: setting.is_active,
      createdAt: setting.created_at,
      modifiedAt: setting.modified_at
    };
  }

  /**
   * Initialize default pricing settings if they don't exist
   */
  async initializeDefaultPricingAsync() {
    try {
      const defaultSettings = [
        {
          setting_key: 'vehicle_history_report',
          setting_name: 'Vehicle History Report',
          amount: parseInt(process.env.RAZORPAY_AMOUNT) || 799,
          currency: 'INR',
          description: 'Price for generating a vehicle history report',
          is_active: true
        },
        {
          setting_key: 'physical_verification',
          setting_name: 'Physical Verification',
          amount: 1499,
          currency: 'INR',
          description: 'Price for physical vehicle verification service',
          is_active: true
        }
      ];

      for (const setting of defaultSettings) {
        const existing = await PricingSetting.findOne({
          where: { setting_key: setting.setting_key }
        });

        if (!existing) {
          await PricingSetting.create({
            ...setting,
            created_at: new Date()
          });
          logger.info(`Created default pricing setting: ${setting.setting_key}`);
        }
      }
    } catch (error) {
      logger.error('Initialize default pricing error:', error);
    }
  }
}

module.exports = new PricingService();
