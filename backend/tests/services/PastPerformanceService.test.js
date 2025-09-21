/**
 * Past Performance Service Tests
 * Comprehensive test suite for business logic layer
 */

const PastPerformanceService = require('../../src/services/PastPerformanceService');
const PastPerformance = require('../../src/models/PastPerformance');
const DocumentChunkService = require('../../src/services/DocumentChunkService');
const TechnologyService = require('../../src/services/TechnologyService');
const EmbeddingService = require('../../src/services/EmbeddingService');

// Mock logger first
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock all dependencies with explicit mock implementations
jest.mock('../../src/models/PastPerformance', () => jest.fn());
jest.mock('../../src/services/DocumentChunkService', () => jest.fn());
jest.mock('../../src/services/TechnologyService', () => jest.fn());
jest.mock('../../src/services/EmbeddingService', () => jest.fn());

describe('PastPerformanceService', () => {
  let service;
  let mockPastPerformanceModel;
  let mockDocumentChunkService;
  let mockTechnologyService;
  let mockEmbeddingService;
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked logger
    mockLogger = require('../../src/utils/logger');

    // Mock model methods
    mockPastPerformanceModel = {
      create: jest.fn(),
      getById: jest.fn(),
      getAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getStatistics: jest.fn()
    };

    mockDocumentChunkService = {
      createChunk: jest.fn(),
      getByPastPerformanceId: jest.fn()
    };

    mockTechnologyService = {
      getAllTechnologies: jest.fn(),
      getUsageStatistics: jest.fn()
    };

    mockEmbeddingService = {
      generateEmbedding: jest.fn()
    };

    // Mock constructors - use mockReturnValue since these are constructor functions
    PastPerformance.mockReturnValue(mockPastPerformanceModel);
    DocumentChunkService.mockReturnValue(mockDocumentChunkService);
    TechnologyService.mockReturnValue(mockTechnologyService);
    EmbeddingService.mockReturnValue(mockEmbeddingService);

    service = new PastPerformanceService();
  });

  describe('createPastPerformance', () => {
    const validPPData = {
      projectName: 'Test Project',
      customer: 'Test Customer',
      summary: 'Test summary',
      technicalApproach: 'Test approach'
    };

    const mockCreatedPP = {
      id: 'test-id',
      projectName: 'Test Project',
      customer: 'Test Customer',
      summary: 'Test summary',
      technicalApproach: 'Test approach',
      technologiesUsed: ['Java', 'React']
    };

    it('should create past performance with full processing', async () => {
      mockTechnologyService.getAllTechnologies.mockResolvedValue([
        { technology_name: 'Java', aliases: [] },
        { technology_name: 'React', aliases: ['ReactJS'] }
      ]);

      mockPastPerformanceModel.create.mockResolvedValue(mockCreatedPP);
      mockDocumentChunkService.createChunk.mockResolvedValue({ id: 'chunk-1' });

      const result = await service.createPastPerformance(validPPData);

      expect(result).toEqual({
        pastPerformance: mockCreatedPP,
        processingResults: {
          technologiesExtracted: true,
          embeddingsGenerated: true,
          chunkCount: 2
        }
      });

      expect(mockPastPerformanceModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: 'Test Project',
          technologiesUsed: expect.any(Array)
        })
      );

      expect(mockDocumentChunkService.createChunk).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Past performance created successfully: test-id'
      );
    });

    it('should create without technology extraction', async () => {
      mockPastPerformanceModel.create.mockResolvedValue(mockCreatedPP);

      const options = { extractTechnologies: false };
      const result = await service.createPastPerformance(validPPData, options);

      expect(result.processingResults.technologiesExtracted).toBe(false);
      expect(mockTechnologyService.getAllTechnologies).not.toHaveBeenCalled();
    });

    it('should create without embedding generation', async () => {
      mockPastPerformanceModel.create.mockResolvedValue(mockCreatedPP);

      const options = { generateEmbeddings: false };
      const result = await service.createPastPerformance(validPPData, options);

      expect(result.processingResults.embeddingsGenerated).toBe(false);
      expect(result.processingResults.chunkCount).toBe(0);
      expect(mockDocumentChunkService.createChunk).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const invalidData = { projectName: 'Test' }; // Missing required fields

      await expect(service.createPastPerformance(invalidData))
        .rejects.toThrow('Customer is required');
    });

    it('should handle model creation errors', async () => {
      const modelError = new Error('Database error');
      mockPastPerformanceModel.create.mockRejectedValue(modelError);

      await expect(service.createPastPerformance(validPPData))
        .rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating past performance: Database error'
      );
    });

    it('should continue even if technology extraction fails', async () => {
      mockTechnologyService.getAllTechnologies.mockRejectedValue(new Error('Tech service error'));
      mockPastPerformanceModel.create.mockResolvedValue(mockCreatedPP);

      const result = await service.createPastPerformance(validPPData);

      expect(result.pastPerformance).toEqual(mockCreatedPP);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error extracting technologies: Tech service error'
      );
    });
  });

  describe('getPastPerformance', () => {
    const mockPP = {
      id: 'test-id',
      projectName: 'Test Project'
    };

    it('should get past performance by ID', async () => {
      mockPastPerformanceModel.getById.mockResolvedValue(mockPP);

      const result = await service.getPastPerformance('test-id');

      expect(result).toEqual(mockPP);
      expect(mockPastPerformanceModel.getById).toHaveBeenCalledWith('test-id');
    });

    it('should return null for non-existent ID', async () => {
      mockPastPerformanceModel.getById.mockResolvedValue(null);

      const result = await service.getPastPerformance('non-existent');

      expect(result).toBeNull();
    });

    it('should include chunks when requested', async () => {
      const mockChunks = [{ id: 'chunk-1', content: 'Test chunk' }];

      mockPastPerformanceModel.getById.mockResolvedValue(mockPP);
      mockDocumentChunkService.getByPastPerformanceId.mockResolvedValue(mockChunks);

      const options = { includeChunks: true };
      const result = await service.getPastPerformance('test-id', options);

      expect(result).toEqual({
        ...mockPP,
        chunks: mockChunks
      });

      expect(mockDocumentChunkService.getByPastPerformanceId)
        .toHaveBeenCalledWith('test-id');
    });

    it('should include similar past performance when requested', async () => {
      const mockSimilar = [{ id: 'similar-1', similarityScore: 0.8 }];

      mockPastPerformanceModel.getById.mockResolvedValue(mockPP);

      // Mock the findSimilarPastPerformance method
      jest.spyOn(service, 'findSimilarPastPerformance').mockResolvedValue(mockSimilar);

      const options = { includeSimilar: true };
      const result = await service.getPastPerformance('test-id', options);

      expect(result).toEqual({
        ...mockPP,
        similarPastPerformance: mockSimilar
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPastPerformanceModel.getById.mockRejectedValue(dbError);

      await expect(service.getPastPerformance('test-id'))
        .rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting past performance: Database error'
      );
    });
  });

  describe('searchPastPerformance', () => {
    const mockSearchResults = [
      { id: 'pp-1', projectName: 'Project 1', technologiesUsed: ['Java'] },
      { id: 'pp-2', projectName: 'Project 2', technologiesUsed: ['React'] }
    ];

    it('should perform text-based search', async () => {
      mockPastPerformanceModel.getAll.mockResolvedValue({
        records: mockSearchResults
      });

      const searchParams = {
        query: 'Java project',
        searchType: 'text'
      };

      const result = await service.searchPastPerformance(searchParams);

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual(expect.objectContaining({
        id: 'pp-1',
        relevanceScore: expect.any(Number),
        matchReasons: expect.any(Array)
      }));

      expect(result.searchMetadata).toEqual(expect.objectContaining({
        query: 'Java project',
        searchType: 'text',
        totalResults: 2
      }));
    });

    it('should perform semantic search', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);

      // Mock the semanticSearch method
      jest.spyOn(service, 'semanticSearch').mockResolvedValue([
        { ...mockSearchResults[0], similarityScore: 0.9 }
      ]);

      const searchParams = {
        query: 'Java modernization',
        searchType: 'semantic'
      };

      const result = await service.searchPastPerformance(searchParams);

      expect(result.results).toHaveLength(1);
      expect(mockEmbeddingService.generateEmbedding)
        .toHaveBeenCalledWith('Java modernization');
    });

    it('should group results by relevance', async () => {
      const resultsWithScores = [
        { id: 'pp-1', relevanceScore: 0.9 },
        { id: 'pp-2', relevanceScore: 0.7 },
        { id: 'pp-3', relevanceScore: 0.5 }
      ];

      mockPastPerformanceModel.getAll.mockResolvedValue({
        records: resultsWithScores
      });

      // Mock relevance calculation
      jest.spyOn(service, 'calculateRelevanceScore')
        .mockReturnValueOnce(0.9)
        .mockReturnValueOnce(0.7)
        .mockReturnValueOnce(0.5);

      const result = await service.searchPastPerformance({ query: 'test' });

      expect(result.groupedResults).toEqual({
        highRelevance: [expect.objectContaining({ relevanceScore: 0.9 })],
        mediumRelevance: [expect.objectContaining({ relevanceScore: 0.7 })],
        lowRelevance: [expect.objectContaining({ relevanceScore: 0.5 })]
      });
    });

    it('should handle search errors gracefully', async () => {
      const searchError = new Error('Search failed');
      mockPastPerformanceModel.getAll.mockRejectedValue(searchError);

      await expect(service.searchPastPerformance({ query: 'test' }))
        .rejects.toThrow('Search failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error searching past performance: Search failed'
      );
    });
  });

  describe('updatePastPerformance', () => {
    const mockUpdatedPP = {
      id: 'test-id',
      projectName: 'Updated Project',
      summary: 'Updated summary'
    };

    it('should update past performance successfully', async () => {
      const updates = {
        projectName: 'Updated Project',
        summary: 'Updated summary'
      };

      mockPastPerformanceModel.update.mockResolvedValue(mockUpdatedPP);

      const result = await service.updatePastPerformance('test-id', updates);

      expect(result).toEqual(mockUpdatedPP);
      expect(mockPastPerformanceModel.update).toHaveBeenCalledWith('test-id', updates);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Past performance updated successfully: test-id'
      );
    });

    it('should return null for non-existent record', async () => {
      mockPastPerformanceModel.update.mockResolvedValue(null);

      const result = await service.updatePastPerformance('non-existent', {});

      expect(result).toBeNull();
    });

    it('should regenerate embeddings when content changes', async () => {
      const updates = { summary: 'New summary' };

      mockPastPerformanceModel.update.mockResolvedValue(mockUpdatedPP);
      mockDocumentChunkService.createChunk.mockResolvedValue({ id: 'new-chunk' });

      const options = { regenerateEmbeddings: true };
      await service.updatePastPerformance('test-id', updates, options);

      expect(mockDocumentChunkService.createChunk).toHaveBeenCalled();
    });

    it('should reextract technologies when requested', async () => {
      const updates = { technicalApproach: 'New React approach' };

      mockPastPerformanceModel.getById.mockResolvedValue({
        summary: 'Original summary',
        technicalApproach: 'Original approach'
      });

      mockTechnologyService.getAllTechnologies.mockResolvedValue([
        { technology_name: 'React', aliases: ['ReactJS'] }
      ]);

      mockPastPerformanceModel.update.mockResolvedValue(mockUpdatedPP);

      const options = { reextractTechnologies: true };
      await service.updatePastPerformance('test-id', updates, options);

      expect(mockTechnologyService.getAllTechnologies).toHaveBeenCalled();
      expect(mockPastPerformanceModel.update).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({
          technicalApproach: 'New React approach',
          technologiesUsed: expect.arrayContaining(['React'])
        })
      );
    });

    it('should handle update errors', async () => {
      const updateError = new Error('Update failed');
      mockPastPerformanceModel.update.mockRejectedValue(updateError);

      await expect(service.updatePastPerformance('test-id', {}))
        .rejects.toThrow('Update failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating past performance: Update failed'
      );
    });
  });

  describe('deletePastPerformance', () => {
    it('should delete past performance successfully', async () => {
      mockPastPerformanceModel.delete.mockResolvedValue(true);

      const result = await service.deletePastPerformance('test-id');

      expect(result).toBe(true);
      expect(mockPastPerformanceModel.delete).toHaveBeenCalledWith('test-id');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Past performance deleted successfully: test-id'
      );
    });

    it('should return false for non-existent record', async () => {
      mockPastPerformanceModel.delete.mockResolvedValue(false);

      const result = await service.deletePastPerformance('non-existent');

      expect(result).toBe(false);
    });

    it('should handle delete errors', async () => {
      const deleteError = new Error('Delete failed');
      mockPastPerformanceModel.delete.mockRejectedValue(deleteError);

      await expect(service.deletePastPerformance('test-id'))
        .rejects.toThrow('Delete failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting past performance: Delete failed'
      );
    });
  });

  describe('getAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      const mockStats = {
        total: 10,
        byCustomerType: [{ customer_type: 'Federal', count: 8 }]
      };

      const mockTechTrends = {
        trending: ['React', 'AWS'],
        declining: ['jQuery']
      };

      const mockPerfMetrics = {
        averageContractValue: 5000000,
        successRate: 0.92
      };

      mockPastPerformanceModel.getStatistics.mockResolvedValue(mockStats);
      jest.spyOn(service, 'getTechnologyTrends').mockResolvedValue(mockTechTrends);
      jest.spyOn(service, 'getPerformanceMetrics').mockResolvedValue(mockPerfMetrics);

      const result = await service.getAnalytics();

      expect(result).toEqual({
        ...mockStats,
        technologyTrends: mockTechTrends,
        performanceMetrics: mockPerfMetrics,
        generatedAt: expect.any(String)
      });
    });

    it('should handle analytics errors', async () => {
      const analyticsError = new Error('Analytics failed');
      mockPastPerformanceModel.getStatistics.mockRejectedValue(analyticsError);

      await expect(service.getAnalytics()).rejects.toThrow('Analytics failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting analytics: Analytics failed'
      );
    });
  });

  describe('validateAndNormalizePPData', () => {
    it('should validate required fields', async () => {
      await expect(service.validateAndNormalizePPData({}))
        .rejects.toThrow('Project name is required');

      await expect(service.validateAndNormalizePPData({ projectName: 'Test' }))
        .rejects.toThrow('Customer is required');

      await expect(service.validateAndNormalizePPData({
        projectName: 'Test',
        customer: 'Customer'
      })).rejects.toThrow('Summary is required');
    });

    it('should normalize data with defaults', async () => {
      const input = {
        projectName: '  Test Project  ',
        customer: '  Test Customer  ',
        summary: '  Test summary  '
      };

      const result = await service.validateAndNormalizePPData(input);

      expect(result).toEqual(expect.objectContaining({
        projectName: 'Test Project',
        customer: 'Test Customer',
        summary: 'Test summary',
        customerType: 'Federal',
        contractType: 'Prime',
        workType: 'Mixed',
        dmePercentage: 50,
        omPercentage: 50,
        technologiesUsed: [],
        domainAreas: [],
        keyPersonnel: [],
        performanceMetrics: {},
        relevanceTags: []
      }));
    });

    it('should validate percentage totals', async () => {
      const input = {
        projectName: 'Test',
        customer: 'Customer',
        summary: 'Summary',
        dmePercentage: 60,
        omPercentage: 50
      };

      await expect(service.validateAndNormalizePPData(input))
        .rejects.toThrow('DME and O&M percentages must total 100');
    });

    it('should validate dates', async () => {
      const input = {
        projectName: 'Test',
        customer: 'Customer',
        summary: 'Summary',
        startDate: '2023-12-31',
        endDate: '2023-01-01'
      };

      await expect(service.validateAndNormalizePPData(input))
        .rejects.toThrow('Start date must be before end date');
    });

    it('should validate contract value', async () => {
      const input = {
        projectName: 'Test',
        customer: 'Customer',
        summary: 'Summary',
        contractValue: -1000
      };

      await expect(service.validateAndNormalizePPData(input))
        .rejects.toThrow('Contract value must be positive');
    });
  });

  describe('extractTechnologies', () => {
    it('should extract technologies from text', async () => {
      const mockTechnologies = [
        {
          technology_name: 'Java',
          aliases: ['JDK', 'OpenJDK']
        },
        {
          technology_name: 'React',
          aliases: ['ReactJS']
        }
      ];

      mockTechnologyService.getAllTechnologies.mockResolvedValue(mockTechnologies);

      const text = 'This project used Java and ReactJS for development';
      const result = await service.extractTechnologies(text);

      expect(result).toEqual(['Java', 'React']);
    });

    it('should return empty array for empty text', async () => {
      const result = await service.extractTechnologies('');
      expect(result).toEqual([]);
    });

    it('should handle extraction errors gracefully', async () => {
      mockTechnologyService.getAllTechnologies.mockRejectedValue(new Error('Service error'));

      const result = await service.extractTechnologies('Some text');

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error extracting technologies: Service error'
      );
    });

    it('should remove duplicate technologies', async () => {
      const mockTechnologies = [
        { technology_name: 'Java', aliases: ['JDK'] }
      ];

      mockTechnologyService.getAllTechnologies.mockResolvedValue(mockTechnologies);

      const text = 'This project used Java and JDK extensively';
      const result = await service.extractTechnologies(text);

      expect(result).toEqual(['Java']); // Should only appear once
    });
  });

  describe('calculateRelevanceScore', () => {
    const mockRecord = {
      technologiesUsed: ['Java', 'React'],
      domainAreas: ['Financial', 'Analytics'],
      customerType: 'Federal'
    };

    it('should calculate technology match score', () => {
      const searchParams = {
        requiredTechnologies: ['Java', 'Python']
      };

      const weights = {
        technology: 0.4,
        domain: 0.3,
        customer: 0.2,
        semantic: 0.1
      };

      const score = service.calculateRelevanceScore(mockRecord, searchParams, weights);

      // Should get 0.5 tech match (1/2 technologies) * 0.4 weight + 0.1 base = 0.3
      expect(score).toBeCloseTo(0.3);
    });

    it('should calculate domain match score', () => {
      const searchParams = {
        domainAreas: ['Financial', 'Healthcare']
      };

      const weights = {
        technology: 0.4,
        domain: 0.3,
        customer: 0.2,
        semantic: 0.1
      };

      const score = service.calculateRelevanceScore(mockRecord, searchParams, weights);

      // Should get 0.5 domain match (1/2 domains) * 0.3 weight + 0.1 base = 0.25
      expect(score).toBeCloseTo(0.25);
    });

    it('should add customer type bonus', () => {
      const searchParams = {
        filters: { customerType: 'Federal' }
      };

      const weights = {
        technology: 0.4,
        domain: 0.3,
        customer: 0.2,
        semantic: 0.1
      };

      const score = service.calculateRelevanceScore(mockRecord, searchParams, weights);

      // Should get customer match 0.2 + base 0.1 = 0.3
      expect(score).toBeCloseTo(0.3);
    });

    it('should cap score at 1.0', () => {
      const searchParams = {
        requiredTechnologies: ['Java', 'React'],
        domainAreas: ['Financial', 'Analytics'],
        filters: { customerType: 'Federal' }
      };

      const weights = {
        technology: 0.4,
        domain: 0.3,
        customer: 0.2,
        semantic: 0.1
      };

      const score = service.calculateRelevanceScore(mockRecord, searchParams, weights);

      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('generateMatchReasons', () => {
    const mockRecord = {
      technologiesUsed: ['Java', 'React'],
      domainAreas: ['Financial'],
      customerType: 'Federal'
    };

    it('should generate technology match reasons', () => {
      const searchParams = {
        requiredTechnologies: ['Java', 'Python']
      };

      const reasons = service.generateMatchReasons(mockRecord, searchParams);

      expect(reasons).toContain('Technology match: Java');
    });

    it('should generate domain match reasons', () => {
      const searchParams = {
        domainAreas: ['Financial', 'Healthcare']
      };

      const reasons = service.generateMatchReasons(mockRecord, searchParams);

      expect(reasons).toContain('Domain match: Financial');
    });

    it('should generate customer type reasons', () => {
      const searchParams = {
        filters: { customerType: 'Federal' }
      };

      const reasons = service.generateMatchReasons(mockRecord, searchParams);

      expect(reasons).toContain('Customer type: Federal');
    });

    it('should add text match reason for queries', () => {
      const searchParams = {
        query: 'modernization project'
      };

      const reasons = service.generateMatchReasons(mockRecord, searchParams);

      expect(reasons).toContain('Text content match');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      await expect(service.createPastPerformance(null))
        .rejects.toThrow();

      const result = await service.getPastPerformance(null);
      expect(result).toBeNull();
    });

    it('should handle empty search results', async () => {
      mockPastPerformanceModel.getAll.mockResolvedValue({ records: [] });

      const result = await service.searchPastPerformance({ query: 'nonexistent' });

      expect(result.results).toEqual([]);
      expect(result.groupedResults.highRelevance).toEqual([]);
    });

    it('should handle service unavailability gracefully', async () => {
      // Mock service failures
      mockTechnologyService.getAllTechnologies.mockRejectedValue(new Error('Service down'));
      mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('AI service down'));

      // Should still work with degraded functionality
      mockPastPerformanceModel.create.mockResolvedValue({ id: 'test' });

      const result = await service.createPastPerformance({
        projectName: 'Test',
        customer: 'Customer',
        summary: 'Summary'
      });

      expect(result.pastPerformance).toBeDefined();
    });
  });
});