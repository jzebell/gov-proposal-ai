/**
 * AI Writing API Routes
 * Epic 3: AI-powered proposal writing endpoints
 */

const express = require('express');
const AIWritingService = require('../services/AIWritingService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const aiWritingService = new AIWritingService();

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
      currentModel: process.env.OLLAMA_MODEL || 'qwen2.5:14b',
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

module.exports = router;