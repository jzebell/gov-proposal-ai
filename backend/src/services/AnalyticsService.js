/**
 * Analytics Service
 * Comprehensive performance monitoring and analytics for the Context Management System
 */

const GlobalSettingsService = require('./GlobalSettingsService');
const logger = require('../utils/logger');

class AnalyticsService {
  constructor() {
    this.globalSettingsService = new GlobalSettingsService();
    this.metricsCache = new Map();
    this.performanceData = {
      contextBuilds: [],
      citationAccess: [],
      overflowEvents: [],
      userSessions: [],
      systemMetrics: []
    };
  }

  /**
   * Record context build performance metrics
   * @param {Object} buildData - Context build information
   */
  async recordContextBuild(buildData) {
    try {
      const {
        projectName,
        documentType,
        buildStartTime,
        buildEndTime,
        tokenCount,
        documentCount,
        chunkCount,
        success,
        errorMessage = null,
        cacheHit = false
      } = buildData;

      const buildDuration = buildEndTime - buildStartTime;

      const metric = {
        timestamp: new Date().toISOString(),
        projectName,
        documentType,
        buildDuration,
        tokenCount,
        documentCount,
        chunkCount,
        success,
        errorMessage,
        cacheHit,
        tokensPerSecond: success ? Math.round(tokenCount / (buildDuration / 1000)) : 0,
        documentsPerSecond: success ? Math.round(documentCount / (buildDuration / 1000)) : 0
      };

      this.performanceData.contextBuilds.push(metric);
      logger.info(`Context build metric recorded: ${buildDuration}ms, ${tokenCount} tokens, success: ${success}`);

      // Keep only recent data (last 1000 records)
      if (this.performanceData.contextBuilds.length > 1000) {
        this.performanceData.contextBuilds = this.performanceData.contextBuilds.slice(-1000);
      }

      return metric;

    } catch (error) {
      logger.error(`Error recording context build metric: ${error.message}`);
      throw error;
    }
  }

