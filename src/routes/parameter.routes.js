const express = require('express');
const router = express.Router();
const parameterController = require('../controllers/parameter.controller');

router.get('/', parameterController.getParameters.bind(parameterController));

module.exports = router;
