const InspectionCertificate = require('../models/inspection-certificate.model');
const InspectionScore = require('../models/inspection-score.model');
const Inspection = require('../models/inspection.model');
const Result = require('../utils/result');
const logger = require('../config/logger');

class CertificateService {
  /**
   * Generate a certificate for a scored inspection.
   */
  async generate(inspectionId) {
    try {
      const inspection = await Inspection.findByPk(inspectionId);
      if (!inspection) {
        return Result.failure('Inspection not found');
      }

      if (inspection.status !== 'scored') {
        return Result.failure('Inspection must be scored before generating certificate');
      }

      const score = await InspectionScore.findOne({
        where: { inspection_id: inspectionId }
      });

      if (!score) {
        return Result.failure('Score not found for this inspection');
      }

      // Check if certificate already exists
      const existing = await InspectionCertificate.findOne({
        where: { inspection_id: inspectionId }
      });

      if (existing) {
        return Result.success(this.toDto(existing));
      }

      // Generate unique certificate number: MTP-YYYYMMDD-XXXXX
      const certNumber = await this.generateCertificateNumber();

      // QR code data: verification URL
      const qrCodeData = `https://motopsy.com/verify/${certNumber}`;

      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt);
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      const certificate = await InspectionCertificate.create({
        inspection_id: inspectionId,
        certificate_number: certNumber,
        qr_code_data: qrCodeData,
        rating: score.rating,
        certification: score.certification,
        issued_at: issuedAt,
        expires_at: expiresAt,
        created_at: issuedAt
      });

      // Update inspection status
      await inspection.update({
        status: 'certified',
        modified_at: new Date()
      });

      logger.info(`Certificate generated: ${certNumber} for inspection ${inspectionId}`);
      return Result.success(this.toDto(certificate));
    } catch (error) {
      logger.error('Generate certificate error:', error);
      return Result.failure(error.message || 'Failed to generate certificate');
    }
  }

  /**
   * Public verification: look up certificate by number.
   */
  async verify(certificateNumber) {
    try {
      const certificate = await InspectionCertificate.findOne({
        where: { certificate_number: certificateNumber },
        include: [{
          model: Inspection,
          as: 'Inspection',
          attributes: ['uuid', 'vehicle_reg_number', 'vehicle_make', 'vehicle_model',
                       'vehicle_year', 'fuel_type', 'transmission_type', 'odometer_km',
                       'completed_at']
        }]
      });

      if (!certificate) {
        return Result.failure('Certificate not found');
      }

      const isExpired = certificate.expires_at && new Date() > new Date(certificate.expires_at);

      const data = certificate.toJSON();
      return Result.success({
        certificateNumber: data.certificate_number,
        rating: data.rating,
        certification: data.certification,
        issuedAt: data.issued_at,
        expiresAt: data.expires_at,
        isExpired,
        vehicle: data.Inspection ? {
          registrationNumber: data.Inspection.vehicle_reg_number,
          make: data.Inspection.vehicle_make,
          model: data.Inspection.vehicle_model,
          year: data.Inspection.vehicle_year,
          fuelType: data.Inspection.fuel_type,
          transmissionType: data.Inspection.transmission_type,
          odometerKm: data.Inspection.odometer_km,
          inspectedAt: data.Inspection.completed_at
        } : null
      });
    } catch (error) {
      logger.error('Verify certificate error:', error);
      return Result.failure(error.message || 'Failed to verify certificate');
    }
  }

  /**
   * Generate unique certificate number: MTP-YYYYMMDD-XXXXX
   */
  async generateCertificateNumber() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count for today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const count = await InspectionCertificate.count({
      where: {
        created_at: {
          [require('sequelize').Op.gte]: todayStart,
          [require('sequelize').Op.lt]: todayEnd
        }
      }
    });

    const seq = String(count + 1).padStart(5, '0');
    return `MTP-${dateStr}-${seq}`;
  }

  toDto(cert) {
    const data = cert.toJSON ? cert.toJSON() : cert;
    return {
      id: data.id,
      inspectionId: data.inspection_id,
      certificateNumber: data.certificate_number,
      qrCodeData: data.qr_code_data,
      rating: data.rating,
      certification: data.certification,
      issuedAt: data.issued_at,
      expiresAt: data.expires_at
    };
  }
}

module.exports = new CertificateService();
