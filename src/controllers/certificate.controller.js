const BaseController = require('./base.controller');
const certificateService = require('../services/certificate.service');

class CertificateController extends BaseController {
  async verify(req, res, next) {
    try {
      const { certNumber } = req.params;
      const result = await certificateService.verify(certNumber);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CertificateController();
