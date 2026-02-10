const ApiController = require('./base.controller');
const servicePlanService = require('../services/service-plan.service');

class ServicePlanController extends ApiController {
  /**
   * GET /api/service-plans
   * Get all active service plans
   */
  async getAllServicePlans(req, res, next) {
    try {
      const plans = await servicePlanService.getAllServicePlansAsync();
      return this.ok({ success: true, data: plans }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/service-plans/:serviceKey
   * Get service plan by key
   */
  async getServicePlanByKey(req, res, next) {
    try {
      const { serviceKey } = req.params;
      const plan = await servicePlanService.getServicePlanByKeyAsync(serviceKey);
      return this.ok({ success: true, data: plan }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/service-plans
   * Admin: Get all service plans
   */
  async getAllServicePlansAdmin(req, res, next) {
    try {
      const plans = await servicePlanService.getAllServicePlansAsync();
      return this.ok({ success: true, data: plans }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/service-plans/:id
   * Admin: Get service plan by ID
   */
  async getServicePlanById(req, res, next) {
    try {
      const { id } = req.params;
      const plan = await servicePlanService.getServicePlanByIdAsync(id);
      return this.ok({ success: true, data: plan }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/service-plans
   * Admin: Create service plan
   */
  async createServicePlan(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.user_id;
      const plan = await servicePlanService.createServicePlanAsync(req.body, userId);
      return this.ok({
        success: true,
        data: plan,
        message: 'Service plan created successfully'
      }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/service-plans/:id
   * Admin: Update service plan
   */
  async updateServicePlan(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.user_id;
      const plan = await servicePlanService.updateServicePlanAsync(id, req.body, userId);
      return this.ok({
        success: true,
        data: plan,
        message: 'Service plan updated successfully'
      }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/service-plans/:id
   * Admin: Delete service plan
   */
  async deleteServicePlan(req, res, next) {
    try {
      const { id } = req.params;
      await servicePlanService.deleteServicePlanAsync(id);
      return this.ok({
        success: true,
        message: 'Service plan deleted successfully'
      }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/service-plan-options/:planId
   * Admin: Get pricing options for a plan
   */
  async getServicePlanOptions(req, res, next) {
    try {
      const { planId } = req.params;
      const options = await servicePlanService.getServicePlanOptionsAsync(planId);
      return this.ok({ success: true, data: options }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/service-plan-options
   * Admin: Create pricing option
   */
  async createPricingOption(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.user_id;
      const option = await servicePlanService.createPricingOptionAsync(req.body, userId);
      return this.ok({
        success: true,
        data: option,
        message: 'Pricing option created successfully'
      }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/service-plan-options/:id
   * Admin: Update pricing option
   */
  async updatePricingOption(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.user_id;
      const option = await servicePlanService.updatePricingOptionAsync(id, req.body, userId);
      return this.ok({
        success: true,
        data: option,
        message: 'Pricing option updated successfully'
      }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/service-plan-options/:id
   * Admin: Delete pricing option
   */
  async deletePricingOption(req, res, next) {
    try {
      const { id } = req.params;
      await servicePlanService.deletePricingOptionAsync(id);
      return this.ok({
        success: true,
        message: 'Pricing option deleted successfully'
      }, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ServicePlanController();
