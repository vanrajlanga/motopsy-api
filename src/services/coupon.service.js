const Coupon = require('../models/coupon.model');
const CouponUsageHistory = require('../models/coupon-usage-history.model');
const CouponAuditLog = require('../models/coupon-audit-log.model');
const User = require('../models/user.model');
const Result = require('../utils/result');
const logger = require('../config/logger');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { toDataSourceResult } = require('../utils/kendo-datasource');

// Lazy import to avoid circular dependency
let pricingService = null;
const getPricingService = () => {
  if (!pricingService) {
    pricingService = require('./pricing.service');
  }
  return pricingService;
};

class CouponService {
  /**
   * Get all coupons with pagination (admin)
   */
  async getAllCouponsAsync(request) {
    try {
      const result = await toDataSourceResult(Coupon, request, {
        order: [['created_at', 'DESC']],
        transform: (coupon) => this.transformToDto(coupon)
      });

      return result;
    } catch (error) {
      logger.error('Get all coupons error:', error);
      throw error;
    }
  }

  /**
   * Get coupon by ID
   */
  async getByIdAsync(id) {
    try {
      const coupon = await Coupon.findByPk(id);

      if (!coupon) {
        return Result.failure('Coupon not found');
      }

      // Get creator info
      let createdByName = null;
      if (coupon.created_by) {
        const creator = await User.findByPk(coupon.created_by);
        createdByName = creator ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || creator.email : null;
      }

      return Result.success({
        ...this.transformToDto(coupon),
        createdByName
      });
    } catch (error) {
      logger.error('Get coupon by ID error:', error);
      return Result.failure(error.message || 'Failed to get coupon');
    }
  }

  /**
   * Create new coupon (admin)
   */
  async createAsync(request, userId) {
    try {
      const {
        couponName,
        couponCode,
        discountType,
        discountValue,
        description,
        expiryDate,
        maxUses,
        minOrderAmount,
        maxDiscountAmount,
        isActive
      } = request;

      // Validate required fields
      if (!couponName || !couponCode || !discountValue) {
        return Result.failure('Coupon name, code and discount value are required');
      }

      // Check if coupon code already exists
      const existingCoupon = await Coupon.findOne({
        where: { coupon_code: couponCode.toLowerCase().trim() }
      });

      if (existingCoupon) {
        return Result.failure('Coupon code already exists');
      }

      // Create coupon
      const coupon = await Coupon.create({
        coupon_name: couponName,
        coupon_code: couponCode.toLowerCase().trim(),
        discount_type: discountType || 'percentage',
        discount_value: discountValue,
        description: description || null,
        expiry_date: expiryDate || null,
        max_uses: maxUses || null,
        current_uses: 0,
        min_order_amount: minOrderAmount || null,
        max_discount_amount: maxDiscountAmount || null,
        is_active: isActive !== undefined ? isActive : true,
        created_by: userId,
        created_at: new Date()
      });

      // Log audit
      await this.logAudit(coupon.id, 'created', userId, null, this.transformToDto(coupon));

      logger.info(`Coupon created: ${coupon.coupon_code} by user ${userId}`);

      return Result.success(this.transformToDto(coupon));
    } catch (error) {
      logger.error('Create coupon error:', error);
      return Result.failure(error.message || 'Failed to create coupon');
    }
  }

