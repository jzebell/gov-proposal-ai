/**
 * Global Settings API Routes
 * CRUD operations for application-wide settings
 */

const express = require('express');
const GlobalSettingsService = require('../services/GlobalSettingsService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const globalSettingsService = new GlobalSettingsService();

/**
 * @route GET /api/global-settings
 * @desc Get all settings (optionally filtered by category)
 * @access Admin
 */
router.get('/', asyncHandler(async (req, res) => {
  const { category, public_only } = req.query;
  const publicOnly = public_only === 'true';

  const settings = await globalSettingsService.getSettingsByCategory(category, publicOnly);

  res.json({
    success: true,
    data: settings
  });
}));

/**
 * @route GET /api/global-settings/:key
 * @desc Get a specific setting by key
 * @access Admin
 */
router.get('/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const setting = await globalSettingsService.getSetting(key);

  if (!setting) {
    return res.status(404).json({
      success: false,
      message: 'Setting not found'
    });
  }

  res.json({
    success: true,
    data: setting
  });
}));

/**
 * @route GET /api/global-settings/:key/value
 * @desc Get a setting's parsed value
 * @access Public (for public settings)
 */
router.get('/:key/value', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const setting = await globalSettingsService.getSetting(key);

  if (!setting) {
    return res.status(404).json({
      success: false,
      message: 'Setting not found'
    });
  }

  // For now, allow all settings - in production, check is_public flag
  const value = globalSettingsService.parseSettingValue(setting.setting_value, setting.setting_type);

  res.json({
    success: true,
    data: {
      key: setting.setting_key,
      value: value,
      type: setting.setting_type
    }
  });
}));

/**
 * @route PUT /api/global-settings/:key
 * @desc Update a setting
 * @access Admin
 */
router.put('/:key', sanitizeInput, asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value, type, description, category, is_public } = req.body;

  if (value === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Value is required'
    });
  }

  const setting = await globalSettingsService.setSetting(
    key,
    value,
    type || 'string',
    description,
    category,
    is_public
  );

  res.json({
    success: true,
    data: setting,
    message: 'Setting updated successfully'
  });
}));

/**
 * @route POST /api/global-settings
 * @desc Create a new setting
 * @access Admin
 */
router.post('/', sanitizeInput, asyncHandler(async (req, res) => {
  const { key, value, type, description, category, is_public } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Key and value are required'
    });
  }

  const setting = await globalSettingsService.setSetting(
    key,
    value,
    type || 'string',
    description,
    category || 'general',
    is_public || false
  );

  res.status(201).json({
    success: true,
    data: setting,
    message: 'Setting created successfully'
  });
}));

/**
 * @route DELETE /api/global-settings/:key
 * @desc Delete a setting
 * @access Admin
 */
router.delete('/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;

  const setting = await globalSettingsService.deleteSetting(key);

  res.json({
    success: true,
    data: setting,
    message: 'Setting deleted successfully'
  });
}));

/**
 * @route GET /api/global-settings/persona/default
 * @desc Get default persona ID
 * @access Public
 */
router.get('/persona/default', asyncHandler(async (req, res) => {
  const defaultPersonaId = await globalSettingsService.getDefaultPersonaId();

  res.json({
    success: true,
    data: {
      defaultPersonaId
    }
  });
}));

/**
 * @route PUT /api/global-settings/persona/default
 * @desc Set default persona ID
 * @access Admin
 */
router.put('/persona/default', sanitizeInput, asyncHandler(async (req, res) => {
  const { personaId } = req.body;

  if (!personaId) {
    return res.status(400).json({
      success: false,
      message: 'Persona ID is required'
    });
  }

  const setting = await globalSettingsService.setDefaultPersonaId(personaId);

  res.json({
    success: true,
    data: setting,
    message: 'Default persona updated successfully'
  });
}));

/**
 * @route GET /api/global-settings/config/context
 * @desc Get all context management configuration
 * @access Admin
 */
router.get('/config/context', asyncHandler(async (req, res) => {
  const contextSettingsArray = await globalSettingsService.getSettingsByCategory('context');

  // Transform array of settings into key-value object
  const contextSettings = {};
  contextSettingsArray.forEach(setting => {
    contextSettings[setting.setting_key] = setting.setting_value;
  });

  // Transform settings into a structured configuration object
  const config = {
    documentTypesPriority: JSON.parse(contextSettings['context.document_types_priority'] || '["solicitations", "requirements", "references", "past-performance", "proposals", "compliance", "media"]'),
    metadataWeights: JSON.parse(contextSettings['context.metadata_weights'] || '{"agency_match": 5, "technology_match": 4, "recency": 3, "keyword_relevance": 6}'),
    modelCategories: JSON.parse(contextSettings['context.model_categories'] || '{"small": {"max_tokens": 4000, "models": []}, "medium": {"max_tokens": 16000, "models": []}, "large": {"max_tokens": 32000, "models": []}}'),
    tokenAllocation: JSON.parse(contextSettings['context.token_allocation'] || '{"context_percent": 70, "generation_percent": 20, "buffer_percent": 10}'),
    displayPreference: contextSettings['context.display_preference'] || 'tokens',
    ragStrictness: parseInt(contextSettings['context.rag_strictness'] || '60'),
    retryAttempts: parseInt(contextSettings['context.retry_attempts'] || '3'),
    buildDelaySeconds: parseInt(contextSettings['context.build_delay_seconds'] || '10'),
    warningThreshold: parseInt(contextSettings['context.warning_threshold_percent'] || '85'),
    fallbackBehavior: contextSettings['context.fallback_behavior'] || 'partial',
    sectionKeywords: JSON.parse(contextSettings['context.section_keywords'] || '{"executive_summary": ["executive", "summary"], "technical": ["technical", "technology", "solution"], "management": ["management", "project", "timeline"], "requirements": ["requirement", "specification"], "experience": ["experience", "performance", "past"]}')
  };

  res.json({
    success: true,
    data: config
  });
}));

