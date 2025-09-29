/**
 * AI Writing API Routes
 * Epic 3: AI-powered proposal writing endpoints
 */

const express = require('express');
const AIWritingService = require('../services/AIWritingService');
const ModelWarmupService = require('../services/ModelWarmupService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const aiWritingService = new AIWritingService();
const modelWarmupService = new ModelWarmupService();

/**
 * @route POST /api/ai-writing/generate
 * @desc Generate content using AI (v2.1 enhanced endpoint)
 * @access Public (would be Private in production)
 */
router.post('/generate', sanitizeInput, asyncHandler(async (req, res) => {
  const { prompt, model, noHallucinations, showThinking, projectContext, personaId } = req.body;

  if (!prompt) {
    return res.status(400).json({
      success: false,
      message: 'Prompt is required'
    });
  }

  logger.info(`Generating content with model: ${model || 'default'}`);

  try {
    // For now, use the existing generateSection method
    // This will be enhanced when the AIWritingService is updated for v2.1
    const result = await aiWritingService.generateSection(
      prompt,
      null, // sectionType is deprecated in favor of personas
      {
        model,
        noHallucinations,
        showThinking,
        projectContext,
        personaId
      }
    );

    res.json({
      success: true,
      data: {
        content: result.content || result.text || result,
        model: model || 'default',
        tokens: result.tokens || prompt.split(' ').length,
        citations: result.citations || []
      }
    });
  } catch (error) {
    logger.error(`Error generating content: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to generate content',
      error: error.message
    });
  }
}));

/**
 * @route POST /api/ai-writing/generate-section
 * @desc Generate a proposal section using AI
 * @access Public (would be Private in production)
 */
router.post('/generate-section', sanitizeInput, asyncHandler(async (req, res) => {
  const { prompt, sectionType, requirements } = req.body;

  if (!prompt || !sectionType) {
    return res.status(400).json({
      success: false,
      message: 'Prompt and section type are required'
    });
  }

  logger.info(`Generating ${sectionType} section`);

  const result = await aiWritingService.generateSection(prompt, sectionType, requirements || {});

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/ai-writing/analyze-solicitation
 * @desc Analyze solicitation document and extract requirements
 * @access Public
 */
router.post('/analyze-solicitation', sanitizeInput, asyncHandler(async (req, res) => {
  const { documentText } = req.body;

  if (!documentText) {
    return res.status(400).json({
      success: false,
      message: 'Document text is required'
    });
  }

  logger.info('Analyzing solicitation document');

  const result = await aiWritingService.analyzeSolicitation(documentText);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/ai-writing/improve-content
 * @desc Improve existing content with AI suggestions
 * @access Public
 */
router.post('/improve-content', sanitizeInput, asyncHandler(async (req, res) => {
  const { content, improvementType } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      message: 'Content is required'
    });
  }

  logger.info(`Improving content: ${improvementType || 'general'}`);

  const result = await aiWritingService.improveContent(content, improvementType);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/ai-writing/executive-summary
 * @desc Generate executive summary from proposal data
 * @access Public
 */
router.post('/executive-summary', sanitizeInput, asyncHandler(async (req, res) => {
  const proposalData = req.body;

  logger.info('Generating executive summary');

  const result = await aiWritingService.generateExecutiveSummary(proposalData);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route GET /api/ai-writing/models
 * @desc Get available AI models
 * @access Public
 */
router.get('/models', asyncHandler(async (req, res) => {
  const models = await aiWritingService.getAvailableModels();

  res.json({
    success: true,
    data: {
      models,
      currentModel: process.env.OLLAMA_MODEL || 'gemma2:9b',
      ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434'
    }
  });
}));

/**
 * @route GET /api/ai-writing/health
 * @desc Check AI service health
 * @access Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  const isAvailable = await aiWritingService.isAvailable();

  res.json({
    success: true,
    data: {
      available: isAvailable,
      service: 'Ollama',
      timestamp: new Date().toISOString()
    }
  });
}));

/**
 * @route GET /api/ai-writing/templates
 * @desc Get proposal section templates
 * @access Public
 */
router.get('/templates', asyncHandler(async (req, res) => {
  const templates = {
    'technical-approach': {
      name: 'Technical Approach',
      description: 'Detailed technical methodology and implementation plan',
      sections: [
        'Understanding of Requirements',
        'Technical Methodology',
        'Architecture and Design',
        'Implementation Plan',
        'Quality Assurance',
        'Risk Mitigation'
      ],
      samplePrompt: 'Create a technical approach for implementing a cloud-based document management system for a federal agency...'
    },
    'management-plan': {
      name: 'Management Plan',
      description: 'Project management approach and team structure',
      sections: [
        'Project Management Methodology',
        'Team Structure and Roles',
        'Communication Plan',
        'Schedule Management',
        'Risk Management',
        'Quality Management'
      ],
      samplePrompt: 'Develop a management plan for a 12-month software development project with a team of 8 developers...'
    },
    'past-performance': {
      name: 'Past Performance',
      description: 'Relevant experience and successful project outcomes',
      sections: [
        'Project Overview',
        'Technical Challenges',
        'Solutions Implemented',
        'Results Achieved',
        'Lessons Learned',
        'Client References'
      ],
      samplePrompt: 'Write a past performance narrative for a similar cloud migration project we completed for the Department of Defense...'
    },
    'executive-summary': {
      name: 'Executive Summary',
      description: 'High-level overview and value proposition',
      sections: [
        'Understanding of Requirements',
        'Proposed Solution',
        'Key Benefits',
        'Team Qualifications',
        'Value Proposition'
      ],
      samplePrompt: 'Create an executive summary for our proposal to modernize the agency\'s legacy IT infrastructure...'
    }
  };

  res.json({
    success: true,
    data: templates
  });
}));

/**
 * @route POST /api/ai-writing/batch-generate
 * @desc Generate multiple sections in batch
 * @access Public
 */
router.post('/batch-generate', sanitizeInput, asyncHandler(async (req, res) => {
  const { sections } = req.body;

  if (!sections || !Array.isArray(sections)) {
    return res.status(400).json({
      success: false,
      message: 'Sections array is required'
    });
  }

  logger.info(`Batch generating ${sections.length} sections`);

  const results = [];
  const errors = [];

  for (const section of sections) {
    try {
      const result = await aiWritingService.generateSection(
        section.prompt,
        section.sectionType,
        section.requirements || {}
      );
      results.push({
        sectionType: section.sectionType,
        result
      });
    } catch (error) {
      errors.push({
        sectionType: section.sectionType,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    data: {
      results,
      errors,
      totalSections: sections.length,
      successCount: results.length,
      errorCount: errors.length
    }
  });
}));

/**
 * @route GET /api/ai-writing/warmup/status
 * @desc Get model warm-up status
 * @access Public
 */
router.get('/warmup/status', asyncHandler(async (req, res) => {
  const { model } = req.query;

  try {
    const status = modelWarmupService.getWarmupStatus(model);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error(`Error getting warmup status: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get warmup status',
      error: error.message
    });
  }
}));

/**
 * @route POST /api/ai-writing/warmup/model
 * @desc Warm up a specific model
 * @access Public
 */
router.post('/warmup/model', sanitizeInput, asyncHandler(async (req, res) => {
  const { model, priority = 'normal' } = req.body;

  if (!model) {
    return res.status(400).json({
      success: false,
      message: 'Model name is required'
    });
  }

  try {
    const result = await modelWarmupService.warmupModel(model, priority);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error warming up model: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to warm up model',
      error: error.message
    });
  }
}));

/**
 * @route POST /api/ai-writing/warmup/smart
 * @desc Perform smart warm-up based on context
 * @access Public
 */
router.post('/warmup/smart', sanitizeInput, asyncHandler(async (req, res) => {
  const context = req.body || {};

  try {
    const result = await modelWarmupService.smartWarmup(context);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error performing smart warmup: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to perform smart warmup',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/ai-writing/warmup/health
 * @desc Get warm-up service health status
 * @access Public
 */
router.get('/warmup/health', asyncHandler(async (req, res) => {
  try {
    const health = await modelWarmupService.getServiceHealth();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error(`Error getting warmup service health: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get warmup service health',
      error: error.message
    });
  }
}));

module.exports = router;