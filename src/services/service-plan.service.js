const db = require('../models');
const { ServicePlan, ServicePlanOption } = db;

class ServicePlanService {
  /**
   * Get all active service plans with their pricing options
   */
  async getAllServicePlansAsync() {
    try {
      const plans = await ServicePlan.findAll({
        where: { is_active: true },
        include: [{
          model: ServicePlanOption,
          as: 'options',
          where: { is_active: true },
          required: false
        }],
        order: [
          ['display_order', 'ASC'],
          [{ model: ServicePlanOption, as: 'options' }, 'display_order', 'ASC']
        ]
      });
      return plans;
    } catch (error) {
      throw new Error(`Error fetching service plans: ${error.message}`);
    }
  }

  /**
   * Get service plan by key (e.g., 'used_vehicle_pdi')
   */
  async getServicePlanByKeyAsync(serviceKey) {
    try {
      const plan = await ServicePlan.findOne({
        where: {
          service_key: serviceKey,
          is_active: true
        },
        include: [{
          model: ServicePlanOption,
          as: 'options',
          where: { is_active: true },
          required: false
        }],
        order: [[{ model: ServicePlanOption, as: 'options' }, 'display_order', 'ASC']]
      });

      if (!plan) {
        throw new Error('Service plan not found');
      }

      return plan;
    } catch (error) {
      throw new Error(`Error fetching service plan: ${error.message}`);
    }
  }

  /**
   * Get service plan by ID
   */
  async getServicePlanByIdAsync(id) {
    try {
      const plan = await ServicePlan.findByPk(id, {
        include: [{
          model: ServicePlanOption,
          as: 'options'
        }],
        order: [[{ model: ServicePlanOption, as: 'options' }, 'display_order', 'ASC']]
      });

      if (!plan) {
        throw new Error('Service plan not found');
      }

      return plan;
    } catch (error) {
      throw new Error(`Error fetching service plan: ${error.message}`);
    }
  }

  /**
   * Get all pricing options for a service plan
   */
  async getServicePlanOptionsAsync(servicePlanId) {
    try {
      const options = await ServicePlanOption.findAll({
        where: {
          service_plan_id: servicePlanId,
          is_active: true
        },
        order: [['display_order', 'ASC']]
      });
      return options;
    } catch (error) {
      throw new Error(`Error fetching plan options: ${error.message}`);
    }
  }

  /**
   * Get pricing option by ID
   */
  async getPricingOptionByIdAsync(optionId) {
    try {
      const option = await ServicePlanOption.findByPk(optionId);

      if (!option) {
        throw new Error('Pricing option not found');
      }

      return option;
    } catch (error) {
      throw new Error(`Error fetching pricing option: ${error.message}`);
    }
  }

  /**
   * Admin: Create new service plan
   */
  async createServicePlanAsync(data, userId) {
    try {
      const plan = await ServicePlan.create({
        service_key: data.service_key,
        service_name: data.service_name,
        description: data.description,
        service_type: data.service_type,
        is_active: data.is_active !== undefined ? data.is_active : true,
        display_order: data.display_order || 0,
        modified_by: userId,
        modified_at: new Date()
      });
      return plan;
    } catch (error) {
      throw new Error(`Error creating service plan: ${error.message}`);
    }
  }

  /**
   * Admin: Update service plan
   */
  async updateServicePlanAsync(id, data, userId) {
    try {
      const plan = await ServicePlan.findByPk(id);

      if (!plan) {
        throw new Error('Service plan not found');
      }

      await plan.update({
        ...data,
        modified_by: userId,
        modified_at: new Date()
      });

      // Reload to ensure all fields including default_amount are properly loaded
      await plan.reload();

      return plan;
    } catch (error) {
      throw new Error(`Error updating service plan: ${error.message}`);
    }
  }

  /**
   * Admin: Delete service plan
   */
  async deleteServicePlanAsync(id) {
    try {
      const plan = await ServicePlan.findByPk(id);

      if (!plan) {
        throw new Error('Service plan not found');
      }

      await plan.destroy();
      return { success: true };
    } catch (error) {
      throw new Error(`Error deleting service plan: ${error.message}`);
    }
  }

  /**
   * Admin: Create pricing option
   */
  async createPricingOptionAsync(data, userId) {
    try {
      const option = await ServicePlanOption.create({
        service_plan_id: data.service_plan_id,
        option_key: data.option_key,
        option_name: data.option_name,
        amount: data.amount,
        currency: data.currency || 'INR',
        description: data.description,
        is_active: data.is_active !== undefined ? data.is_active : true,
        display_order: data.display_order || 0,
        modified_by: userId,
        modified_at: new Date()
      });
      return option;
    } catch (error) {
      throw new Error(`Error creating pricing option: ${error.message}`);
    }
  }

  /**
   * Admin: Update pricing option
   */
  async updatePricingOptionAsync(id, data, userId) {
    try {
      const option = await ServicePlanOption.findByPk(id);

      if (!option) {
        throw new Error('Pricing option not found');
      }

      await option.update({
        ...data,
        modified_by: userId,
        modified_at: new Date()
      });

      return option;
    } catch (error) {
      throw new Error(`Error updating pricing option: ${error.message}`);
    }
  }

  /**
   * Admin: Delete pricing option
   */
  async deletePricingOptionAsync(id) {
    try {
      const option = await ServicePlanOption.findByPk(id);

      if (!option) {
        throw new Error('Pricing option not found');
      }

      await option.destroy();
      return { success: true };
    } catch (error) {
      throw new Error(`Error deleting pricing option: ${error.message}`);
    }
  }
}

module.exports = new ServicePlanService();