/**
 * @route PUT /api/global-settings/config/context
 * @desc Update context management configuration
 * @access Admin
 */
router.put('/config/context', sanitizeInput, asyncHandler(async (req, res) => {
  const config = req.body;

  // Validate required fields
  if (!config) {
    return res.status(400).json({
      success: false,
      message: 'Configuration data is required'
    });
  }

  try {
    // Update individual settings
    const updates = [];

    if (config.documentTypesPriority) {
      updates.push(globalSettingsService.setSetting('context.document_types_priority', JSON.stringify(config.documentTypesPriority), 'json', null, 'context'));
    }

    if (config.metadataWeights) {
      updates.push(globalSettingsService.setSetting('context.metadata_weights', JSON.stringify(config.metadataWeights), 'json', null, 'context'));
    }

    if (config.modelCategories) {
      updates.push(globalSettingsService.setSetting('context.model_categories', JSON.stringify(config.modelCategories), 'json', null, 'context'));
    }

    if (config.tokenAllocation) {
      updates.push(globalSettingsService.setSetting('context.token_allocation', JSON.stringify(config.tokenAllocation), 'json', null, 'context'));
    }

    if (config.displayPreference) {
      updates.push(globalSettingsService.setSetting('context.display_preference', config.displayPreference, 'string', null, 'context'));
    }

    if (config.ragStrictness !== undefined) {
      updates.push(globalSettingsService.setSetting('context.rag_strictness', config.ragStrictness.toString(), 'integer', null, 'context'));
    }

    if (config.retryAttempts !== undefined) {
      updates.push(globalSettingsService.setSetting('context.retry_attempts', config.retryAttempts.toString(), 'integer', null, 'context'));
    }

    if (config.buildDelaySeconds !== undefined) {
      updates.push(globalSettingsService.setSetting('context.build_delay_seconds', config.buildDelaySeconds.toString(), 'integer', null, 'context'));
    }

    if (config.warningThreshold !== undefined) {
      updates.push(globalSettingsService.setSetting('context.warning_threshold_percent', config.warningThreshold.toString(), 'integer', null, 'context'));
    }

    if (config.fallbackBehavior) {
      updates.push(globalSettingsService.setSetting('context.fallback_behavior', config.fallbackBehavior, 'string', null, 'context'));
    }

    if (config.sectionKeywords) {
      updates.push(globalSettingsService.setSetting('context.section_keywords', JSON.stringify(config.sectionKeywords), 'json', null, 'context'));
    }

    // Execute all updates
    await Promise.all(updates);

    logger.info('Context configuration updated successfully');

    res.json({
      success: true,
      message: 'Context configuration updated successfully'
    });

  } catch (error) {
    logger.error('Error updating context configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update context configuration'
    });
  }
}));

/**
 * @route POST /api/global-settings/config/context/reset
 * @desc Reset context configuration to defaults
 * @access Admin
 */
router.post('/config/context/reset', asyncHandler(async (req, res) => {
  try {
    const defaultSettings = [
      { key: 'context.document_types_priority', value: '["solicitations", "requirements", "references", "past-performance", "proposals", "compliance", "media"]', type: 'json' },
      { key: 'context.metadata_weights', value: '{"agency_match": 5, "technology_match": 4, "recency": 3, "keyword_relevance": 6}', type: 'json' },
      { key: 'context.model_categories', value: '{"small": {"max_tokens": 4000, "models": []}, "medium": {"max_tokens": 16000, "models": []}, "large": {"max_tokens": 32000, "models": []}}', type: 'json' },
      { key: 'context.token_allocation', value: '{"context_percent": 70, "generation_percent": 20, "buffer_percent": 10}', type: 'json' },
      { key: 'context.display_preference', value: 'tokens', type: 'string' },
      { key: 'context.rag_strictness', value: '60', type: 'integer' },
      { key: 'context.retry_attempts', value: '3', type: 'integer' },
      { key: 'context.build_delay_seconds', value: '10', type: 'integer' },
      { key: 'context.warning_threshold_percent', value: '85', type: 'integer' },
      { key: 'context.fallback_behavior', value: 'partial', type: 'string' },
      { key: 'context.section_keywords', value: '{"executive_summary": ["executive", "summary"], "technical": ["technical", "technology", "solution"], "management": ["management", "project", "timeline"], "requirements": ["requirement", "specification"], "experience": ["experience", "performance", "past"]}', type: 'json' }
    ];

    const updates = defaultSettings.map(setting =>
      globalSettingsService.setSetting(setting.key, setting.value, setting.type, null, 'context')
    );

    await Promise.all(updates);

    logger.info('Context configuration reset to defaults');

    res.json({
      success: true,
      message: 'Context configuration reset to defaults successfully'
    });

  } catch (error) {
    logger.error('Error resetting context configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset context configuration'
    });
  }
}));

module.exports = router;