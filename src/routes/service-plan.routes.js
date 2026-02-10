const express = require('express');
const router = express.Router();
const servicePlanController = require('../controllers/service-plan.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// Public routes
router.get('/service-plans', (req, res, next) => servicePlanController.getAllServicePlans(req, res, next));
router.get('/service-plans/:serviceKey', (req, res, next) => servicePlanController.getServicePlanByKey(req, res, next));

// Admin routes
router.get('/admin/service-plans', authenticate, requireAdmin, (req, res, next) => servicePlanController.getAllServicePlansAdmin(req, res, next));
router.get('/admin/service-plans/:id', authenticate, requireAdmin, (req, res, next) => servicePlanController.getServicePlanById(req, res, next));
router.post('/admin/service-plans', authenticate, requireAdmin, (req, res, next) => servicePlanController.createServicePlan(req, res, next));
router.put('/admin/service-plans/:id', authenticate, requireAdmin, (req, res, next) => servicePlanController.updateServicePlan(req, res, next));
router.delete('/admin/service-plans/:id', authenticate, requireAdmin, (req, res, next) => servicePlanController.deleteServicePlan(req, res, next));

// Admin pricing option routes
router.get('/admin/service-plan-options/:planId', authenticate, requireAdmin, (req, res, next) => servicePlanController.getServicePlanOptions(req, res, next));
router.post('/admin/service-plan-options', authenticate, requireAdmin, (req, res, next) => servicePlanController.createPricingOption(req, res, next));
router.put('/admin/service-plan-options/:id', authenticate, requireAdmin, (req, res, next) => servicePlanController.updatePricingOption(req, res, next));
router.delete('/admin/service-plan-options/:id', authenticate, requireAdmin, (req, res, next) => servicePlanController.deletePricingOption(req, res, next));

module.exports = router;
