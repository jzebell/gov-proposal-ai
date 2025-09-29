/**
 * Context Management API Routes
 * Handles document context building and retrieval for AI operations
 */

const express = require('express');
const ContextService = require('../services/ContextService');
const ContextOverflowService = require('../services/ContextOverflowService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const contextService = new ContextService();
const overflowService = new ContextOverflowService();

/**
 * @route GET /api/context/summary/:projectName/:documentType
 * @desc Get context summary for UI display
 * @access Public (would be Private in production)
 */
router.get('/summary/:projectName/:documentType', asyncHandler(async (req, res) => {
  const { projectName, documentType } = req.params;

  if (!projectName || !documentType) {
    return res.status(400).json({
      success: false,
      message: 'Project name and document type are required'
    });
  }

  logger.info(`Getting context summary for ${projectName}/${documentType}`);

  const summary = await contextService.getContextSummary(projectName, documentType);

  res.json({
    success: true,
    data: summary
  });
}));

/**
 * @route GET /api/context/:projectName/:documentType
 * @desc Get or trigger context building for a project
 * @access Public (would be Private in production)
 */
router.get('/:projectName/:documentType', asyncHandler(async (req, res) => {
  const { projectName, documentType } = req.params;
  const { forceRebuild } = req.query;

  if (!projectName || !documentType) {
    return res.status(400).json({
      success: false,
      message: 'Project name and document type are required'
    });
  }

  logger.info(`Context request for ${projectName}/${documentType}`);

  // If force rebuild requested, cancel any pending builds and trigger new one
  if (forceRebuild === 'true') {
    contextService.cancelContextBuild(projectName, documentType);
    // Mark as failed to force rebuild
    await contextService.projectContext.markFailed(projectName, documentType, 'Force rebuild requested');
  }

  const result = await contextService.getProjectContext(projectName, documentType);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/context/trigger
 * @desc Manually trigger context building
 * @access Public (would be Private in production)
 */
router.post('/trigger', sanitizeInput, asyncHandler(async (req, res) => {
  const { projectName, documentType, immediate } = req.body;

  if (!projectName || !documentType) {
    return res.status(400).json({
      success: false,
      message: 'Project name and document type are required'
    });
  }

  logger.info(`Manual context build trigger for ${projectName}/${documentType}`);

  if (immediate) {
    // Build immediately without delay
    await contextService.buildProjectContext(projectName, documentType);
  } else {
    // Use normal delayed building
    contextService.triggerContextBuild(projectName, documentType);
  }

  res.json({
    success: true,
    message: immediate ? 'Context build started immediately' : 'Context build scheduled'
  });
}));

/**
 * @route DELETE /api/context/:projectName/:documentType
 * @desc Clear cached context for a project
 * @access Public (would be Private in production)
 */
router.delete('/:projectName/:documentType', asyncHandler(async (req, res) => {
  const { projectName, documentType } = req.params;

  if (!projectName || !documentType) {
    return res.status(400).json({
      success: false,
      message: 'Project name and document type are required'
    });
  }

  logger.info(`Clearing context cache for ${projectName}/${documentType}`);

  // Cancel any pending builds
  contextService.cancelContextBuild(projectName, documentType);

  // Mark as failed to clear the cache
  await contextService.projectContext.markFailed(projectName, documentType, 'Cache cleared by user');

  res.json({
    success: true,
    message: 'Context cache cleared'
  });
}));

/**
 * @route GET /api/context/health
 * @desc Check context service health
 * @access Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    // Test database connectivity
    const testStatus = await contextService.projectContext.getBuildStatus('health-check', 'test');

    res.json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      }
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
 * @route POST /api/context/cleanup
 * @desc Clean up old context caches
 * @access Public (would be Admin in production)
 */
router.post('/cleanup', asyncHandler(async (req, res) => {
  const { olderThanHours = 24 } = req.body;

  logger.info(`Running context cleanup (older than ${olderThanHours} hours)`);

  await contextService.cleanup();

  res.json({
    success: true,
    message: `Context cleanup completed for entries older than ${olderThanHours} hours`
  });
}));

/**
 * @route POST /api/context/overflow/check
 * @desc Check if context will overflow token limits
 * @access Public (would be Private in production)
 */
router.post('/overflow/check', sanitizeInput, asyncHandler(async (req, res) => {
  const { projectName, documentType, modelType = 'medium' } = req.body;

  if (!projectName || !documentType) {
    return res.status(400).json({
      success: false,
      message: 'Project name and document type are required'
    });
  }

  logger.info(`Checking context overflow for ${projectName}/${documentType} (${modelType})`);

  try {
    // Get project documents and context chunks
    const documents = await contextService.getProjectDocuments(projectName, documentType);

    if (documents.length === 0) {
      return res.json({
        success: true,
        data: {
          willOverflow: false,
          currentTokens: 0,
          maxContextTokens: 0,
          documentBreakdown: [],
          recommendations: { priorityMessage: 'No documents found' }
        }
      });
    }

    // Process documents to get context chunks
    const contextData = await contextService.processDocuments(documents);

    // Check for overflow
    const overflowAnalysis = await overflowService.checkContextOverflow(
      documents,
      contextData.chunks,
      modelType
    );

    res.json({
      success: true,
      data: overflowAnalysis
    });

  } catch (error) {
    logger.error(`Error checking overflow: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error checking context overflow',
      error: error.message
    });
  }
}));

/**
 * @route POST /api/context/overflow/select
 * @desc Apply manual document selection and return filtered context
 * @access Public (would be Private in production)
 */
router.post('/overflow/select', sanitizeInput, asyncHandler(async (req, res) => {
  const { projectName, documentType, selectedDocumentIds, modelType = 'medium' } = req.body;

  if (!projectName || !documentType || !Array.isArray(selectedDocumentIds)) {
    return res.status(400).json({
      success: false,
      message: 'Project name, document type, and selected document IDs array are required'
    });
  }

  logger.info(`Applying document selection for ${projectName}/${documentType}: ${selectedDocumentIds.length} documents`);

  try {
    // Get all documents and process them
    const documents = await contextService.getProjectDocuments(projectName, documentType);
    const contextData = await contextService.processDocuments(documents);

    // Apply document selection filter
    const filteredChunks = overflowService.applyDocumentSelection(
      selectedDocumentIds,
      contextData.chunks
    );

    // Calculate new token usage
    const newTokenUsage = overflowService.calculateTokenUsage(filteredChunks);

    // Get context configuration for token limits
    const contextConfig = await overflowService.getContextConfiguration();
    const modelLimits = contextConfig.modelCategories[modelType];
    const maxContextTokens = Math.floor(
      modelLimits.max_tokens * (contextConfig.tokenAllocation.context_percent / 100)
    );

    // Build filtered context data
    const filteredContextData = {
      chunks: filteredChunks,
      failedDocuments: contextData.failedDocuments,
      processedAt: new Date().toISOString(),
      metadata: {
        tokenCount: newTokenUsage,
        documentCount: selectedDocumentIds.length,
        chunkCount: filteredChunks.length,
        isFiltered: true,
        originalDocumentCount: documents.length,
        originalTokenCount: overflowService.calculateTokenUsage(contextData.chunks)
      }
    };

    // Save filtered context to cache
    await contextService.projectContext.saveContext(
      projectName,
      documentType,
      filteredContextData,
      filteredContextData.metadata
    );

    res.json({
      success: true,
      data: {
        appliedSelection: true,
        selectedDocuments: selectedDocumentIds.length,
        totalDocuments: documents.length,
        newTokenCount: newTokenUsage,
        maxTokens: maxContextTokens,
        withinLimits: newTokenUsage <= maxContextTokens,
        context: filteredContextData
      }
    });

  } catch (error) {
    logger.error(`Error applying document selection: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error applying document selection',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/context/overflow/stats/:projectName
 * @desc Get overflow statistics for a project
 * @access Public (would be Admin in production)
 */
router.get('/overflow/stats/:projectName', asyncHandler(async (req, res) => {
  const { projectName } = req.params;
  const { days = 30 } = req.query;

  logger.info(`Getting overflow statistics for ${projectName} (${days} days)`);

  try {
    const stats = await overflowService.getOverflowStatistics(projectName, parseInt(days));

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error(`Error getting overflow statistics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving overflow statistics',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/context/overflow/analysis/:projectName/:documentType
 * @desc Get detailed overflow analysis without processing (faster preview)
 * @access Public (would be Private in production)
 */
router.get('/overflow/analysis/:projectName/:documentType', asyncHandler(async (req, res) => {
  const { projectName, documentType } = req.params;
  const { modelType = 'medium' } = req.query;

  logger.info(`Getting overflow analysis preview for ${projectName}/${documentType}`);

  try {
    // Get documents without full processing
    const documents = await contextService.getProjectDocuments(projectName, documentType);

    if (documents.length === 0) {
      return res.json({
        success: true,
        data: {
          hasDocuments: false,
          documentCount: 0,
          estimatedTokens: 0
        }
      });
    }

    // Calculate estimated tokens based on document sizes
    let estimatedTokens = 0;
    const documentSummary = documents.map(doc => {
      const estimatedDocTokens = Math.ceil((doc.size || 0) / 4); // Rough estimation
      estimatedTokens += estimatedDocTokens;

      return {
        id: doc.id,
        name: doc.originalName,
        category: doc.category,
        estimatedTokens: estimatedDocTokens,
        size: doc.size,
        priorityScore: overflowService.calculateDocumentPriorityScore(doc),
        relevanceScore: overflowService.calculateRelevanceScore(doc)
      };
    });

    // Get token limits
    const contextConfig = await overflowService.getContextConfiguration();
    const modelLimits = contextConfig.modelCategories[modelType];
    const maxContextTokens = Math.floor(
      modelLimits.max_tokens * (contextConfig.tokenAllocation.context_percent / 100)
    );

    res.json({
      success: true,
      data: {
        hasDocuments: true,
        documentCount: documents.length,
        estimatedTokens,
        maxContextTokens,
        willLikelyOverflow: estimatedTokens > maxContextTokens,
        overflowEstimate: Math.max(0, estimatedTokens - maxContextTokens),
        documents: documentSummary.sort((a, b) => {
          // Sort by priority score first, then relevance
          if (a.priorityScore !== b.priorityScore) {
            return a.priorityScore - b.priorityScore;
          }
          return b.relevanceScore - a.relevanceScore;
        })
      }
    });

  } catch (error) {
    logger.error(`Error getting overflow analysis: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error getting overflow analysis',
      error: error.message
    });
  }
}));

module.exports = router;