  /**
   * Update coupon (admin)
   */
  async updateAsync(request, userId) {
    try {
      const {
        id,
        couponName,
        couponCode,
        discountType,
        discountValue,
        description,
        expiryDate,
        maxUses,
        minOrderAmount,
        maxDiscountAmount,
        isActive
      } = request;

      if (!id) {
        return Result.failure('Coupon ID is required');
      }

      const coupon = await Coupon.findByPk(id);

      if (!coupon) {
        return Result.failure('Coupon not found');
      }

      // Store old values for audit
      const oldValues = this.transformToDto(coupon);

      // Check if new coupon code already exists (if changed)
      if (couponCode && couponCode.toLowerCase().trim() !== coupon.coupon_code) {
        const existingCoupon = await Coupon.findOne({
          where: {
            coupon_code: couponCode.toLowerCase().trim(),
            id: { [Op.ne]: id }
          }
        });

        if (existingCoupon) {
          return Result.failure('Coupon code already exists');
        }
      }

      // Update coupon
      if (couponName !== undefined) coupon.coupon_name = couponName;
      if (couponCode !== undefined) coupon.coupon_code = couponCode.toLowerCase().trim();
      if (discountType !== undefined) coupon.discount_type = discountType;
      if (discountValue !== undefined) coupon.discount_value = discountValue;
      if (description !== undefined) coupon.description = description;
      if (expiryDate !== undefined) coupon.expiry_date = expiryDate;
      if (maxUses !== undefined) coupon.max_uses = maxUses;
      if (minOrderAmount !== undefined) coupon.min_order_amount = minOrderAmount;
      if (maxDiscountAmount !== undefined) coupon.max_discount_amount = maxDiscountAmount;
      if (isActive !== undefined) coupon.is_active = isActive;
      coupon.modified_at = new Date();

      await coupon.save();

      // Log audit
      await this.logAudit(coupon.id, 'updated', userId, oldValues, this.transformToDto(coupon));

      logger.info(`Coupon updated: ${coupon.coupon_code} by user ${userId}`);

      return Result.success(this.transformToDto(coupon));
    } catch (error) {
      logger.error('Update coupon error:', error);
      return Result.failure(error.message || 'Failed to update coupon');
    }
  }

  /**
   * Delete coupon (admin)
   */
  async deleteAsync(id, userId) {
    try {
      const coupon = await Coupon.findByPk(id);

      if (!coupon) {
        return Result.failure('Coupon not found');
      }

      // Store values for audit before deletion
      const oldValues = this.transformToDto(coupon);

      // Log audit before deletion
      await this.logAudit(coupon.id, 'deleted', userId, oldValues, null);

      await coupon.destroy();

      logger.info(`Coupon deleted: ${oldValues.couponCode} by user ${userId}`);

      return Result.success();
    } catch (error) {
      logger.error('Delete coupon error:', error);
      return Result.failure(error.message || 'Failed to delete coupon');
    }
  }

  /**
   * Validate coupon code (public/authenticated)
   * Used during checkout to check if coupon is valid
   */
  async validateCouponAsync(couponCode, userId = null, orderAmount = null) {
    try {
      if (!couponCode) {
        return Result.failure('Coupon code is required');
      }

      const normalizedCode = couponCode.toLowerCase().trim();
      const coupon = await Coupon.findOne({
        where: { coupon_code: normalizedCode }
      });

      if (!coupon) {
        return Result.failure('Invalid coupon code');
      }

      // Check if coupon is active
      if (!coupon.is_active) {
        return Result.failure('This coupon is no longer active');
      }

      // Check expiry date
      if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
        return Result.failure('This coupon has expired');
      }

      // Check max uses
      if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
        return Result.failure('This coupon has reached its maximum usage limit');
      }

      // Get configured amount from pricing service (dynamic pricing)
      const pricingSvc = getPricingService();
      const pricingResult = await pricingSvc.getVehicleHistoryPriceAsync();
      const configuredAmount = pricingResult.isSuccess ? pricingResult.value.amount : (parseInt(process.env.RAZORPAY_AMOUNT) || 799);
      const originalAmount = orderAmount || configuredAmount;

      if (coupon.min_order_amount && originalAmount < parseFloat(coupon.min_order_amount)) {
        return Result.failure(`Minimum order amount of ₹${coupon.min_order_amount} required for this coupon`);
      }

      // Calculate discount
      let discountAmount;
      if (coupon.discount_type === 'percentage') {
        discountAmount = Math.floor(originalAmount * (parseFloat(coupon.discount_value) / 100));
        // Apply max discount cap if set
        if (coupon.max_discount_amount && discountAmount > parseFloat(coupon.max_discount_amount)) {
          discountAmount = parseFloat(coupon.max_discount_amount);
        }
      } else {
        // Fixed discount
        discountAmount = Math.min(parseFloat(coupon.discount_value), originalAmount);
      }

      const finalAmount = originalAmount - discountAmount;

      logger.info(`Coupon validated: ${normalizedCode}, discount: ${discountAmount}, original: ${originalAmount}, final: ${finalAmount}`);

