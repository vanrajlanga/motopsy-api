const path = require('path');
const BaseController = require('./base.controller');
const inspectionService = require('../services/inspection.service');
const certificateService = require('../services/certificate.service');
const Inspection = require('../models/inspection.model');
const InspectionPhoto = require('../models/inspection-photo.model');
const InspectionResponse = require('../models/inspection-response.model');

class InspectionController extends BaseController {
  async create(req, res, next) {
    try {
      // Use authenticated user as technician if logged in (mechanic flow), else use body field
      const technicianId = req.user?.userId || req.body.technician_id || null;
      const result = await inspectionService.create(technicianId, req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const filters = {
        technicianId: req.query.technicianId || null,
        status: req.query.status,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };
      const result = await inspectionService.list(filters);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await inspectionService.getById(parseInt(id));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async saveResponse(req, res, next) {
    try {
      const { id, parameterId } = req.params;
      const { selectedOption, notes } = req.body;
      const result = await inspectionService.saveResponse(
        parseInt(id), parseInt(parameterId), selectedOption, notes
      );
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async saveBatchResponses(req, res, next) {
    try {
      const { id } = req.params;
      const { responses } = req.body;
      const result = await inspectionService.saveBatchResponses(parseInt(id), responses);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async complete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await inspectionService.complete(parseInt(id));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getScore(req, res, next) {
    try {
      const { id } = req.params;
      const InspectionScore = require('../models/inspection-score.model');
      const score = await InspectionScore.findOne({
        where: { inspection_id: parseInt(id) }
      });

      if (!score) {
        return this.notFound('Score not found for this inspection', res);
      }

      return this.ok(score, res);
    } catch (error) {
      next(error);
    }
  }

  async generateCertificate(req, res, next) {
    try {
      const { id } = req.params;
      const result = await certificateService.generate(parseInt(id));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async uploadInspectorPhoto(req, res, next) {
    try {
      const { id } = req.params;

      const inspection = await Inspection.findByPk(parseInt(id));
      if (!inspection) {
        return this.notFound('Inspection not found', res);
      }

      if (!req.file) {
        return this.badRequest('No file uploaded', res);
      }

      const relativePath = `uploads/${req.file.filename}`;
      await inspection.update({
        inspector_photo_path: relativePath,
        modified_at: new Date()
      });

      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      return this.ok({
        inspectionId: inspection.id,
        inspectorPhotoPath: fileUrl
      }, res);
    } catch (error) {
      next(error);
    }
  }

  async uploadVehiclePhoto(req, res, next) {
    try {
      const { id } = req.params;

      const inspection = await Inspection.findByPk(parseInt(id));
      if (!inspection) {
        return this.notFound('Inspection not found', res);
      }

      if (!req.file) {
        return this.badRequest('No file uploaded', res);
      }

      const relativePath = `uploads/${req.file.filename}`;
      await inspection.update({
        vehicle_photo_path: relativePath,
        modified_at: new Date()
      });

      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      return this.ok({
        inspectionId: inspection.id,
        vehiclePhotoPath: fileUrl
      }, res);
    } catch (error) {
      next(error);
    }
  }

  async uploadPhoto(req, res, next) {
    try {
      const { id, responseId } = req.params;

      // Verify the response belongs to this inspection
      const response = await InspectionResponse.findOne({
        where: { id: parseInt(responseId), inspection_id: parseInt(id) }
      });

      if (!response) {
        return this.notFound('Response not found', res);
      }

      if (!req.file) {
        return this.badRequest('No file uploaded', res);
      }

      const relativePath = `uploads/${req.file.filename}`;
      const photo = await InspectionPhoto.create({
        response_id: parseInt(responseId),
        file_path: relativePath,
        file_name: req.file.originalname,
        file_size: req.file.size,
        created_at: new Date()
      });

      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      return this.ok({
        id: photo.id,
        fileName: photo.file_name,
        filePath: fileUrl,
        fileSize: photo.file_size
      }, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InspectionController();
