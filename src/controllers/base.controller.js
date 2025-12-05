const Result = require('../utils/result');

/**
 * Base API Controller (matching .NET ApiController)
 * Provides consistent response handling methods
 */
class ApiController {
  /**
   * Convert Result<T> to HTTP response
   * @param {Result} result - Result object
   * @param {Response} res - Express response object
   */
  fromResult(result, res) {
    if (!result.isSuccess) {
      // Check if error indicates "Not Found"
      if (result.error && result.error.toLowerCase().includes('not found')) {
        return res.status(404).json({
          isSuccess: false,
          error: result.error
        });
      }

      // Default to Bad Request
      return res.status(400).json({
        isSuccess: false,
        error: result.error
      });
    }

    // Success case
    if (result.value === null || result.value === undefined) {
      return res.status(204).send(); // No Content
    }

    return res.status(200).json(result.value);
  }

  /**
   * Success response with data
   */
  ok(data, res) {
    return res.status(200).json(data);
  }

  /**
   * Success response without data
   */
  noContent(res) {
    return res.status(204).send();
  }

  /**
   * Bad Request response
   */
  badRequest(error, res) {
    return res.status(400).json({
      isSuccess: false,
      error: error
    });
  }

  /**
   * Not Found response
   */
  notFound(error, res) {
    return res.status(404).json({
      isSuccess: false,
      error: error
    });
  }

  /**
   * Unauthorized response
   */
  unauthorized(error, res) {
    return res.status(401).json({
      isSuccess: false,
      error: error || 'Unauthorized'
    });
  }
}

module.exports = ApiController;
