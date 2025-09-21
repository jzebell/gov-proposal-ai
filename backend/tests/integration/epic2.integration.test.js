/**
 * Epic 2 Integration Tests
 * End-to-end testing of past performance system
 */

const request = require('supertest');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;

// Test database setup
const testDbConfig = {
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5432/govpropai_test'
};

describe('Epic 2 Integration Tests', () => {
  let app;
  let pool;

  beforeAll(async () => {
    // Setup test database
    pool = new Pool(testDbConfig);

    // Use testUtils from setup for schema and data loading
    await global.testUtils.setupTestSchema(pool);
    await global.testUtils.loadTestData(pool);

    // Setup express app
    const express = require('express');
    app = express();
    app.use(express.json());

    // Add routes
    const pastPerformanceRouter = require('../../src/routes/pastPerformance');
    app.use('/api/past-performance', pastPerformanceRouter);

    // Error handling
    app.use((error, req, res, next) => {
      res.status(500).json({
        success: false,
        message: error.message
      });
    });
  });

  afterAll(async () => {
    // Cleanup test database
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await pool.end();
  });

  beforeEach(async () => {
    // Reset test data between tests if needed
    // For now, we'll use the same data for all tests
  });

  describe('Past Performance CRUD Operations', () => {
    let createdPPId;

    it('should create a new past performance record', async () => {
      const newPP = {
        projectName: 'Integration Test Project',
        customer: 'Test Customer Agency',
        customerType: 'Federal',
        contractValue: 2500000,
        contractType: 'Prime',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        workType: 'DME',
        dmePercentage: 80,
        omPercentage: 20,
        summary: 'This is a test project for integration testing of the past performance system.',
        technicalApproach: 'Used modern technologies including React, Node.js, and PostgreSQL to deliver a scalable solution.',
        technologiesUsed: ['React', 'Node.js', 'PostgreSQL'],
        domainAreas: ['Web Development', 'Database Management'],
        performanceMetrics: {
          onTime: true,
          onBudget: true,
          customerSatisfaction: 4.8
        },
        lessonsLearned: 'Early stakeholder engagement was key to project success.',
        challengesOvercome: 'Overcame initial database performance issues through query optimization.'
      };

      const response = await request(app)
        .post('/api/past-performance')
        .send(newPP)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        projectName: 'Integration Test Project',
        customer: 'Test Customer Agency',
        contractValue: 2500000
      });

      createdPPId = response.body.data.id;
    });

    it('should retrieve the created past performance record', async () => {
      const response = await request(app)
        .get(`/api/past-performance/${createdPPId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: createdPPId,
        projectName: 'Integration Test Project',
        customer: 'Test Customer Agency'
      });
    });

    it('should update the past performance record', async () => {
      const updates = {
        summary: 'Updated summary for integration test project.',
        contractValue: 2750000
      };

      const response = await request(app)
        .put(`/api/past-performance/${createdPPId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBe(updates.summary);
      expect(response.body.data.contractValue).toBe(updates.contractValue);
    });

    it('should list all past performance records', async () => {
      const response = await request(app)
        .get('/api/past-performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toMatchObject({
        total: expect.any(Number),
        limit: expect.any(Number),
        offset: expect.any(Number)
      });
    });

    it('should delete the past performance record', async () => {
      const response = await request(app)
        .delete(`/api/past-performance/${createdPPId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Past performance deleted successfully');

      // Verify deletion
      await request(app)
        .get(`/api/past-performance/${createdPPId}`)
        .expect(404);
    });
  });

  describe('Search and Filtering', () => {
    it('should filter by customer type', async () => {
      const response = await request(app)
        .get('/api/past-performance')
        .query({ customerType: 'Federal' })
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(pp => {
        expect(pp.customerType).toBe('Federal');
      });
    });

    it('should filter by contract value range', async () => {
      const response = await request(app)
        .get('/api/past-performance')
        .query({
          minValue: '1000000',
          maxValue: '5000000'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(pp => {
        if (pp.contractValue) {
          expect(pp.contractValue).toBeGreaterThanOrEqual(1000000);
          expect(pp.contractValue).toBeLessThanOrEqual(5000000);
        }
      });
    });

    it('should filter by technologies', async () => {
      const response = await request(app)
        .get('/api/past-performance')
        .query({ technologies: 'Java,React' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Verify that returned records contain at least one of the specified technologies
      response.body.data.forEach(pp => {
        const hasMatchingTech = pp.technologiesUsed.some(tech =>
          ['Java', 'React'].includes(tech)
        );
        expect(hasMatchingTech).toBe(true);
      });
    });

    it('should perform text search', async () => {
      const response = await request(app)
        .get('/api/past-performance')
        .query({ search: 'modernization' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should find records with 'modernization' in project name or summary
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should handle pagination', async () => {
      const page1Response = await request(app)
        .get('/api/past-performance')
        .query({ limit: '3', offset: '0' })
        .expect(200);

      const page2Response = await request(app)
        .get('/api/past-performance')
        .query({ limit: '3', offset: '3' })
        .expect(200);

      expect(page1Response.body.data.length).toBeLessThanOrEqual(3);
      expect(page2Response.body.data.length).toBeLessThanOrEqual(3);

      // IDs should be different (assuming more than 3 records)
      const page1Ids = page1Response.body.data.map(pp => pp.id);
      const page2Ids = page2Response.body.data.map(pp => pp.id);
      const overlap = page1Ids.filter(id => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });
  });

  describe('Advanced Search', () => {
    it('should perform advanced search with multiple criteria', async () => {
      const searchParams = {
        q: 'analytics platform',
        technologies: 'Python,AWS',
        customerType: 'Federal',
        minValue: '1000000',
        searchType: 'hybrid'
      };

      const response = await request(app)
        .get('/api/past-performance/search')
        .query(searchParams)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.grouped).toBeDefined();
      expect(response.body.metadata).toMatchObject({
        query: 'analytics platform',
        searchType: 'hybrid',
        totalResults: expect.any(Number)
      });
    });

    it('should return grouped search results', async () => {
      const response = await request(app)
        .get('/api/past-performance/search')
        .query({ q: 'modernization', technologies: 'Java' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.grouped).toMatchObject({
        highRelevance: expect.any(Array),
        mediumRelevance: expect.any(Array),
        lowRelevance: expect.any(Array)
      });

      // Verify relevance scores are properly ordered
      const allResults = [
        ...response.body.grouped.highRelevance,
        ...response.body.grouped.mediumRelevance,
        ...response.body.grouped.lowRelevance
      ];

      for (let i = 1; i < allResults.length; i++) {
        expect(allResults[i-1].relevanceScore).toBeGreaterThanOrEqual(allResults[i].relevanceScore);
      }
    });

    it('should handle empty search results', async () => {
      const response = await request(app)
        .get('/api/past-performance/search')
        .query({ q: 'nonexistent technology stack' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.metadata.totalResults).toBe(0);
    });
  });

  describe('Analytics and Reporting', () => {
    it('should return analytics overview', async () => {
      const response = await request(app)
        .get('/api/past-performance/analytics/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        total: expect.any(Number),
        byCustomerType: expect.any(Array),
        byWorkType: expect.any(Array),
        byContractType: expect.any(Array),
        contractValues: expect.any(Object),
        technologyTrends: expect.any(Object),
        performanceMetrics: expect.any(Object)
      });
    });

    it('should return technology analytics', async () => {
      const response = await request(app)
        .get('/api/past-performance/analytics/technologies')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        mostUsed: expect.any(Array),
        byCategory: expect.any(Array),
        byType: expect.any(Array)
      });
    });
  });

  describe('Data Export', () => {
    it('should export past performance data as JSON', async () => {
      const response = await request(app)
        .get('/api/past-performance/export')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.exportMetadata).toMatchObject({
        format: 'json',
        totalRecords: expect.any(Number),
        exportedAt: expect.any(String)
      });
    });

    it('should export filtered data', async () => {
      const response = await request(app)
        .get('/api/past-performance/export')
        .query({ customerType: 'Federal', contractType: 'Prime' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.exportMetadata.filters).toMatchObject({
        customerType: 'Federal',
        contractType: 'Prime'
      });

      // Verify all exported records match the filters
      response.body.data.forEach(pp => {
        expect(pp.customerType).toBe('Federal');
        expect(pp.contractType).toBe('Prime');
      });
    });
  });

  describe('Feedback System', () => {
    it('should accept search feedback', async () => {
      // First, get a past performance ID
      const searchResponse = await request(app)
        .get('/api/past-performance')
        .query({ limit: '1' })
        .expect(200);

      if (searchResponse.body.data.length > 0) {
        const ppId = searchResponse.body.data[0].id;

        const feedbackData = {
          feedbackType: 'thumbs_up',
          relevanceScore: 0.9,
          reason: 'Excellent match for our requirements',
          searchContext: {
            query: 'Java modernization',
            filters: { customerType: 'Federal' }
          }
        };

        const response = await request(app)
          .post(`/api/past-performance/${ppId}/feedback`)
          .send(feedbackData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Feedback recorded successfully');
      }
    });

    it('should reject invalid feedback types', async () => {
      const searchResponse = await request(app)
        .get('/api/past-performance')
        .query({ limit: '1' })
        .expect(200);

      if (searchResponse.body.data.length > 0) {
        const ppId = searchResponse.body.data[0].id;

        const invalidFeedback = {
          feedbackType: 'invalid_type',
          relevanceScore: 0.5
        };

        const response = await request(app)
          .post(`/api/past-performance/${ppId}/feedback`)
          .send(invalidFeedback)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid feedback type');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed request data gracefully', async () => {
      const malformedData = {
        projectName: '', // Empty required field
        customer: null,   // Null required field
        dmePercentage: 150, // Invalid percentage
        omPercentage: -50   // Invalid percentage
      };

      const response = await request(app)
        .post('/api/past-performance')
        .send(malformedData)
        .expect(500); // Would be 400 with proper validation middleware

      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent resource requests', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/past-performance/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Past performance record not found');
    });

    it('should handle invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/past-performance/invalid-uuid')
        .expect(500); // Database error due to invalid UUID

      expect(response.body.success).toBe(false);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce percentage total validation', async () => {
      const invalidPercentageData = {
        projectName: 'Test Project',
        customer: 'Test Customer',
        summary: 'Test summary',
        dmePercentage: 60,
        omPercentage: 50 // Totals 110%
      };

      const response = await request(app)
        .post('/api/past-performance')
        .send(invalidPercentageData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('DME and O&M percentages must total 100');
    });

    it('should enforce date validation', async () => {
      const invalidDateData = {
        projectName: 'Test Project',
        customer: 'Test Customer',
        summary: 'Test summary',
        startDate: '2023-12-31',
        endDate: '2023-01-01' // End before start
      };

      const response = await request(app)
        .post('/api/past-performance')
        .send(invalidDateData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Start date must be before end date');
    });

    it('should enforce required field validation', async () => {
      const incompleteData = {
        projectName: 'Test Project'
        // Missing customer and summary
      };

      const response = await request(app)
        .post('/api/past-performance')
        .send(incompleteData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent requests', async () => {
      const concurrentRequests = Array(10).fill().map(() =>
        request(app)
          .get('/api/past-performance')
          .query({ limit: '5' })
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/past-performance')
        .query({ limit: '100' })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});

// Helper function to wait for database operations
const waitForDb = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));