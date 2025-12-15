const express = require('express');
const router = express.Router();
const accountController = require('../controllers/account.controller');

// All routes under /api/account

router.post('/register', (req, res, next) => accountController.register(req, res, next));
router.post('/email/confirm', (req, res, next) => accountController.confirmEmail(req, res, next));
router.post('/login', (req, res, next) => accountController.login(req, res, next));
router.post('/login-with-token', (req, res, next) => accountController.loginWithToken(req, res, next));
router.post('/forgot-password', (req, res, next) => accountController.forgotPassword(req, res, next));
router.post('/reset-password', (req, res, next) => accountController.resetPassword(req, res, next));
router.post('/contact-us', (req, res, next) => accountController.contactUs(req, res, next));

module.exports = router;
