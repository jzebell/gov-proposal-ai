/**
 * Context Overflow Management Service
 * Handles situations when document context exceeds token limits
 */

const GlobalSettingsService = require('./GlobalSettingsService');
const logger = require('../utils/logger');

class ContextOverflowService {
  constructor() {
    this.globalSettingsService = new GlobalSettingsService();
  }

  /**
   * Check if context will overflow token limits
   * @param {Array} documents - Prioritized documents array
   * @param {Array} contextChunks - Processed context chunks
   * @param {string} modelType - Model category (small/medium/large)
   * @returns {Promise<Object>} Overflow analysis result
   */
  async checkContextOverflow(documents, contextChunks, modelType = 'medium') {
    try {
      // Get context configuration
      const contextConfig = await this.getContextConfiguration();

      // Get model limits
      const modelLimits = contextConfig.modelCategories[modelType];
      if (!modelLimits) {
        throw new Error(`Unknown model type: ${modelType}`);
      }

      // Calculate token allocation
      const maxContextTokens = Math.floor(
        modelLimits.max_tokens * (contextConfig.tokenAllocation.context_percent / 100)
      );

      // Calculate current token usage
      const currentTokens = this.calculateTokenUsage(contextChunks);

      // Calculate document-level token usage for selection interface
      const documentTokenUsage = this.calculateDocumentTokenUsage(documents, contextChunks);

      const overflowAnalysis = {
        willOverflow: currentTokens > maxContextTokens,
        currentTokens,
        maxContextTokens,
        tokenLimit: modelLimits.max_tokens,
        overflowAmount: Math.max(0, currentTokens - maxContextTokens),
        contextPercentage: contextConfig.tokenAllocation.context_percent,
        documentBreakdown: documentTokenUsage,
        recommendations: this.generateRecommendations(documentTokenUsage, maxContextTokens, currentTokens)
      };

      if (overflowAnalysis.willOverflow) {
        logger.warn(`Context overflow detected: ${currentTokens}/${maxContextTokens} tokens (${overflowAnalysis.overflowAmount} over limit)`);

        // Log overflow event for analytics
        await this.logOverflowEvent(documents, contextChunks, overflowAnalysis);
      }

      return overflowAnalysis;

    } catch (error) {
      logger.error(`Error checking context overflow: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate token usage from context chunks
   * @param {Array} contextChunks - Array of context chunks
   * @returns {number} Estimated token count
   */
  calculateTokenUsage(contextChunks) {
    // Simple token estimation: ~4 characters per token (GPT standard)
    return contextChunks.reduce((total, chunk) => {
      return total + Math.ceil(chunk.characterCount / 4);
    }, 0);
  }

  /**
   * Calculate token usage per document for selection interface
   * @param {Array} documents - Document array
   * @param {Array} contextChunks - Context chunks array
   * @returns {Array} Document token breakdown
   */
  calculateDocumentTokenUsage(documents, contextChunks) {
    const documentMap = new Map();

    // Initialize document entries
    documents.forEach(doc => {
      documentMap.set(doc.id, {
        id: doc.id,
        name: doc.originalName,
        category: doc.category,
        priorityScore: this.calculateDocumentPriorityScore(doc),
        tokenCount: 0,
        chunkCount: 0,
        sections: [],
        relevanceScore: this.calculateRelevanceScore(doc),
        isRecommended: false
      });
    });

    // Aggregate chunk data by document
    contextChunks.forEach(chunk => {
      const docData = documentMap.get(chunk.documentId);
      if (docData) {
        docData.tokenCount += Math.ceil(chunk.characterCount / 4);
        docData.chunkCount++;

        // Track sections for detailed view
        if (!docData.sections.find(s => s.type === chunk.sectionType)) {
          docData.sections.push({
            type: chunk.sectionType,
            tokenCount: Math.ceil(chunk.characterCount / 4)
          });
        }
      }
    });

    return Array.from(documentMap.values()).sort((a, b) => {
      // Sort by priority score first, then by relevance
      if (a.priorityScore !== b.priorityScore) {
        return a.priorityScore - b.priorityScore;
      }
      return b.relevanceScore - a.relevanceScore;
    });
  }

  /**
   * Generate smart recommendations for document selection
   * @param {Array} documentTokenUsage - Document usage breakdown
   * @param {number} maxTokens - Maximum allowed tokens
   * @param {number} currentTokens - Current token count
   * @returns {Object} Recommendations object
   */
  generateRecommendations(documentTokenUsage, maxTokens, currentTokens) {
    const recommendations = {
      suggestedDocuments: [],
      removedDocuments: [],
      priorityMessage: '',
      tokensSaved: 0
    };

    if (currentTokens <= maxTokens) {
      recommendations.priorityMessage = 'All documents fit within token limits';
      recommendations.suggestedDocuments = documentTokenUsage.map(doc => doc.id);
      return recommendations;
    }

    // Smart selection algorithm: keep highest priority/relevance documents
    let runningTokens = 0;
    const tokensToSave = currentTokens - maxTokens;

    for (const doc of documentTokenUsage) {
      if (runningTokens + doc.tokenCount <= maxTokens) {
        recommendations.suggestedDocuments.push(doc.id);
        runningTokens += doc.tokenCount;
        doc.isRecommended = true;
      } else {
        recommendations.removedDocuments.push({
          id: doc.id,
          name: doc.name,
          tokenCount: doc.tokenCount,
          reason: runningTokens + doc.tokenCount > maxTokens ? 'Exceeds token limit' : 'Lower priority'
        });
      }
    }

    recommendations.tokensSaved = currentTokens - runningTokens;
    recommendations.priorityMessage = `Recommended ${recommendations.suggestedDocuments.length}/${documentTokenUsage.length} documents to stay within ${maxTokens} token limit`;

    return recommendations;
  }

  /**
   * Apply manual document selection from user
   * @param {Array} selectedDocumentIds - User-selected document IDs
   * @param {Array} contextChunks - Original context chunks
   * @returns {Array} Filtered context chunks
   */
  applyDocumentSelection(selectedDocumentIds, contextChunks) {
    const selectedIds = new Set(selectedDocumentIds);

    return contextChunks.filter(chunk => selectedIds.has(chunk.documentId));
  }

  /**
   * Calculate document priority score (lower = higher priority)
   * @param {Object} document - Document object
   * @returns {number} Priority score
   */
  calculateDocumentPriorityScore(document) {
    const category = document.category?.toLowerCase() || '';

    // Document type hierarchy (should match ContextService)
    const typeHierarchy = {
      'solicitations': 1,
      'requirements': 2,
      'references': 3,
      'past-performance': 4,
      'proposals': 5,
      'compliance': 6,
      'media': 7
    };

    let score = typeHierarchy[category] || 8;

    // Adjust based on metadata
    const text = `${document.originalName} ${document.description || ''}`.toLowerCase();
    if (text.includes('executive') || text.includes('summary')) score -= 0.3;
    if (text.includes('requirement') || text.includes('specification')) score -= 0.2;
    if (text.includes('technical') || text.includes('approach')) score -= 0.2;

    return score;
  }

  /**
   * Calculate document relevance score (higher = more relevant)
   * @param {Object} document - Document object
   * @returns {number} Relevance score (0-100)
   */
  calculateRelevanceScore(document) {
    let score = 50; // Base score

    // Size considerations
    const size = document.size || 0;
    if (size > 100 && size < 5 * 1024 * 1024) { // Between 100 bytes and 5MB
      score += 20;
    }

    // Recency bonus (newer documents get higher scores)
    const createdAt = new Date(document.createdAt || 0);
    const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 30) {
      score += 15;
    } else if (daysSinceCreated < 90) {
      score += 10;
    }

    // Category-specific bonuses
    const category = document.category?.toLowerCase() || '';
    if (['solicitations', 'requirements'].includes(category)) {
      score += 15;
    }

    // Filename relevance
    const text = document.originalName?.toLowerCase() || '';
    if (text.includes('final') || text.includes('approved')) score += 10;
    if (text.includes('draft') || text.includes('temp')) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get current context configuration
   * @returns {Promise<Object>} Context configuration
   */
  async getContextConfiguration() {
    const contextSettingsArray = await this.globalSettingsService.getSettingsByCategory('context');

    const contextSettings = {};
    contextSettingsArray.forEach(setting => {
      contextSettings[setting.setting_key] = setting.setting_value;
    });

    return {
      modelCategories: JSON.parse(contextSettings['context.model_categories'] || '{\"small\": {\"max_tokens\": 4000}, \"medium\": {\"max_tokens\": 16000}, \"large\": {\"max_tokens\": 32000}}'),
      tokenAllocation: JSON.parse(contextSettings['context.token_allocation'] || '{\"context_percent\": 70, \"generation_percent\": 20, \"buffer_percent\": 10}'),
      warningThreshold: parseInt(contextSettings['context.warning_threshold_percent'] || '85')
    };
  }

  /**
   * Log overflow event for analytics
   * @param {Array} documents - Documents array
   * @param {Array} contextChunks - Context chunks array
   * @param {Object} overflowAnalysis - Overflow analysis result
   */
  async logOverflowEvent(documents, contextChunks, overflowAnalysis) {
    try {
      // This would integrate with analytics service when implemented
      logger.info(`Overflow Event: ${overflowAnalysis.currentTokens}/${overflowAnalysis.maxContextTokens} tokens, ${documents.length} documents, ${contextChunks.length} chunks`);

      // Future: Store in performance_metrics or dedicated overflow_events table

    } catch (error) {
      logger.error(`Error logging overflow event: ${error.message}`);
    }
  }

  /**
   * Get overflow statistics for analytics
   * @param {string} projectName - Project name filter
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} Overflow statistics
   */
  async getOverflowStatistics(projectName = null, days = 30) {
    try {
      // This would query the overflow_events table when implemented
      // For now, return mock data structure

      return {
        totalOverflowEvents: 0,
        averageOverflowAmount: 0,
        mostCommonTriggers: [],
        documentSelectionPatterns: [],
        timeRange: { days, projectName }
      };

    } catch (error) {
      logger.error(`Error getting overflow statistics: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ContextOverflowService;