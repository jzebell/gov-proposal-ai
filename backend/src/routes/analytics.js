/**
 * Analytics API Routes
 * Performance monitoring and analytics for the Context Management System
 */

const express = require('express');
const AnalyticsService = require('../services/AnalyticsService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const analyticsService = new AnalyticsService();

/**
 * @route GET /api/analytics/dashboard
 * @desc Get comprehensive dashboard analytics
 * @access Admin
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const {
    timeRange = 24,
    projectName = null,
    includeRealtime = 'true'
  } = req.query;

  logger.info(`Getting dashboard analytics: ${timeRange}h range${projectName ? ` for ${projectName}` : ''}`);

  try {
    const analytics = await analyticsService.getDashboardAnalytics({
      timeRange: parseInt(timeRange),
      projectName: projectName || null,
      includeRealtime: includeRealtime === 'true'
    });

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error(`Error getting dashboard analytics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dashboard analytics',
      error: error.message
    });
  }
}));

/**
 * @route POST /api/analytics/context-build
 * @desc Record context build performance metrics
 * @access System
 */
router.post('/context-build', sanitizeInput, asyncHandler(async (req, res) => {
  const buildData = req.body;

  if (!buildData.projectName || !buildData.documentType ||
      typeof buildData.buildStartTime !== 'number' ||
      typeof buildData.buildEndTime !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'Project name, document type, build start time, and build end time are required'
    });
  }

  logger.info(`Recording context build metric for ${buildData.projectName}/${buildData.documentType}`);

  try {
    const metric = await analyticsService.recordContextBuild(buildData);

    res.json({
      success: true,
      data: metric,
      message: 'Context build metric recorded successfully'
    });

  } catch (error) {
    logger.error(`Error recording context build metric: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error recording context build metric',
      error: error.message
    });
  }
}));

/**
 * @route POST /api/analytics/citation-access
 * @desc Record citation access analytics
 * @access System
 */
router.post('/citation-access', sanitizeInput, asyncHandler(async (req, res) => {
  const accessData = req.body;

  if (!accessData.citationId || !accessData.projectName) {
    return res.status(400).json({
      success: false,
      message: 'Citation ID and project name are required'
    });
  }

  logger.info(`Recording citation access for ${accessData.citationId}`);

  try {
    const metric = await analyticsService.recordCitationAccess(accessData);

    res.json({
      success: true,
      data: metric,
      message: 'Citation access recorded successfully'
    });

  } catch (error) {
    logger.error(`Error recording citation access: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error recording citation access',
      error: error.message
    });
  }
}));

/**
 * @route POST /api/analytics/overflow-event
 * @desc Record context overflow events
 * @access System
 */