  /**
   * Record citation access analytics
   * @param {Object} accessData - Citation access information
   */
  async recordCitationAccess(accessData) {
    try {
      const {
        citationId,
        projectName,
        documentId,
        accessType,
        userId = 'anonymous',
        duration = null,
        success = true
      } = accessData;

      const metric = {
        timestamp: new Date().toISOString(),
        citationId,
        projectName,
        documentId,
        accessType,
        userId,
        duration,
        success
      };

      this.performanceData.citationAccess.push(metric);

      // Keep only recent data (last 1000 records)
      if (this.performanceData.citationAccess.length > 1000) {
        this.performanceData.citationAccess = this.performanceData.citationAccess.slice(-1000);
      }

      return metric;

    } catch (error) {
      logger.error(`Error recording citation access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Record context overflow events
   * @param {Object} overflowData - Overflow event information
   */
  async recordOverflowEvent(overflowData) {
    try {
      const {
        projectName,
        documentType,
        requestedTokens,
        maxTokens,
        documentsSelected,
        userOverride = false,
        resolutionTime = null
      } = overflowData;

      const metric = {
        timestamp: new Date().toISOString(),
        projectName,
        documentType,
        requestedTokens,
        maxTokens,
        overflowAmount: requestedTokens - maxTokens,
        documentsSelected,
        userOverride,
        resolutionTime,
        overflowPercentage: ((requestedTokens - maxTokens) / maxTokens * 100).toFixed(2)
      };

      this.performanceData.overflowEvents.push(metric);

      // Keep only recent data (last 1000 records)
      if (this.performanceData.overflowEvents.length > 1000) {
        this.performanceData.overflowEvents = this.performanceData.overflowEvents.slice(-1000);
      }

      return metric;

    } catch (error) {
      logger.error(`Error recording overflow event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Record system performance metrics
   * @param {Object} systemData - System performance information
   */
  async recordSystemMetric(systemData) {
    try {
      const {
        metricType,
        metricValue,
        projectName = null,
        metadata = {}
      } = systemData;

      const metric = {
        timestamp: new Date().toISOString(),
        metricType,
        metricValue,
        projectName,
        metadata
      };

      this.performanceData.systemMetrics.push(metric);

      // Keep only recent data (last 1000 records)
      if (this.performanceData.systemMetrics.length > 1000) {
        this.performanceData.systemMetrics = this.performanceData.systemMetrics.slice(-1000);
      }

      return metric;

    } catch (error) {
      logger.error(`Error recording system metric: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate comprehensive analytics dashboard data
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Dashboard analytics data
   */
  async getDashboardAnalytics(options = {}) {
    try {
      const {
        timeRange = 24, // hours
        projectName = null,
        includeRealtime = true
      } = options;

      const cutoffTime = new Date(Date.now() - (timeRange * 60 * 60 * 1000));

      const analytics = {
        // System Overview
        systemOverview: await this.getSystemOverview(cutoffTime, projectName),

        // Context Build Performance
        contextPerformance: await this.getContextBuildAnalytics(cutoffTime, projectName),

        // Citation Usage Analytics
        citationAnalytics: await this.getCitationUsageAnalytics(cutoffTime, projectName),

        // Overflow Management Stats
        overflowAnalytics: await this.getOverflowAnalytics(cutoffTime, projectName),

        // User Engagement Metrics
        userEngagement: await this.getUserEngagementMetrics(cutoffTime, projectName),

        // Performance Trends
        trends: await this.getPerformanceTrends(cutoffTime, projectName),

        // Real-time Metrics (if enabled)
        realtime: includeRealtime ? await this.getRealtimeMetrics() : null,

        // Metadata
        generatedAt: new Date().toISOString(),
        timeRange: `${timeRange} hours`,
        projectFilter: projectName,
        dataPoints: this.getDataPointCount(cutoffTime)
      };

      return analytics;

    } catch (error) {
      logger.error(`Error generating dashboard analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get system overview metrics
   */
  async getSystemOverview(cutoffTime, projectName) {
    const contextBuilds = this.filterByTime(this.performanceData.contextBuilds, cutoffTime, projectName);
    const citations = this.filterByTime(this.performanceData.citationAccess, cutoffTime, projectName);
    const overflows = this.filterByTime(this.performanceData.overflowEvents, cutoffTime, projectName);

    const successfulBuilds = contextBuilds.filter(b => b.success).length;
    const failedBuilds = contextBuilds.filter(b => !b.success).length;

    return {
      totalContextBuilds: contextBuilds.length,
      successfulBuilds,
      failedBuilds,
      successRate: contextBuilds.length > 0 ? ((successfulBuilds / contextBuilds.length) * 100).toFixed(2) : 0,

      totalCitationAccesses: citations.length,
      uniqueDocumentsAccessed: new Set(citations.map(c => c.documentId)).size,

      overflowEvents: overflows.length,
      averageOverflowAmount: overflows.length > 0 ?
        (overflows.reduce((sum, o) => sum + o.overflowAmount, 0) / overflows.length).toFixed(0) : 0,

      totalTokensProcessed: contextBuilds.reduce((sum, b) => sum + (b.tokenCount || 0), 0),
      totalDocumentsProcessed: contextBuilds.reduce((sum, b) => sum + (b.documentCount || 0), 0),

      averageBuildTime: contextBuilds.length > 0 ?
        (contextBuilds.reduce((sum, b) => sum + b.buildDuration, 0) / contextBuilds.length).toFixed(0) : 0,

      cacheHitRate: contextBuilds.length > 0 ?
        ((contextBuilds.filter(b => b.cacheHit).length / contextBuilds.length) * 100).toFixed(2) : 0
    };
  }

  /**
   * Get context build performance analytics
   */
  async getContextBuildAnalytics(cutoffTime, projectName) {
    const builds = this.filterByTime(this.performanceData.contextBuilds, cutoffTime, projectName);

    // Performance distribution
    const durations = builds.map(b => b.buildDuration);
    const tokenCounts = builds.map(b => b.tokenCount || 0);

    // Hourly breakdown
    const hourlyData = this.groupByHour(builds);

    return {
      totalBuilds: builds.length,
      averageDuration: durations.length > 0 ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0) : 0,
      medianDuration: this.calculateMedian(durations),
      p95Duration: this.calculatePercentile(durations, 95),

      averageTokens: tokenCounts.length > 0 ? Math.round(tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length) : 0,
      maxTokens: Math.max(...tokenCounts, 0),

      performanceByDocumentType: this.groupByDocumentType(builds),
      performanceByProject: this.groupByProject(builds),
      hourlyPerformance: hourlyData,

      slowBuilds: builds.filter(b => b.buildDuration > 10000).length, // > 10 seconds
      fastBuilds: builds.filter(b => b.buildDuration < 1000).length,  // < 1 second

      errorRate: builds.length > 0 ? ((builds.filter(b => !b.success).length / builds.length) * 100).toFixed(2) : 0,
      errorTypes: this.groupErrorsByType(builds.filter(b => !b.success))
    };
  }

  /**
   * Get citation usage analytics
   */
  async getCitationUsageAnalytics(cutoffTime, projectName) {
    const citations = this.filterByTime(this.performanceData.citationAccess, cutoffTime, projectName);

    // Access type breakdown
    const accessTypes = this.groupBy(citations, 'accessType');

    return {
      totalAccesses: citations.length,
      uniqueUsers: new Set(citations.map(c => c.userId)).size,
      uniqueDocuments: new Set(citations.map(c => c.documentId)).size,

      accessTypeBreakdown: Object.keys(accessTypes).map(type => ({
        type,
        count: accessTypes[type].length,
        percentage: ((accessTypes[type].length / citations.length) * 100).toFixed(2)
      })),

      mostAccessedDocuments: this.getMostAccessedDocuments(citations),
      accessPatternsByHour: this.groupByHour(citations),

      averageSessionDuration: this.calculateAverageSessionDuration(citations),
      bounceRate: this.calculateBounceRate(citations)
    };
  }

  /**
   * Get overflow analytics
   */
  async getOverflowAnalytics(cutoffTime, projectName) {
    const overflows = this.filterByTime(this.performanceData.overflowEvents, cutoffTime, projectName);

    return {
      totalOverflows: overflows.length,
      averageOverflowAmount: overflows.length > 0 ?
        Math.round(overflows.reduce((sum, o) => sum + o.overflowAmount, 0) / overflows.length) : 0,

      overflowsByDocumentType: this.groupBy(overflows, 'documentType'),
      overflowsByProject: this.groupBy(overflows, 'projectName'),

      userOverrideRate: overflows.length > 0 ?
        ((overflows.filter(o => o.userOverride).length / overflows.length) * 100).toFixed(2) : 0,

      averageResolutionTime: this.calculateAverageResolutionTime(overflows),
      overflowTrends: this.groupByHour(overflows)
    };
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(cutoffTime, projectName) {
    const citations = this.filterByTime(this.performanceData.citationAccess, cutoffTime, projectName);
    const builds = this.filterByTime(this.performanceData.contextBuilds, cutoffTime, projectName);

    return {
      activeUsers: new Set(citations.map(c => c.userId)).size,
      activeProjects: new Set([...citations.map(c => c.projectName), ...builds.map(b => b.projectName)]).size,

      averageInteractionsPerUser: this.calculateAverageInteractionsPerUser(citations),
      returnUserRate: this.calculateReturnUserRate(citations),

      featureAdoption: {
        citationClicks: citations.filter(c => c.accessType === 'click').length,
        previewUsage: citations.filter(c => c.accessType === 'preview').length,
        feedbackSubmissions: citations.filter(c => c.accessType === 'feedback').length
      }
    };
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(cutoffTime, projectName) {
    const builds = this.filterByTime(this.performanceData.contextBuilds, cutoffTime, projectName);

    // Calculate trends over time
    const hourlyPerformance = this.groupByHour(builds);
    const performanceData = Object.keys(hourlyPerformance).map(hour => ({
      hour,
      averageDuration: hourlyPerformance[hour].length > 0 ?
        hourlyPerformance[hour].reduce((sum, b) => sum + b.buildDuration, 0) / hourlyPerformance[hour].length : 0,
      buildCount: hourlyPerformance[hour].length,
      successRate: hourlyPerformance[hour].length > 0 ?
        (hourlyPerformance[hour].filter(b => b.success).length / hourlyPerformance[hour].length) * 100 : 0
    }));

    return {
      performanceOverTime: performanceData,
      trend: this.calculateTrend(performanceData.map(p => p.averageDuration)),
      buildVolumeTrend: this.calculateTrend(performanceData.map(p => p.buildCount))
    };
  }

  /**
   * Get real-time metrics
   */
  async getRealtimeMetrics() {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));

    const recentBuilds = this.filterByTime(this.performanceData.contextBuilds, fiveMinutesAgo);
    const recentCitations = this.filterByTime(this.performanceData.citationAccess, fiveMinutesAgo);

    return {
      activeBuilds: recentBuilds.length,
      activeCitations: recentCitations.length,
      currentLoadAverage: this.calculateCurrentLoad(),
      systemHealth: 'healthy', // Could be enhanced with actual system monitoring
      lastUpdateTime: now.toISOString()
    };
  }

  /**
   * Utility methods for analytics calculations
   */

  filterByTime(data, cutoffTime, projectName = null) {
    return data.filter(item => {
      const itemTime = new Date(item.timestamp);
      const timeMatch = itemTime >= cutoffTime;
      const projectMatch = !projectName || item.projectName === projectName;
      return timeMatch && projectMatch;
    });
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  groupByHour(data) {
    return this.groupBy(data, item => new Date(item.timestamp).getHours());
  }

  groupByDocumentType(builds) {
    const grouped = this.groupBy(builds, 'documentType');
    return Object.keys(grouped).map(type => ({
      type,
      count: grouped[type].length,
      averageDuration: grouped[type].reduce((sum, b) => sum + b.buildDuration, 0) / grouped[type].length,
      successRate: (grouped[type].filter(b => b.success).length / grouped[type].length) * 100
    }));
  }

  groupByProject(builds) {
    const grouped = this.groupBy(builds, 'projectName');
    return Object.keys(grouped).map(project => ({
      project,
      count: grouped[project].length,
      averageDuration: grouped[project].reduce((sum, b) => sum + b.buildDuration, 0) / grouped[project].length,
      totalTokens: grouped[project].reduce((sum, b) => sum + (b.tokenCount || 0), 0)
    }));
  }

  calculateMedian(numbers) {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculatePercentile(numbers, percentile) {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    const recent = values.slice(-3).reduce((sum, v) => sum + v, 0) / Math.min(3, values.length);
    const earlier = values.slice(0, -3).reduce((sum, v) => sum + v, 0) / Math.max(1, values.length - 3);

    const change = ((recent - earlier) / earlier) * 100;
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  getMostAccessedDocuments(citations) {
    const documentCounts = this.groupBy(citations, 'documentId');
    return Object.keys(documentCounts)
      .map(docId => ({
        documentId: docId,
        accessCount: documentCounts[docId].length,
        uniqueUsers: new Set(documentCounts[docId].map(c => c.userId)).size
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);
  }

  calculateAverageSessionDuration(citations) {
    const withDuration = citations.filter(c => c.duration);
    return withDuration.length > 0 ?
      withDuration.reduce((sum, c) => sum + c.duration, 0) / withDuration.length : 0;
  }

  calculateBounceRate(citations) {
    const userSessions = this.groupBy(citations, 'userId');
    const singleInteractionSessions = Object.values(userSessions).filter(sessions => sessions.length === 1).length;
    return Object.keys(userSessions).length > 0 ?
      (singleInteractionSessions / Object.keys(userSessions).length) * 100 : 0;
  }

  calculateAverageInteractionsPerUser(citations) {
    const userSessions = this.groupBy(citations, 'userId');
    const totalUsers = Object.keys(userSessions).length;
    return totalUsers > 0 ? citations.length / totalUsers : 0;
  }

  calculateReturnUserRate(citations) {
    const userSessions = this.groupBy(citations, 'userId');
    const returnUsers = Object.values(userSessions).filter(sessions => sessions.length > 1).length;
    return Object.keys(userSessions).length > 0 ?
      (returnUsers / Object.keys(userSessions).length) * 100 : 0;
  }

  calculateAverageResolutionTime(overflows) {
    const withResolution = overflows.filter(o => o.resolutionTime);
    return withResolution.length > 0 ?
      withResolution.reduce((sum, o) => sum + o.resolutionTime, 0) / withResolution.length : 0;
  }

  calculateCurrentLoad() {
    // Simple load calculation based on recent activity
    const now = new Date();
    const lastMinute = new Date(now.getTime() - (60 * 1000));
    const recentActivity = this.performanceData.contextBuilds.filter(b =>
      new Date(b.timestamp) >= lastMinute
    ).length;

    return Math.min(100, recentActivity * 10); // Simple load percentage
  }

  getDataPointCount(cutoffTime) {
    return {
      contextBuilds: this.filterByTime(this.performanceData.contextBuilds, cutoffTime).length,
      citations: this.filterByTime(this.performanceData.citationAccess, cutoffTime).length,
      overflows: this.filterByTime(this.performanceData.overflowEvents, cutoffTime).length,
      systemMetrics: this.filterByTime(this.performanceData.systemMetrics, cutoffTime).length
    };
  }

  groupErrorsByType(failedBuilds) {
    const errorGroups = this.groupBy(failedBuilds, 'errorMessage');
    return Object.keys(errorGroups).map(error => ({
      error: error || 'Unknown error',
      count: errorGroups[error].length
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Export analytics data
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported data
   */
  async exportAnalytics(options = {}) {
    try {
      const {
        format = 'json',
        timeRange = 24,
        projectName = null,
        includeRawData = false
      } = options;

      const analytics = await this.getDashboardAnalytics({ timeRange, projectName });

      if (includeRawData) {
        const cutoffTime = new Date(Date.now() - (timeRange * 60 * 60 * 1000));
        analytics.rawData = {
          contextBuilds: this.filterByTime(this.performanceData.contextBuilds, cutoffTime, projectName),
          citations: this.filterByTime(this.performanceData.citationAccess, cutoffTime, projectName),
          overflows: this.filterByTime(this.performanceData.overflowEvents, cutoffTime, projectName)
        };
      }

      analytics.exportMetadata = {
        format,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        dataRange: `${timeRange} hours`
      };

      return analytics;

    } catch (error) {
      logger.error(`Error exporting analytics: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AnalyticsService;