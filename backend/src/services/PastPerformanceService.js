/**
 * Past Performance Service
 * Business logic layer for past performance operations
 */

const PastPerformance = require('../models/PastPerformance');
const DocumentChunkService = require('./DocumentChunkService');
const TechnologyService = require('./TechnologyService');
const EmbeddingService = require('./EmbeddingService');
const logger = require('../utils/logger');

class PastPerformanceService {
  constructor() {
    this.pastPerformanceModel = new PastPerformance();
    this.documentChunkService = new DocumentChunkService();
    this.technologyService = new TechnologyService();
    this.embeddingService = new EmbeddingService();
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
        normalizedData.technologiesUsed = await this.extractTechnologies(
          normalizedData.summary + ' ' + (normalizedData.technicalApproach || '')
        );
      }

      // Create the past performance record
      const createdPP = await this.pastPerformanceModel.create(normalizedData);

      // Generate embeddings and chunks if requested
      if (generateEmbeddings) {
        await this.generatePPEmbeddings(createdPP);
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
        result.chunks = await this.documentChunkService.getByPastPerformanceId(id);
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
    const {
      query,
      filters = {},
      pagination = {},
      searchType = 'hybrid', // 'text', 'semantic', 'hybrid'
      weights = {
        technology: 0.4,
        domain: 0.3,
        customer: 0.2,
        semantic: 0.1
      }
    } = searchParams;

    try {
      let results;

      if (searchType === 'semantic' && query) {
        // Generate embedding for query
        const queryEmbedding = await this.embeddingService.generateEmbedding(query);
        results = await this.semanticSearch(queryEmbedding, filters, pagination.limit || 10);
      } else {
        // Text-based search
        const searchFilters = { ...filters };
        if (query) {
          searchFilters.search = query;
        }

        const searchResults = await this.pastPerformanceModel.getAll(searchFilters, pagination);
        results = searchResults.records.map(record => ({
          ...record,
          relevanceScore: this.calculateRelevanceScore(record, searchParams, weights),
          matchReasons: this.generateMatchReasons(record, searchParams)
        }));

        // Sort by relevance score
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      }

      // Group results by relevance tiers
      const groupedResults = this.groupResultsByRelevance(results);

      return {
        results,
        groupedResults,
        searchMetadata: {
          query,
          searchType,
          totalResults: results.length,
          weights,
          executedAt: new Date().toISOString()
        }
      };
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
          updates.technologiesUsed = await this.extractTechnologies(textContent);
        }
      }

      // Update the record
      const updatedPP = await this.pastPerformanceModel.update(id, updates);
      if (!updatedPP) {
        return null;
      }