router.post('/overflow-event', sanitizeInput, asyncHandler(async (req, res) => {
  const overflowData = req.body;

  if (!overflowData.projectName || !overflowData.documentType ||
      typeof overflowData.requestedTokens !== 'number' ||
      typeof overflowData.maxTokens !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'Project name, document type, requested tokens, and max tokens are required'
    });
  }

  logger.info(`Recording overflow event for ${overflowData.projectName}/${overflowData.documentType}`);

  try {
    const metric = await analyticsService.recordOverflowEvent(overflowData);

    res.json({
      success: true,
      data: metric,
      message: 'Overflow event recorded successfully'
    });

  } catch (error) {
    logger.error(`Error recording overflow event: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error recording overflow event',
      error: error.message
    });
  }
}));

/**
 * @route POST /api/analytics/system-metric
 * @desc Record general system performance metrics
 * @access System
 */
router.post('/system-metric', sanitizeInput, asyncHandler(async (req, res) => {
  const systemData = req.body;

  if (!systemData.metricType || typeof systemData.metricValue !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'Metric type and numeric metric value are required'
    });
  }

  logger.info(`Recording system metric: ${systemData.metricType} = ${systemData.metricValue}`);

  try {
    const metric = await analyticsService.recordSystemMetric(systemData);

    res.json({
      success: true,
      data: metric,
      message: 'System metric recorded successfully'
    });

  } catch (error) {
    logger.error(`Error recording system metric: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error recording system metric',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/analytics/performance/:projectName?
 * @desc Get context build performance analytics
 * @access Admin
 */
router.get('/performance/:projectName?', asyncHandler(async (req, res) => {
  const { projectName } = req.params;
  const { timeRange = 24 } = req.query;

  logger.info(`Getting performance analytics${projectName ? ` for ${projectName}` : ''}`);

  try {
    const cutoffTime = new Date(Date.now() - (parseInt(timeRange) * 60 * 60 * 1000));
    const analytics = await analyticsService.getContextBuildAnalytics(cutoffTime, projectName);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error(`Error getting performance analytics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving performance analytics',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/analytics/citations/:projectName?
 * @desc Get citation usage analytics
 * @access Admin
 */
router.get('/citations/:projectName?', asyncHandler(async (req, res) => {
  const { projectName } = req.params;
  const { timeRange = 24 } = req.query;

  logger.info(`Getting citation analytics${projectName ? ` for ${projectName}` : ''}`);

  try {
    const cutoffTime = new Date(Date.now() - (parseInt(timeRange) * 60 * 60 * 1000));
    const analytics = await analyticsService.getCitationUsageAnalytics(cutoffTime, projectName);

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
 * @route GET /api/analytics/overflows/:projectName?
 * @desc Get overflow analytics
 * @access Admin
 */
router.get('/overflows/:projectName?', asyncHandler(async (req, res) => {
  const { projectName } = req.params;
  const { timeRange = 24 } = req.query;

  logger.info(`Getting overflow analytics${projectName ? ` for ${projectName}` : ''}`);

  try {
    const cutoffTime = new Date(Date.now() - (parseInt(timeRange) * 60 * 60 * 1000));
    const analytics = await analyticsService.getOverflowAnalytics(cutoffTime, projectName);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error(`Error getting overflow analytics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving overflow analytics',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/analytics/users/:projectName?
 * @desc Get user engagement metrics
 * @access Admin
 */
router.get('/users/:projectName?', asyncHandler(async (req, res) => {
  const { projectName } = req.params;
  const { timeRange = 24 } = req.query;

  logger.info(`Getting user engagement analytics${projectName ? ` for ${projectName}` : ''}`);

  try {
    const cutoffTime = new Date(Date.now() - (parseInt(timeRange) * 60 * 60 * 1000));
    const analytics = await analyticsService.getUserEngagementMetrics(cutoffTime, projectName);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error(`Error getting user engagement analytics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user engagement analytics',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/analytics/trends/:projectName?
 * @desc Get performance trends
 * @access Admin
 */
router.get('/trends/:projectName?', asyncHandler(async (req, res) => {
  const { projectName } = req.params;
  const { timeRange = 24 } = req.query;

  logger.info(`Getting performance trends${projectName ? ` for ${projectName}` : ''}`);

  try {
    const cutoffTime = new Date(Date.now() - (parseInt(timeRange) * 60 * 60 * 1000));
    const analytics = await analyticsService.getPerformanceTrends(cutoffTime, projectName);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error(`Error getting performance trends: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving performance trends',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/analytics/realtime
 * @desc Get real-time system metrics
 * @access Admin
 */
router.get('/realtime', asyncHandler(async (req, res) => {
  logger.info('Getting real-time analytics');

  try {
    const metrics = await analyticsService.getRealtimeMetrics();

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error(`Error getting real-time metrics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving real-time metrics',
      error: error.message
    });
  }
}));

/**
 * @route POST /api/analytics/export
 * @desc Export analytics data
 * @access Admin
 */
router.post('/export', sanitizeInput, asyncHandler(async (req, res) => {
  const {
    format = 'json',
    timeRange = 24,
    projectName = null,
    includeRawData = false
  } = req.body;

  logger.info(`Exporting analytics data: ${format} format, ${timeRange}h range`);

  try {
    const exportData = await analyticsService.exportAnalytics({
      format,
      timeRange: parseInt(timeRange),
      projectName,
      includeRawData
    });

    // Set appropriate headers for download
    res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${Date.now()}.${format}`);

    if (format === 'json') {
      res.json({
        success: true,
        data: exportData
      });
    } else {
      // For future CSV support
      res.json({
        success: true,
        data: exportData,
        message: 'CSV export format will be implemented in future version'
      });
    }

  } catch (error) {
    logger.error(`Error exporting analytics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error exporting analytics data',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/analytics/health
 * @desc Check analytics service health
 * @access Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      service: 'AnalyticsService',
      timestamp: new Date().toISOString(),
      features: {
        contextBuildTracking: true,
        citationAnalytics: true,
        overflowMonitoring: true,
        realTimeMetrics: true,
        dataExport: true
      },
      dataPoints: {
        contextBuilds: analyticsService.performanceData.contextBuilds.length,
        citations: analyticsService.performanceData.citationAccess.length,
        overflows: analyticsService.performanceData.overflowEvents.length,
        systemMetrics: analyticsService.performanceData.systemMetrics.length
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
 * @route GET /api/analytics/summary/:projectName?
 * @desc Get executive summary of analytics
 * @access Admin
 */
router.get('/summary/:projectName?', asyncHandler(async (req, res) => {
  const { projectName } = req.params;
  const { timeRange = 24 } = req.query;

  logger.info(`Getting analytics summary${projectName ? ` for ${projectName}` : ''}`);

  try {
    const dashboard = await analyticsService.getDashboardAnalytics({
      timeRange: parseInt(timeRange),
      projectName,
      includeRealtime: true
    });

    // Extract key summary metrics
    const summary = {
      systemHealth: {
        overallStatus: dashboard.systemOverview.successRate > 90 ? 'excellent' :
                      dashboard.systemOverview.successRate > 70 ? 'good' : 'needs_attention',
        successRate: dashboard.systemOverview.successRate,
        averageBuildTime: dashboard.systemOverview.averageBuildTime,
        cacheHitRate: dashboard.systemOverview.cacheHitRate
      },

      usage: {
        totalBuilds: dashboard.systemOverview.totalContextBuilds,
        totalCitations: dashboard.systemOverview.totalCitationAccesses,
        activeProjects: dashboard.userEngagement.activeProjects,
        activeUsers: dashboard.userEngagement.activeUsers
      },

      performance: {
        buildTrend: dashboard.trends.trend,
        volumeTrend: dashboard.trends.buildVolumeTrend,
        overflowRate: dashboard.overflowAnalytics.totalOverflows > 0 ?
          ((dashboard.overflowAnalytics.totalOverflows / dashboard.systemOverview.totalContextBuilds) * 100).toFixed(2) : 0
      },

      recommendations: this.generateRecommendations(dashboard),

      generatedAt: dashboard.generatedAt,
      timeRange: dashboard.timeRange
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error(`Error getting analytics summary: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving analytics summary',
      error: error.message
    });
  }
}));

// Helper function to generate recommendations
function generateRecommendations(dashboard) {
  const recommendations = [];

  // Performance recommendations
  if (dashboard.systemOverview.averageBuildTime > 5000) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      message: 'Average build time exceeds 5 seconds. Consider optimizing document processing or enabling more aggressive caching.'
    });
  }

  // Cache recommendations
  if (dashboard.systemOverview.cacheHitRate < 60) {
    recommendations.push({
      type: 'caching',
      priority: 'medium',
      message: 'Cache hit rate is below 60%. Review cache configuration and document change patterns.'
    });
  }

  // Overflow recommendations
  if (dashboard.overflowAnalytics.totalOverflows > dashboard.systemOverview.totalContextBuilds * 0.1) {
    recommendations.push({
      type: 'overflow',
      priority: 'high',
      message: 'High overflow rate detected. Consider increasing token limits or implementing more aggressive document filtering.'
    });
  }

  // User engagement recommendations
  if (dashboard.citationAnalytics.bounceRate > 50) {
    recommendations.push({
      type: 'engagement',
      priority: 'medium',
      message: 'High bounce rate in citations. Review citation relevance and user interface design.'
    });
  }

  return recommendations;
}

module.exports = router;