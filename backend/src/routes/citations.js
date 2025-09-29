/**
 * Citations API Routes
 * Handles interactive citations, document previews, and citation analytics
 */

const express = require('express');
const CitationService = require('../services/CitationService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const citationService = new CitationService();

/**
 * @route POST /api/citations/generate
 * @desc Generate enhanced citations from context chunks and generated content
 * @access Public (would be Private in production)
 */
router.post('/generate', sanitizeInput, asyncHandler(async (req, res) => {
  const { contextChunks, generatedContent, projectName } = req.body;

  if (!contextChunks || !generatedContent) {
    return res.status(400).json({
      success: false,
      message: 'Context chunks and generated content are required'
    });
  }

  logger.info(`Generating enhanced citations for ${contextChunks.length} chunks`);

  try {
    const citations = await citationService.generateEnhancedCitations(
      contextChunks,
      generatedContent
    );

    res.json({
      success: true,
      data: {
        citations,
        totalCitations: citations.length,
        projectName: projectName || 'Unknown',
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error(`Error generating citations: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error generating enhanced citations',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/citations/preview/:documentId/:chunkIndex?
 * @desc Get document preview for citation navigation
 * @access Public (would be Private in production)
 */
router.get('/preview/:documentId/:chunkIndex?', asyncHandler(async (req, res) => {
  const { documentId, chunkIndex = 0 } = req.params;
  const {
    contextLines = 5,
    highlightTerms = '',
    includeMetadata = 'true'
  } = req.query;

  if (!documentId || isNaN(parseInt(documentId))) {
    return res.status(400).json({
      success: false,
      message: 'Valid document ID is required'
    });
  }

  logger.info(`Getting document preview: document ${documentId}, chunk ${chunkIndex}`);

  try {
    const options = {
      contextLines: parseInt(contextLines),
      highlightTerms: highlightTerms ? highlightTerms.split(',').map(t => t.trim()) : [],
      includeMetadata: includeMetadata === 'true'
    };

    const preview = await citationService.getDocumentPreview(
      parseInt(documentId),
      parseInt(chunkIndex),
      options
    );

    res.json({
      success: true,
      data: preview
    });

  } catch (error) {
    logger.error(`Error getting document preview: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving document preview',
      error: error.message
    });
  }
}));

/**
 * @route POST /api/citations/track-access
 * @desc Track citation access for analytics
 * @access Public (would be Private in production)
 */
router.post('/track-access', sanitizeInput, asyncHandler(async (req, res) => {
  const {
    citationId,
    projectName,
    accessType = 'view',
    userId = 'anonymous',
    duration = null,
    userRating = null
  } = req.body;

  if (!citationId || !projectName) {
    return res.status(400).json({
      success: false,
      message: 'Citation ID and project name are required'
    });
  }

  logger.info(`Tracking citation access: ${citationId} in ${projectName}`);

  try {
    await citationService.trackCitationAccess(citationId, projectName, {
      userId,
      accessType,
      duration,
      userRating
    });

    res.json({
      success: true,
      message: 'Citation access tracked successfully'
    });

  } catch (error) {
    logger.error(`Error tracking citation access: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error tracking citation access',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/citations/analytics/:projectName
 * @desc Get citation analytics for a project
 * @access Public (would be Admin in production)
 */
router.get('/analytics/:projectName', asyncHandler(async (req, res) => {
  const { projectName } = req.params;
  const { days = 30 } = req.query;

  if (!projectName) {
    return res.status(400).json({
      success: false,
      message: 'Project name is required'
    });
  }

  logger.info(`Getting citation analytics for ${projectName} (${days} days)`);

  try {
    const analytics = await citationService.getCitationAnalytics(
      projectName,
      parseInt(days)
    );

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error(`Error getting citation analytics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving citation analytics',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/citations/navigation/:documentId
 * @desc Get document navigation structure for citation browsing
 * @access Public (would be Private in production)
 */
router.get('/navigation/:documentId', asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  if (!documentId || isNaN(parseInt(documentId))) {
    return res.status(400).json({
      success: false,
      message: 'Valid document ID is required'
    });
  }

  logger.info(`Getting navigation structure for document ${documentId}`);

  try {
    // Get basic document preview to extract navigation structure
    const preview = await citationService.getDocumentPreview(
      parseInt(documentId),
      0,
      { contextLines: 0, includeMetadata: true }
    );

    const navigation = {
      documentInfo: preview.documentInfo,
      sections: preview.content.navigation.sections,
      totalChunks: preview.content.navigation.totalChunks,
      tableOfContents: Object.keys(preview.content.navigation.sections).map(sectionType => ({
        section: sectionType,
        chunks: preview.content.navigation.sections[sectionType],
        displayName: sectionType.replace('_', ' ').toUpperCase()
      }))
    };

    res.json({
      success: true,
      data: navigation
    });

  } catch (error) {
    logger.error(`Error getting document navigation: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving document navigation',
      error: error.message
    });
  }
}));

/**
 * @route POST /api/citations/feedback
 * @desc Submit feedback on citation quality and relevance
 * @access Public (would be Private in production)
 */
router.post('/feedback', sanitizeInput, asyncHandler(async (req, res) => {
  const {
    citationId,
    projectName,
    rating,
    feedback,
    userId = 'anonymous',
    feedbackType = 'quality'
  } = req.body;

  if (!citationId || !projectName || typeof rating !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'Citation ID, project name, and numeric rating are required'
    });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5'
    });
  }

  logger.info(`Recording citation feedback: ${citationId} rated ${rating}/5`);

  try {
    // Track feedback as a special type of citation access
    await citationService.trackCitationAccess(citationId, projectName, {
      userId,
      accessType: 'feedback',
      userRating: rating,
      duration: null
    });

    // Log detailed feedback for future analysis
    logger.info(`Citation feedback details: ${JSON.stringify({
      citationId,
      projectName,
      rating,
      feedback,
      feedbackType,
      userId,
      timestamp: new Date().toISOString()
    })}`);

    res.json({
      success: true,
      message: 'Citation feedback recorded successfully',
      data: {
        citationId,
        rating,
        recorded: true
      }
    });

  } catch (error) {
    logger.error(`Error recording citation feedback: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error recording citation feedback',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/citations/health
 * @desc Check citation service health
 * @access Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    // Basic health check
    const healthStatus = {
      status: 'healthy',
      service: 'CitationService',
      timestamp: new Date().toISOString(),
      features: {
        citationGeneration: true,
        documentPreview: true,
        analyticsTracking: true,
        navigationSupport: true
      }
    };

    res.json({
      success: true,
      data: healthStatus
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      data: {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}));

/**
 * @route GET /api/citations/search/:projectName
 * @desc Search citations within a project
 * @access Public (would be Private in production)
 */
router.get('/search/:projectName', asyncHandler(async (req, res) => {
  const { projectName } = req.params;
  const {
    query = '',
    documentType = '',
    section = '',
    limit = 20,
    offset = 0
  } = req.query;

  if (!projectName) {
    return res.status(400).json({
      success: false,
      message: 'Project name is required'
    });
  }

  logger.info(`Searching citations in ${projectName}: "${query}"`);

  try {
    // Mock search results - in production would query citation database
    const searchResults = {
      query,
      projectName,
      filters: {
        documentType: documentType || 'all',
        section: section || 'all'
      },
      results: [],
      totalResults: 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
      searchedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: searchResults
    });

  } catch (error) {
    logger.error(`Error searching citations: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error searching citations',
      error: error.message
    });
  }
}));

module.exports = router;