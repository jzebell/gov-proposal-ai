/**
 * Validation Middleware
 * Request validation utilities for API endpoints
 */

const logger = require('../utils/logger');

/**
 * Validate UUID format
 */
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate required fields
 */
const validateRequired = (fields) => {
  return (req, res, next) => {
    const errors = [];

    for (const field of fields) {
      if (!req.body[field]) {
        errors.push(`${field} is required`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

/**
 * Validate UUID parameter
 */
const validateUUID = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }

    next();
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      message: 'Page must be a positive integer'
    });
  }

  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100'
    });
  }

  next();
};

/**
 * Validate past performance data
 */
const validatePastPerformance = (req, res, next) => {
  const { projectName, customer, summary } = req.body;
  const errors = [];

  if (!projectName || typeof projectName !== 'string' || projectName.trim().length === 0) {
    errors.push('Project name is required and must be a non-empty string');
  }

  if (!customer || typeof customer !== 'string' || customer.trim().length === 0) {
    errors.push('Customer is required and must be a non-empty string');
  }

  if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
    errors.push('Summary is required and must be a non-empty string');
  }

  if (req.body.contractValue && (isNaN(req.body.contractValue) || req.body.contractValue < 0)) {
    errors.push('Contract value must be a positive number');
  }

  if (req.body.startDate && !isValidDate(req.body.startDate)) {
    errors.push('Start date must be a valid date');
  }

  if (req.body.endDate && !isValidDate(req.body.endDate)) {
    errors.push('End date must be a valid date');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate search parameters
 */
const validateSearch = (req, res, next) => {
  const { query, customerType, minValue, maxValue } = req.query;

  if (minValue && (isNaN(minValue) || parseFloat(minValue) < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Minimum value must be a positive number'
    });
  }

  if (maxValue && (isNaN(maxValue) || parseFloat(maxValue) < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Maximum value must be a positive number'
    });
  }

  if (minValue && maxValue && parseFloat(minValue) > parseFloat(maxValue)) {
    return res.status(400).json({
      success: false,
      message: 'Minimum value cannot be greater than maximum value'
    });
  }

  next();
};

/**
 * Validate date format
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Sanitize input data
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }

  next();
};

module.exports = {
  validateRequired,
  validateUUID,
  validatePagination,
  validatePastPerformance,
  validateSearch,
  sanitizeInput,
  isValidUUID,
  isValidDate
};