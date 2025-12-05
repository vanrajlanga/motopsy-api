/**
 * Result pattern implementation (matching C# CSharpFunctionalExtensions)
 * Used for consistent API responses and error handling
 */

class Result {
  constructor(isSuccess, value, error) {
    this.isSuccess = isSuccess;
    this.value = value;
    this.error = error;
  }

  static success(value = null) {
    return new Result(true, value, null);
  }

  static failure(error) {
    return new Result(false, null, error);
  }

  static successIf(condition, errorMessage) {
    return condition ? Result.success() : Result.failure(errorMessage);
  }

  static failureIf(condition, errorMessage) {
    return condition ? Result.failure(errorMessage) : Result.success();
  }
}

module.exports = Result;