      return Result.success({
        valid: true,
        couponId: coupon.id,
        couponCode: coupon.coupon_code,
        couponName: coupon.coupon_name,
        discountType: coupon.discount_type,
        discountValue: parseFloat(coupon.discount_value),
        discountPercentage: coupon.discount_type === 'percentage' ? parseFloat(coupon.discount_value) : null,
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        description: coupon.description
      });
    } catch (error) {
      logger.error('Validate coupon error:', error);
      return Result.failure(error.message || 'Failed to validate coupon');
    }
  }

  /**
   * Record coupon usage (called after successful payment)
   */
  async recordUsageAsync(couponId, userId, paymentHistoryId, originalAmount, discountAmount, finalAmount) {
    try {
      // Create usage record
      await CouponUsageHistory.create({
        coupon_id: couponId,
        user_id: userId,
        payment_history_id: paymentHistoryId,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        created_at: new Date()
      });

      // Increment coupon usage count
      await Coupon.increment('current_uses', { where: { id: couponId } });

      logger.info(`Coupon usage recorded: couponId=${couponId}, userId=${userId}, paymentId=${paymentHistoryId}`);

      return true;
    } catch (error) {
      logger.error('Record coupon usage error:', error);
      return false;
    }
  }

  /**
   * Get coupon usage history (admin)
   */
  async getUsageHistoryAsync(couponId, request = {}) {
    try {
      const coupon = await Coupon.findByPk(couponId);
      if (!coupon) {
        return Result.failure('Coupon not found');
      }

      const result = await toDataSourceResult(CouponUsageHistory, request, {
        baseWhere: { coupon_id: couponId },
        order: [['created_at', 'DESC']],
        transform: async (usage) => {
          const user = await User.findByPk(usage.user_id);
          return {
            id: usage.id,
            couponId: usage.coupon_id,
            userId: usage.user_id,
            userName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Unknown',
            userEmail: user?.email || 'Unknown',
            paymentHistoryId: usage.payment_history_id,
            originalAmount: parseFloat(usage.original_amount),
            discountAmount: parseFloat(usage.discount_amount),
            finalAmount: parseFloat(usage.final_amount),
            createdAt: usage.created_at
          };
        }
      });

      return Result.success(result);
    } catch (error) {
      logger.error('Get usage history error:', error);
      return Result.failure(error.message || 'Failed to get usage history');
    }
  }

  /**
   * Get coupon audit log (admin)
   */
  async getAuditLogAsync(couponId) {
    try {
      const logs = await CouponAuditLog.findAll({
        where: { coupon_id: couponId },
        order: [['created_at', 'DESC']]
      });

      const transformedLogs = await Promise.all(logs.map(async (log) => {
        let changedByName = null;
        if (log.changed_by) {
          const user = await User.findByPk(log.changed_by);
          changedByName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : null;
        }

        return {
          id: log.id,
          couponId: log.coupon_id,
          action: log.action,
          changedBy: log.changed_by,
          changedByName,
          oldValues: log.old_values,
          newValues: log.new_values,
          ipAddress: log.ip_address,
          createdAt: log.created_at
        };
      }));

      return Result.success(transformedLogs);
    } catch (error) {
      logger.error('Get audit log error:', error);
      return Result.failure(error.message || 'Failed to get audit log');
    }
  }

  /**
   * Log audit entry
   */
  async logAudit(couponId, action, changedBy, oldValues, newValues, ipAddress = null) {
    try {
      await CouponAuditLog.create({
        coupon_id: couponId,
        action,
        changed_by: changedBy,
        old_values: oldValues,
        new_values: newValues,
        ip_address: ipAddress,
        created_at: new Date()
      });
    } catch (error) {
      logger.error('Log audit error:', error);
    }
  }

  /**
   * Transform coupon to DTO (camelCase for frontend)
   */
  transformToDto(coupon) {
    return {
      id: coupon.id,
      couponName: coupon.coupon_name,
      couponCode: coupon.coupon_code,
      discountType: coupon.discount_type,
      discountValue: parseFloat(coupon.discount_value),
      description: coupon.description,
      expiryDate: coupon.expiry_date,
      maxUses: coupon.max_uses,
      currentUses: coupon.current_uses,
      minOrderAmount: coupon.min_order_amount ? parseFloat(coupon.min_order_amount) : null,
      maxDiscountAmount: coupon.max_discount_amount ? parseFloat(coupon.max_discount_amount) : null,
      isActive: coupon.is_active,
      createdBy: coupon.created_by,
      createdAt: coupon.created_at,
      modifiedAt: coupon.modified_at,
      // Computed field for frontend display
      views: coupon.current_uses
    };
  }
}

module.exports = new CouponService();
