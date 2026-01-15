const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

/**
 * API Logger Utility
 * Logs 3rd party API requests and responses to files
 * Naming convention: registrationnumber.timestamp.json
 */
class ApiLogger {
  constructor() {
    // Use apilogs folder - prefer /tmp in development to avoid nodemon restarts
    // In production, use project root
    const isDev = process.env.NODE_ENV !== 'production';
    this.logsDir = isDev
      ? '/tmp/motopsy-apilogs'
      : path.join(__dirname, '../../apilogs');
    this.ensureLogsDirExists();
  }

  /**
   * Ensure the apilogs directory exists
   */
  ensureLogsDirExists() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
        logger.info(`Created API logs directory: ${this.logsDir}`);
      }
    } catch (error) {
      logger.error('Failed to create API logs directory:', error.message);
    }
  }

  /**
   * Generate filename with registration number and timestamp
   * Format: REGISTRATIONNUMBER.YYYYMMDD-HHMMSS.json
   * @param {string} registrationNumber - Vehicle registration number
   * @param {string} apiSource - API source (surepass, apiclub)
   * @param {string} endpoint - API endpoint (rc, challan, etc.)
   * @returns {string} Filename
   */
  generateFilename(registrationNumber, apiSource, endpoint = 'rc') {
    const cleanRegNum = (registrationNumber || 'unknown').replace(/\s/g, '').toUpperCase();
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '-')
      .replace(/\.\d{3}Z/, '');

    return `${cleanRegNum}.${apiSource}.${endpoint}.${timestamp}.json`;
  }

  /**
   * Log API request and response
   * @param {Object} options - Log options
   * @param {string} options.registrationNumber - Vehicle registration number
   * @param {string} options.apiSource - API source (surepass, apiclub)
   * @param {string} options.endpoint - API endpoint (rc, challan, etc.)
   * @param {Object} options.request - Request details
   * @param {string} options.request.url - Request URL
   * @param {string} options.request.method - HTTP method
   * @param {Object} options.request.headers - Request headers (sanitized)
   * @param {Object} options.request.body - Request body
   * @param {Object} options.response - Response details
   * @param {number} options.response.status - HTTP status code
   * @param {Object} options.response.data - Response data
   * @param {number} options.response.duration - Request duration in ms
   * @param {string} options.error - Error message if failed
   */
  async log(options) {
    try {
      const {
        registrationNumber,
        apiSource,
        endpoint = 'rc',
        request,
        response,
        error
      } = options;

      const filename = this.generateFilename(registrationNumber, apiSource, endpoint);
      const filepath = path.join(this.logsDir, filename);

      // Sanitize headers (remove sensitive tokens)
      const sanitizedHeaders = { ...request.headers };
      if (sanitizedHeaders.Authorization) {
        sanitizedHeaders.Authorization = 'Bearer ***REDACTED***';
      }
      if (sanitizedHeaders['x-api-key']) {
        sanitizedHeaders['x-api-key'] = '***REDACTED***';
      }

      const logData = {
        timestamp: new Date().toISOString(),
        registrationNumber: registrationNumber?.toUpperCase(),
        apiSource,
        endpoint,
        request: {
          url: request.url,
          method: request.method,
          headers: sanitizedHeaders,
          body: request.body
        },
        response: response ? {
          status: response.status,
          success: response.data?.success ?? response.data?.status === 'success',
          data: response.data,
          duration: response.duration
        } : null,
        error: error || null
      };

      // Write to file asynchronously
      await fs.promises.writeFile(
        filepath,
        JSON.stringify(logData, null, 2),
        'utf8'
      );

      logger.info(`[ApiLogger] Saved: ${filename}`);
    } catch (err) {
      // Don't fail the main operation if logging fails
      logger.error('[ApiLogger] Failed to save log:', err.message);
    }
  }

  /**
   * Create a wrapper for axios that logs requests
   * @param {Function} axiosCall - The axios call to wrap
   * @param {Object} logOptions - Logging options
   * @returns {Promise} Axios response
   */
  async withLogging(axiosCall, logOptions) {
    const startTime = Date.now();
    let response = null;
    let error = null;

    try {
      response = await axiosCall();
      return response;
    } catch (err) {
      error = err.message;
      if (err.response) {
        response = err.response;
      }
      throw err;
    } finally {
      const duration = Date.now() - startTime;

      // Log the request/response
      await this.log({
        ...logOptions,
        response: response ? {
          status: response.status,
          data: response.data,
          duration
        } : null,
        error
      });
    }
  }
}

module.exports = new ApiLogger();
