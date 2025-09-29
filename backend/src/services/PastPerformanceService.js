/**
 * Past Performance Service
 * Business logic layer for past performance operations
 */

const PastPerformance = require('../models/PastPerformance');
const PPProcessingService = require('./PPProcessingService');
const TechnologyExtractionService = require('./TechnologyExtractionService');
const VectorEmbeddingService = require('./VectorEmbeddingService');
const PPSearchService = require('./PPSearchService');
const logger = require('../utils/logger');

class PastPerformanceService {
  constructor() {
    this.pastPerformanceModel = new PastPerformance();
    this.processingService = new PPProcessingService();
    this.technologyService = new TechnologyExtractionService();
    this.embeddingService = new VectorEmbeddingService();
    this.searchService = new PPSearchService();
  }

  /**
   * Create past performance with automated processing
   * @param {Object} ppData - Past performance data
   * @param {Object} options - Processing options
   * @returns {Object} Created past performance with processing results
   */
  async createPastPerformance(ppData, options = {}) {
    const { generateEmbeddings = true, extractTechnologies = true } = options;

    try {
      // Validate and normalize data
      const normalizedData = await this.validateAndNormalizePPData(ppData);

      // Extract technologies if requested
      if (extractTechnologies) {
        normalizedData.technologiesUsed = await this.technologyService.extractTechnologies(
          normalizedData.summary + ' ' + (normalizedData.technicalApproach || '')
        );
      }

      // Create the past performance record
      const createdPP = await this.pastPerformanceModel.create(normalizedData);

      // Generate embeddings and chunks if requested
      if (generateEmbeddings) {
        await this.embeddingService.generatePPEmbeddings(createdPP);
      }

      logger.info(`Past performance created successfully: ${createdPP.id}`);

      return {
        pastPerformance: createdPP,
        processingResults: {
          technologiesExtracted: extractTechnologies,
          embeddingsGenerated: generateEmbeddings,
          chunkCount: generateEmbeddings ? 2 : 0 // Project + capability chunks
        }
      };
    } catch (error) {
      logger.error(`Error creating past performance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get past performance with enhanced data
   * @param {string} id - Past performance ID
   * @param {Object} options - Retrieval options
   * @returns {Object|null} Enhanced past performance record
   */
  async getPastPerformance(id, options = {}) {
    const { includeChunks = false, includeSimilar = false } = options;

    try {
      const pastPerformance = await this.pastPerformanceModel.getById(id);
      if (!pastPerformance) {
        return null;
      }

      const result = { ...pastPerformance };

      // Include document chunks if requested
      if (includeChunks) {
        result.chunks = await this.embeddingService.getChunksByPPId(id);
      }

      // Include similar past performance if requested
      if (includeSimilar) {
        const similarPP = await this.findSimilarPastPerformance(id, 5);
        result.similarPastPerformance = similarPP;
      }

      return result;
    } catch (error) {
      logger.error(`Error getting past performance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search past performance with advanced filtering and ranking
   * @param {Object} searchParams - Search parameters
   * @returns {Object} Search results with relevance scoring
   */
  async searchPastPerformance(searchParams) {
    try {
      // Use the dedicated search service
      return await this.searchService.searchPastPerformance(searchParams);
    } catch (error) {
      logger.error(`Error searching past performance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update past performance with reprocessing
   * @param {string} id - Past performance ID
   * @param {Object} updates - Updates to apply
   * @param {Object} options - Update options
   * @returns {Object|null} Updated past performance
   */
  async updatePastPerformance(id, updates, options = {}) {
    const { regenerateEmbeddings = false, reextractTechnologies = false } = options;

    try {
      // Check if content changes require reprocessing
      const contentChanged = updates.summary || updates.technicalApproach;

      // Extract technologies if content changed and requested
      if ((contentChanged || reextractTechnologies) && updates.technologiesUsed === undefined) {
        const existingPP = await this.pastPerformanceModel.getById(id);
        if (existingPP) {
          const textContent = (updates.summary || existingPP.summary) + ' ' +
                              (updates.technicalApproach || existingPP.technicalApproach || '');
          updates.technologiesUsed = await this.technologyService.extractTechnologies(textContent);
        }
      }

      // Update the record
      const updatedPP = await this.pastPerformanceModel.update(id, updates);
      if (!updatedPP) {
        return null;
      }

      // Regenerate embeddings if content changed or explicitly requested
      if (contentChanged || regenerateEmbeddings) {
        await this.embeddingService.generatePPEmbeddings(updatedPP);
      }

      logger.info(`Past performance updated successfully: ${id}`);

      return updatedPP;
    } catch (error) {
      logger.error(`Error updating past performance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete past performance and related data
   * @param {string} id - Past performance ID
   * @returns {boolean} Success status
   */
  async deletePastPerformance(id) {
    try {
      // Document chunks will be deleted automatically via CASCADE
      const deleted = await this.pastPerformanceModel.delete(id);

      if (deleted) {
        logger.info(`Past performance deleted successfully: ${id}`);
      }

      return deleted;
    } catch (error) {
      logger.error(`Error deleting past performance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics for past performance
   * @returns {Object} Analytics data
   */
  async getAnalytics() {
    try {
      const [
        basicStats,
        technologyTrends,
        performanceMetrics
      ] = await Promise.all([
        this.pastPerformanceModel.getStatistics(),
        this.getTechnologyTrends(),
        this.getPerformanceMetrics()
      ]);

      return {
        ...basicStats,
        technologyTrends,
        performanceMetrics,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error getting analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate and normalize past performance data
   * @private
   */
  async validateAndNormalizePPData(ppData) {
    // Validate required fields
    if (!ppData.projectName?.trim()) {
      throw new Error('Project name is required');
    }
    if (!ppData.customer?.trim()) {
      throw new Error('Customer is required');
    }
    if (!ppData.summary?.trim()) {
      throw new Error('Summary is required');
    }

    // Normalize data
    const normalized = {
      ...ppData,
      projectName: ppData.projectName.trim(),
      customer: ppData.customer.trim(),
      summary: ppData.summary.trim(),
      customerType: ppData.customerType || 'Federal',
      contractType: ppData.contractType || 'Prime',
      workType: ppData.workType || 'Mixed',
      dmePercentage: ppData.dmePercentage || 50,
      omPercentage: ppData.omPercentage || 50,
      technologiesUsed: ppData.technologiesUsed || [],
      domainAreas: ppData.domainAreas || [],
      keyPersonnel: ppData.keyPersonnel || [],
      performanceMetrics: ppData.performanceMetrics || {},
      relevanceTags: ppData.relevanceTags || []
    };

    // Validate percentage totals
    if (normalized.dmePercentage + normalized.omPercentage !== 100) {
      throw new Error('DME and O&M percentages must total 100');
    }

    // Validate dates
    if (normalized.startDate && normalized.endDate) {
      const start = new Date(normalized.startDate);
      const end = new Date(normalized.endDate);
      if (start > end) {
        throw new Error('Start date must be before end date');
      }
    }

    // Validate contract value
    if (normalized.contractValue !== undefined && normalized.contractValue < 0) {
      throw new Error('Contract value must be positive');
    }

    return normalized;
  }




  /**
   * Find similar past performance records
   * @private
   */
  async findSimilarPastPerformance(id, limit = 5) {
    try {
      return await this.searchService.findSimilar(id, limit);
    } catch (error) {
      logger.error(`Error finding similar past performance: ${error.message}`);
      return [];
    }
  }


  /**
   * Get technology trends from past performance data
   * @private
   */
  async getTechnologyTrends() {
    // This would be implemented with proper analytics queries
    return {
      trending: ['React', 'AWS', 'Python', 'Kubernetes'],
      declining: ['jQuery', 'Flash'],
      emerging: ['TypeScript', 'Docker', 'GraphQL']
    };
  }

  /**
   * Get performance metrics analysis
   * @private
   */
  async getPerformanceMetrics() {
    // This would analyze performance metrics from past performance records
    return {
      averageContractValue: 5500000,
      successRate: 0.92,
      averageDuration: 24, // months
      topPerformingDomains: ['Financial Systems', 'Analytics', 'Cloud Migration']
    };
  }

}

module.exports = PastPerformanceService;