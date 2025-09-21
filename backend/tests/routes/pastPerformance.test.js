/**
 * Past Performance API Routes Tests
 * Integration tests for REST endpoints
 */

const request = require('supertest');
const express = require('express');
const pastPerformanceRouter = require('../../src/routes/pastPerformance');
const PastPerformanceService = require('../../src/services/PastPerformanceService');

// Mock logger first
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock middleware
jest.mock('../../src/middleware/validation', () => ({
  validatePastPerformance: (req, res, next) => next(),
  validateSearchParams: (req, res, next) => next(),
  validatePagination: (req, res, next) => next(),
  validateUUID: () => (req, res, next) => next(),
  sanitizeInput: (req, res, next) => next()
}));

// Mock error handler first
jest.mock('../../src/middleware/errorHandler', () => ({
  asyncHandler: (fn) => fn
}));

// Mock the service
jest.mock('../../src/services/PastPerformanceService');

describe('Past Performance API Routes', () => {
  let app;
  let mockService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup express app
    app = express();
    app.use(express.json());
    app.use('/api/past-performance', pastPerformanceRouter);

    // Mock service instance
    mockService = {
      createPastPerformance: jest.fn(),
      getPastPerformance: jest.fn(),
      updatePastPerformance: jest.fn(),
      deletePastPerformance: jest.fn(),
      searchPastPerformance: jest.fn(),
      getAnalytics: jest.fn(),
      pastPerformanceModel: {
        getAll: jest.fn()
      }
    };

    PastPerformanceService.mockImplementation(() => mockService);
  });

  describe('POST /api/past-performance', () => {
    const validPPData = {
      projectName: 'Test Project',
      customer: 'Test Customer',
      summary: 'Test summary'
    };

    it('should create past performance successfully', async () => {
      const mockResult = {
        pastPerformance: {
          id: 'test-id',
          projectName: 'Test Project',
          customer: 'Test Customer'
        },
        processingResults: {
          technologiesExtracted: true,
          embeddingsGenerated: true,
          chunkCount: 2
        }
      };

      mockService.createPastPerformance.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/past-performance')
        .send(validPPData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockResult.pastPerformance,
        processing: mockResult.processingResults,
        message: 'Past performance created successfully'
      });

      expect(mockService.createPastPerformance).toHaveBeenCalledWith(
        validPPData,
        {
          generateEmbeddings: true,
          extractTechnologies: true
        }
      );
    });

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed');
      mockService.createPastPerformance.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/past-performance')
        .send(validPPData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Creation failed'
      });
    });

    it('should respect processing options', async () => {
      const dataWithOptions = {
        ...validPPData,
        generateEmbeddings: false,
        extractTechnologies: false
      };

      const mockResult = {
        pastPerformance: { id: 'test-id' },
        processingResults: {
          technologiesExtracted: false,
          embeddingsGenerated: false,
          chunkCount: 0
        }
      };

      mockService.createPastPerformance.mockResolvedValue(mockResult);

      await request(app)
        .post('/api/past-performance')
        .send(dataWithOptions)
        .expect(201);

      expect(mockService.createPastPerformance).toHaveBeenCalledWith(
        dataWithOptions,
        {
          generateEmbeddings: false,
          extractTechnologies: false
        }
      );
    });
  });

  describe('GET /api/past-performance', () => {
    it('should return all past performance records', async () => {
      const mockResult = {
        records: [
          { id: 'pp-1', projectName: 'Project 1' },
          { id: 'pp-2', projectName: 'Project 2' }
        ],
        pagination: {
          total: 2,
          limit: 20,
          offset: 0,
          pages: 1,
          currentPage: 1
        }
      };

      mockService.pastPerformanceModel.getAll.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/past-performance')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResult.records,
        pagination: mockResult.pagination,
        filters: {}
      });
    });

    it('should apply query filters', async () => {
      const mockResult = {
        records: [{ id: 'pp-1', projectName: 'Project 1' }],
        pagination: { total: 1, limit: 20, offset: 0, pages: 1, currentPage: 1 }
      };

      mockService.pastPerformanceModel.getAll.mockResolvedValue(mockResult);

      const queryParams = {
        customer: 'Test Customer',
        customerType: 'Federal',
        technologies: 'Java,React',
        minValue: '1000000',
        limit: '10'
      };

      await request(app)
        .get('/api/past-performance')
        .query(queryParams)
        .expect(200);

      expect(mockService.pastPerformanceModel.getAll).toHaveBeenCalledWith(
        {
          customer: 'Test Customer',
          customerType: 'Federal',
          technologies: ['Java', 'React'],
          minValue: 1000000
        },
        { limit: 10, offset: 0 }
      );
    });

    it('should handle pagination parameters', async () => {
      const mockResult = {
        records: [],
        pagination: { total: 0, limit: 5, offset: 10, pages: 0, currentPage: 3 }
      };

      mockService.pastPerformanceModel.getAll.mockResolvedValue(mockResult);

      await request(app)
        .get('/api/past-performance')
        .query({ limit: '5', offset: '10' })
        .expect(200);

      expect(mockService.pastPerformanceModel.getAll).toHaveBeenCalledWith(
        {},
        { limit: 5, offset: 10 }
      );
    });
  });

  describe('GET /api/past-performance/search', () => {
    it('should perform advanced search', async () => {
      const mockResult = {
        results: [
          {
            id: 'pp-1',
            projectName: 'Java Project',
            relevanceScore: 0.9,
            matchReasons: ['Technology match: Java']
          }
        ],
        groupedResults: {
          highRelevance: [{ id: 'pp-1', relevanceScore: 0.9 }],
          mediumRelevance: [],
          lowRelevance: []
        },
        searchMetadata: {
          query: 'Java modernization',
          searchType: 'hybrid',
          totalResults: 1
        }
      };

      mockService.searchPastPerformance.mockResolvedValue(mockResult);

      const queryParams = {
        q: 'Java modernization',
        technologies: 'Java,Spring',
        searchType: 'semantic',
        techWeight: '0.5'
      };

      const response = await request(app)
        .get('/api/past-performance/search')
        .query(queryParams)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResult.results,
        grouped: mockResult.groupedResults,
        metadata: mockResult.searchMetadata
      });

      expect(mockService.searchPastPerformance).toHaveBeenCalledWith({
        query: 'Java modernization',
        filters: {},
        requiredTechnologies: ['Java', 'Spring'],
        domainAreas: [],
        pagination: { limit: 10, offset: 0 },
        searchType: 'semantic',
        weights: {
          technology: 0.5,
          domain: 0.3,
          customer: 0.2,
          semantic: 0.1
        }
      });
    });

    it('should use default search parameters', async () => {
      const mockResult = {
        results: [],
        groupedResults: { highRelevance: [], mediumRelevance: [], lowRelevance: [] },
        searchMetadata: { totalResults: 0 }
      };

      mockService.searchPastPerformance.mockResolvedValue(mockResult);

      await request(app)
        .get('/api/past-performance/search')
        .expect(200);

      expect(mockService.searchPastPerformance).toHaveBeenCalledWith({
        query: undefined,
        filters: {},
        requiredTechnologies: [],
        domainAreas: [],
        pagination: { limit: 10, offset: 0 },
        searchType: 'hybrid',
        weights: {
          technology: 0.4,
          domain: 0.3,
          customer: 0.2,
          semantic: 0.1
        }
      });
    });
  });

  describe('GET /api/past-performance/:id', () => {
    it('should return specific past performance record', async () => {
      const mockPP = {
        id: 'test-id',
        projectName: 'Test Project',
        customer: 'Test Customer'
      };

      mockService.getPastPerformance.mockResolvedValue(mockPP);

      const response = await request(app)
        .get('/api/past-performance/test-id')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockPP
      });

      expect(mockService.getPastPerformance).toHaveBeenCalledWith(
        'test-id',
        { includeChunks: false, includeSimilar: false }
      );
    });

    it('should handle optional parameters', async () => {
      const mockPP = {
        id: 'test-id',
        projectName: 'Test Project',
        chunks: [{ id: 'chunk-1' }],
        similarPastPerformance: [{ id: 'similar-1' }]
      };

      mockService.getPastPerformance.mockResolvedValue(mockPP);

      await request(app)
        .get('/api/past-performance/test-id')
        .query({ includeChunks: 'true', includeSimilar: 'true' })
        .expect(200);

      expect(mockService.getPastPerformance).toHaveBeenCalledWith(
        'test-id',
        { includeChunks: true, includeSimilar: true }
      );
    });

    it('should return 404 for non-existent record', async () => {
      mockService.getPastPerformance.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/past-performance/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Past performance record not found'
      });
    });
  });

  describe('PUT /api/past-performance/:id', () => {
    const updateData = {
      projectName: 'Updated Project',
      summary: 'Updated summary'
    };

    it('should update past performance successfully', async () => {
      const mockUpdatedPP = {
        id: 'test-id',
        projectName: 'Updated Project',
        summary: 'Updated summary'
      };

      mockService.updatePastPerformance.mockResolvedValue(mockUpdatedPP);

      const response = await request(app)
        .put('/api/past-performance/test-id')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedPP,
        message: 'Past performance updated successfully'
      });

      expect(mockService.updatePastPerformance).toHaveBeenCalledWith(
        'test-id',
        updateData,
        { regenerateEmbeddings: false, reextractTechnologies: false }
      );
    });

    it('should handle update options', async () => {
      const updateDataWithOptions = {
        ...updateData,
        regenerateEmbeddings: true,
        reextractTechnologies: true
      };

      const mockUpdatedPP = { id: 'test-id' };
      mockService.updatePastPerformance.mockResolvedValue(mockUpdatedPP);

      await request(app)
        .put('/api/past-performance/test-id')
        .send(updateDataWithOptions)
        .expect(200);

      expect(mockService.updatePastPerformance).toHaveBeenCalledWith(
        'test-id',
        updateDataWithOptions,
        { regenerateEmbeddings: true, reextractTechnologies: true }
      );
    });

    it('should return 404 for non-existent record', async () => {
      mockService.updatePastPerformance.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/past-performance/non-existent')
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Past performance record not found'
      });
    });
  });

  describe('DELETE /api/past-performance/:id', () => {
    it('should delete past performance successfully', async () => {
      mockService.deletePastPerformance.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/past-performance/test-id')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Past performance deleted successfully'
      });

      expect(mockService.deletePastPerformance).toHaveBeenCalledWith('test-id');
    });

    it('should return 404 for non-existent record', async () => {
      mockService.deletePastPerformance.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/past-performance/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Past performance record not found'
      });
    });
  });

  describe('POST /api/past-performance/:id/feedback', () => {
    it('should accept valid feedback', async () => {
      const feedbackData = {
        feedbackType: 'thumbs_up',
        relevanceScore: 0.9,
        reason: 'Very relevant match',
        searchContext: { query: 'Java project' }
      };

      const response = await request(app)
        .post('/api/past-performance/test-id/feedback')
        .send(feedbackData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Feedback recorded successfully'
      });
    });

    it('should reject invalid feedback type', async () => {
      const invalidFeedback = {
        feedbackType: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/past-performance/test-id/feedback')
        .send(invalidFeedback)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid feedback type'
      });
    });
  });

  describe('GET /api/past-performance/analytics/overview', () => {
    it('should return analytics overview', async () => {
      const mockAnalytics = {
        total: 50,
        byCustomerType: [{ customer_type: 'Federal', count: 40 }],
        technologyTrends: { trending: ['React', 'AWS'] },
        performanceMetrics: { averageContractValue: 5000000 }
      };

      mockService.getAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/past-performance/analytics/overview')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAnalytics
      });
    });
  });

  describe('GET /api/past-performance/export', () => {
    it('should export data as JSON by default', async () => {
      const mockData = {
        records: [
          { id: 'pp-1', projectName: 'Project 1' },
          { id: 'pp-2', projectName: 'Project 2' }
        ]
      };

      mockService.pastPerformanceModel.getAll.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/past-performance/export')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockData.records,
        exportMetadata: {
          format: 'json',
          filters: {},
          totalRecords: 2,
          exportedAt: expect.any(String)
        }
      });
    });

    it('should handle CSV export request', async () => {
      const response = await request(app)
        .get('/api/past-performance/export')
        .query({ format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(response.headers['content-disposition']).toMatch(/filename=past_performance\.csv/);
    });

    it('should apply export filters', async () => {
      const mockData = { records: [] };
      mockService.pastPerformanceModel.getAll.mockResolvedValue(mockData);

      await request(app)
        .get('/api/past-performance/export')
        .query({ customer: 'Test Customer', customerType: 'Federal' })
        .expect(200);

      expect(mockService.pastPerformanceModel.getAll).toHaveBeenCalledWith(
        { customer: 'Test Customer', customerType: 'Federal' },
        { limit: 1000, offset: 0 }
      );
    });
  });

  describe('POST /api/past-performance/bulk-import', () => {
    it('should handle bulk import request', async () => {
      const response = await request(app)
        .post('/api/past-performance/bulk-import')
        .attach('csvFile', Buffer.from('test,data'), 'test.csv')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Bulk import initiated. Processing will begin shortly.',
        data: {
          importId: expect.any(String),
          filename: 'test.csv',
          status: 'processing'
        }
      });
    });

    it('should reject request without file', async () => {
      const response = await request(app)
        .post('/api/past-performance/bulk-import')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'No CSV file provided'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const serviceError = new Error('Service unavailable');
      mockService.createPastPerformance.mockRejectedValue(serviceError);

      const response = await request(app)
        .post('/api/past-performance')
        .send({
          projectName: 'Test',
          customer: 'Customer',
          summary: 'Summary'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/past-performance')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing required parameters', async () => {
      // This would be caught by validation middleware in real implementation
      const response = await request(app)
        .post('/api/past-performance')
        .send({}) // Empty body
        .expect(500); // Would be 400 with proper validation

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication and Authorization', () => {
    // These tests would be more relevant with actual auth middleware
    it('should accept requests without authentication in test environment', async () => {
      mockService.pastPerformanceModel.getAll.mockResolvedValue({
        records: [],
        pagination: { total: 0, limit: 20, offset: 0, pages: 0, currentPage: 1 }
      });

      await request(app)
        .get('/api/past-performance')
        .expect(200);
    });
  });

  describe('Content Type Handling', () => {
    it('should handle JSON content type', async () => {
      const mockResult = {
        pastPerformance: { id: 'test' },
        processingResults: { technologiesExtracted: true, embeddingsGenerated: true, chunkCount: 1 }
      };

      mockService.createPastPerformance.mockResolvedValue(mockResult);

      await request(app)
        .post('/api/past-performance')
        .set('Content-Type', 'application/json')
        .send({
          projectName: 'Test',
          customer: 'Customer',
          summary: 'Summary'
        })
        .expect(201);
    });

    it('should reject non-JSON content for JSON endpoints', async () => {
      await request(app)
        .post('/api/past-performance')
        .set('Content-Type', 'text/plain')
        .send('plain text data')
        .expect(400);
    });
  });
});