      // Regenerate embeddings if content changed or explicitly requested
      if (contentChanged || regenerateEmbeddings) {
        await this.generatePPEmbeddings(updatedPP);
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
   * Extract technologies from text content
   * @private
   */
  async extractTechnologies(textContent) {
    try {
      // This would use AI to extract technologies
      // For now, return simple keyword matching
      const knownTechnologies = await this.technologyService.getAllTechnologies();
      const extractedTechnologies = [];

      const normalizedText = textContent.toLowerCase();

      knownTechnologies.forEach(tech => {
        const techName = tech.technology_name.toLowerCase();
        const aliases = tech.aliases || [];

        // Check main name and aliases
        const searchTerms = [techName, ...aliases.map(alias => alias.toLowerCase())];

        for (const term of searchTerms) {
          if (normalizedText.includes(term)) {
            extractedTechnologies.push(tech.technology_name);
            break;
          }
        }
      });

      return [...new Set(extractedTechnologies)]; // Remove duplicates
    } catch (error) {
      logger.warn(`Error extracting technologies: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate embeddings for past performance
   * @private
   */
  async generatePPEmbeddings(pastPerformance) {
    try {
      // Generate project-level chunk
      const projectChunk = {
        pastPerformanceId: pastPerformance.id,
        chunkType: 'pp_project',
        chunkIndex: 0,
        content: pastPerformance.summary,
        sectionTitle: 'Project Summary',
        metadata: { source: 'summary' }
      };

      await this.documentChunkService.createChunk(projectChunk);

      // Generate capability-level chunk if technical approach exists
      if (pastPerformance.technicalApproach) {
        const capabilityChunk = {
          pastPerformanceId: pastPerformance.id,
          chunkType: 'pp_capability',
          chunkIndex: 1,
          content: pastPerformance.technicalApproach,
          sectionTitle: 'Technical Approach',
          metadata: { source: 'technical_approach' }
        };

        await this.documentChunkService.createChunk(capabilityChunk);
      }

      logger.debug(`Generated embeddings for past performance: ${pastPerformance.id}`);
    } catch (error) {
      logger.error(`Error generating embeddings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate relevance score for search results
   * @private
   */
  calculateRelevanceScore(record, searchParams, weights) {
    let score = 0;

    // Technology match scoring
    if (searchParams.requiredTechnologies?.length > 0) {
      const matchedTech = record.technologiesUsed.filter(tech =>
        searchParams.requiredTechnologies.includes(tech)
      );
      const techScore = matchedTech.length / searchParams.requiredTechnologies.length;
      score += techScore * weights.technology;
    }

    // Domain match scoring
    if (searchParams.domainAreas?.length > 0) {
      const matchedDomains = record.domainAreas.filter(domain =>
        searchParams.domainAreas.includes(domain)
      );
      const domainScore = matchedDomains.length / searchParams.domainAreas.length;
      score += domainScore * weights.domain;
    }

    // Customer type match
    if (searchParams.filters?.customerType && record.customerType === searchParams.filters.customerType) {
      score += weights.customer;
    }

    // Base relevance for any record
    score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Generate match reasons for search results
   * @private
   */
  generateMatchReasons(record, searchParams) {
    const reasons = [];

    if (searchParams.requiredTechnologies?.length > 0) {
      const matchedTech = record.technologiesUsed.filter(tech =>
        searchParams.requiredTechnologies.includes(tech)
      );
      if (matchedTech.length > 0) {
        reasons.push(`Technology match: ${matchedTech.join(', ')}`);
      }
    }

    if (searchParams.domainAreas?.length > 0) {
      const matchedDomains = record.domainAreas.filter(domain =>
        searchParams.domainAreas.includes(domain)
      );
      if (matchedDomains.length > 0) {
        reasons.push(`Domain match: ${matchedDomains.join(', ')}`);
      }
    }

    if (searchParams.filters?.customerType && record.customerType === searchParams.filters.customerType) {
      reasons.push(`Customer type: ${record.customerType}`);
    }

    if (searchParams.query) {
      reasons.push('Text content match');
    }

    return reasons;
  }

  /**
   * Group results by relevance tiers
   * @private
   */
  groupResultsByRelevance(results) {
    return {
      highRelevance: results.filter(r => r.relevanceScore >= 0.8),
      mediumRelevance: results.filter(r => r.relevanceScore >= 0.6 && r.relevanceScore < 0.8),
      lowRelevance: results.filter(r => r.relevanceScore < 0.6)
    };
  }

  /**
   * Find similar past performance records
   * @private
   */
  async findSimilarPastPerformance(id, limit = 5) {
    try {
      const targetPP = await this.pastPerformanceModel.getById(id);
      if (!targetPP) {
        return [];
      }

      // Simple similarity based on technologies and domains
      const similarPP = await this.pastPerformanceModel.getAll({
        technologies: targetPP.technologiesUsed.slice(0, 3), // Top 3 technologies
        domains: targetPP.domainAreas.slice(0, 2) // Top 2 domains
      }, { limit: limit + 1, offset: 0 });

      // Filter out the target record and return similarity scores
      return similarPP.records
        .filter(pp => pp.id !== id)
        .slice(0, limit)
        .map(pp => ({
          ...pp,
          similarityScore: this.calculateSimilarityScore(targetPP, pp)
        }));
    } catch (error) {
      logger.error(`Error finding similar past performance: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate similarity score between two past performance records
   * @private
   */
  calculateSimilarityScore(pp1, pp2) {
    let score = 0;
    let factors = 0;

    // Technology similarity
    const commonTech = pp1.technologiesUsed.filter(tech =>
      pp2.technologiesUsed.includes(tech)
    );
    if (pp1.technologiesUsed.length > 0 || pp2.technologiesUsed.length > 0) {
      const techUnion = new Set([...pp1.technologiesUsed, ...pp2.technologiesUsed]);
      score += commonTech.length / techUnion.size;
      factors++;
    }

    // Domain similarity
    const commonDomains = pp1.domainAreas.filter(domain =>
      pp2.domainAreas.includes(domain)
    );
    if (pp1.domainAreas.length > 0 || pp2.domainAreas.length > 0) {
      const domainUnion = new Set([...pp1.domainAreas, ...pp2.domainAreas]);
      score += commonDomains.length / domainUnion.size;
      factors++;
    }

    // Customer type similarity
    if (pp1.customerType === pp2.customerType) {
      score += 0.2;
    }
    factors++;

    // Work type similarity
    if (pp1.workType === pp2.workType) {
      score += 0.1;
    }
    factors++;

    return factors > 0 ? score / factors : 0;
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

  /**
   * Semantic search using vector similarity
   * @private
   */
  async semanticSearch(queryEmbedding, filters, limit) {
    // This would use actual vector similarity search
    // For now, return mock results
    const textResults = await this.pastPerformanceModel.getAll(filters, { limit, offset: 0 });

    return textResults.records.map(record => ({
      ...record,
      similarityScore: 0.7 + (Math.random() * 0.3), // Mock similarity score
      relevanceReason: 'Semantic similarity (mock implementation)'
    }));
  }
}

module.exports = PastPerformanceService;