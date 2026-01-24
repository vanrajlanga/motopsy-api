const axios = require('axios');
const Result = require('../utils/result');
const logger = require('../config/logger');
const ServiceHistory = require('../models/service-history.model');
const { Op } = require('sequelize');

class ServiceHistoryService {
  constructor() {
    this.apiUrl = process.env.SUREPASS_API_URL || 'https://kyc-api.surepass.io/api/v1';
    this.token = process.env.SUREPASS_TOKEN;
    this.headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get vehicle service history from Surepass API
   * @param {string} idNumber - Vehicle registration number
   * @param {string} maker - Vehicle maker (maruti, hyundai, mahindra)
   * @param {number} userId - User ID who is searching
   */
  async getServiceHistoryAsync(idNumber, maker, userId = null) {
    const cleanRegNum = idNumber.replace(/\s/g, '').toUpperCase();
    const makerLower = maker.toLowerCase();
    const requestUrl = `${this.apiUrl}/rc/vehicle-service-history`;
    const requestBody = {
      id_number: cleanRegNum,
      maker: makerLower
    };

    try {
      logger.info(`[ServiceHistory] Fetching for: ${cleanRegNum}, maker: ${makerLower}`);

      const response = await axios.post(
        requestUrl,
        requestBody,
        {
          headers: this.headers,
          timeout: 60000 // 60 second timeout for this API
        }
      );

      // Store the result in database
      const serviceHistoryRecord = await ServiceHistory.create({
        client_id: response.data.data?.client_id || null,
        id_number: cleanRegNum,
        maker: makerLower,
        service_history_details: response.data.data?.service_history_details || [],
        status_code: response.data.status_code,
        success: response.data.success,
        message: response.data.message,
        searched_by: userId,
      });

      if (response.data.success) {
        const data = response.data.data;

        return Result.success({
          id: serviceHistoryRecord.id,
          clientId: data.client_id,
          idNumber: data.id_number,
          maker: data.maker,
          serviceHistoryDetails: data.service_history_details || [],
          totalRecords: (data.service_history_details || []).length,
        });
      } else {
        return Result.failure(response.data.message || 'Service history fetch failed');
      }
    } catch (error) {
      logger.error('[ServiceHistory] API error:', error.message);

      // Store failed attempt
      await ServiceHistory.create({
        client_id: null,
        id_number: cleanRegNum,
        maker: makerLower,
        service_history_details: null,
        status_code: error.response?.status || 500,
        success: false,
        message: error.response?.data?.message || error.message,
        searched_by: userId,
      });

      if (error.response) {
        return Result.failure(error.response.data?.message || 'Service history fetch failed');
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return Result.failure('Service history API timeout');
      }

      return Result.failure(error.message || 'Service history service unavailable');
    }
  }

  /**
   * Get all service history records (paginated)
   * @param {number} page - Page number (1-indexed)
   * @param {number} pageSize - Records per page
   * @param {string} search - Search term for registration number
   */
  async getServiceHistoryListAsync(page = 1, pageSize = 20, search = '') {
    try {
      const offset = (page - 1) * pageSize;

      const whereClause = {
        success: true, // Only show successful fetches
      };

      if (search) {
        whereClause.id_number = {
          [Op.like]: `%${search.toUpperCase()}%`
        };
      }

      const { count, rows } = await ServiceHistory.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: pageSize,
        offset: offset,
      });

      return Result.success({
        records: rows.map(record => {
          // Parse JSON if it's a string (MySQL might return string for JSON fields)
          let details = record.service_history_details;
          if (typeof details === 'string') {
            try {
              details = JSON.parse(details);
            } catch (e) {
              details = [];
            }
          }
          if (!Array.isArray(details)) {
            details = [];
          }

          return {
            id: record.id,
            clientId: record.client_id,
            idNumber: record.id_number,
            maker: record.maker,
            totalServices: details.length,
            searchedAt: record.created_at,
            searchedBy: record.searched_by,
          };
        }),
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize),
      });
    } catch (error) {
      logger.error('[ServiceHistory] List error:', error.message);
      return Result.failure('Failed to fetch service history list');
    }
  }

  /**
   * Get a specific service history record by ID
   * @param {number} id - Service history record ID
   */
  async getServiceHistoryByIdAsync(id) {
    try {
      const record = await ServiceHistory.findByPk(id);

      if (!record) {
        return Result.failure('Service history record not found');
      }

      // Parse JSON if it's a string (MySQL might return string for JSON fields)
      let details = record.service_history_details;
      if (typeof details === 'string') {
        try {
          details = JSON.parse(details);
        } catch (e) {
          details = [];
        }
      }
      if (!Array.isArray(details)) {
        details = [];
      }

      return Result.success({
        id: record.id,
        clientId: record.client_id,
        idNumber: record.id_number,
        maker: record.maker,
        serviceHistoryDetails: details,
        totalRecords: details.length,
        success: record.success,
        message: record.message,
        searchedAt: record.created_at,
        searchedBy: record.searched_by,
      });
    } catch (error) {
      logger.error('[ServiceHistory] GetById error:', error.message);
      return Result.failure('Failed to fetch service history record');
    }
  }

  /**
   * Get supported makers list
   */
  getSupportedMakers() {
    return [
      { value: 'maruti', label: 'Maruti' },
      { value: 'hyundai', label: 'Hyundai' },
      { value: 'mahindra', label: 'Mahindra' },
    ];
  }
}

module.exports = new ServiceHistoryService();
