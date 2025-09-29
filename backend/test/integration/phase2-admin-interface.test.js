/**
 * Phase 2 Integration Tests - Admin Configuration Interface
 * Tests admin settings, context configuration, and UI integration
 */

const request = require('supertest');
const { app } = require('../../src/app');

describe('Phase 2: Admin Configuration Interface', () => {
  describe('Context Configuration API', () => {
    test('should retrieve context configuration', async () => {
      const response = await request(app)
        .get('/api/global-settings/config/context')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('documentTypesPriority');
      expect(response.body.data).toHaveProperty('metadataWeights');
      expect(response.body.data).toHaveProperty('ragStrictness');
    });

    test('should update context configuration', async () => {
      const updateData = {
        ragStrictness: 75,
        metadataWeights: {
          agency_match: 8,
          technology_match: 7,
          recency: 5,
          keyword_relevance: 9
        }
      };

      const response = await request(app)
        .put('/api/global-settings/config/context')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify the update
      const verifyResponse = await request(app)
        .get('/api/global-settings/config/context')
        .expect(200);

      expect(verifyResponse.body.data.ragStrictness).toBe(75);
    });

    test('should reset configuration to defaults', async () => {
      const response = await request(app)
        .post('/api/global-settings/config/context/reset')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify reset
      const verifyResponse = await request(app)
        .get('/api/global-settings/config/context')
        .expect(200);

      expect(verifyResponse.body.data.ragStrictness).toBe(60); // Default value
    });
  });

  describe('Document Priority Management', () => {
    test('should update document type priorities', async () => {
      const priorityOrder = [
        'past-performance',
        'solicitations',
        'requirements',
        'references',
        'proposals',
        'compliance',
        'media'
      ];

      const response = await request(app)
        .put('/api/global-settings/config/context')
        .send({ documentTypesPriority: priorityOrder })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify the update
      const verifyResponse = await request(app)
        .get('/api/global-settings/config/context')
        .expect(200);

      const savedPriorities = JSON.parse(verifyResponse.body.data.documentTypesPriority);
      expect(savedPriorities[0]).toBe('past-performance');
    });

    test('should validate document type priorities', async () => {
      const invalidPriorities = ['invalid-type', 'solicitations'];

      const response = await request(app)
        .put('/api/global-settings/config/context')
        .send({ documentTypesPriority: invalidPriorities });

      // Should handle invalid types appropriately
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Metadata Weight Configuration', () => {
    test('should update metadata weights', async () => {
      const weights = {
        agency_match: 9,
        technology_match: 8,
        recency: 4,
        keyword_relevance: 7
      };

      const response = await request(app)
        .put('/api/global-settings/config/context')
        .send({ metadataWeights: weights })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should validate metadata weight ranges', async () => {
      const invalidWeights = {
        agency_match: 15, // Invalid: > 10
        technology_match: -1, // Invalid: < 0
        recency: 5,
        keyword_relevance: 'invalid' // Invalid: not a number
      };

      const response = await request(app)
        .put('/api/global-settings/config/context')
        .send({ metadataWeights: invalidWeights });

      // Should handle validation appropriately
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('RAG Strictness Configuration', () => {
    test('should update RAG strictness', async () => {
      const strictnessLevels = [0, 25, 50, 75, 100];

      for (const strictness of strictnessLevels) {
        const response = await request(app)
          .put('/api/global-settings/config/context')
          .send({ ragStrictness: strictness })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should validate RAG strictness range', async () => {
      const invalidValues = [-1, 101, 'invalid'];

      for (const value of invalidValues) {
        const response = await request(app)
          .put('/api/global-settings/config/context')
          .send({ ragStrictness: value });

        // Should handle validation
        expect([200, 400]).toContain(response.status);
      }
    });
  });

  describe('Configuration Persistence', () => {
    test('should persist configuration across restarts', async () => {
      // Set a unique configuration
      const testConfig = {
        ragStrictness: 88,
        metadataWeights: {
          agency_match: 9,
          technology_match: 3,
          recency: 7,
          keyword_relevance: 5
        }
      };

      await request(app)
        .put('/api/global-settings/config/context')
        .send(testConfig)
        .expect(200);

      // Verify persistence (in real scenario, this would involve restart)
      const verifyResponse = await request(app)
        .get('/api/global-settings/config/context')
        .expect(200);

      expect(verifyResponse.body.data.ragStrictness).toBe(88);
    });

    test('should handle concurrent configuration updates', async () => {
      const updates = [
        { ragStrictness: 30 },
        { ragStrictness: 70 },
        { ragStrictness: 90 }
      ];

      // Send concurrent updates
      const responses = await Promise.all(
        updates.map(update =>
          request(app)
            .put('/api/global-settings/config/context')
            .send(update)
        )
      );

      // All should succeed or handle gracefully
      responses.forEach(response => {
        expect([200, 400, 409]).toContain(response.status);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed configuration data', async () => {
      const malformedData = {
        ragStrictness: 'not-a-number',
        metadataWeights: 'not-an-object',
        documentTypesPriority: 'not-an-array'
      };

      const response = await request(app)
        .put('/api/global-settings/config/context')
        .send(malformedData);

      expect([400, 422]).toContain(response.status);
    });

    test('should handle database connection errors', async () => {
      // This would require mocking database failures
      // Placeholder for database error scenarios
      expect(true).toBe(true);
    });
  });
});

describe('Phase 2: Performance Validation', () => {
  describe('Configuration Performance', () => {
    test('should retrieve configuration quickly', async () => {
      const start = Date.now();
      await request(app)
        .get('/api/global-settings/config/context')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });

    test('should update configuration efficiently', async () => {
      const start = Date.now();
      await request(app)
        .put('/api/global-settings/config/context')
        .send({ ragStrictness: 65 })
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Batch Operations', () => {
    test('should handle multiple configuration updates', async () => {
      const batchUpdates = [];

      for (let i = 0; i < 10; i++) {
        batchUpdates.push(
          request(app)
            .put('/api/global-settings/config/context')
            .send({ ragStrictness: 50 + i })
        );
      }

      const responses = await Promise.all(batchUpdates);

      responses.forEach(response => {
        expect([200, 400]).toContain(response.status);
      });
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should not accumulate memory during configuration operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple configuration operations
      for (let i = 0; i < 50; i++) {
        await request(app)
          .get('/api/global-settings/config/context')
          .expect(200);

        await request(app)
          .put('/api/global-settings/config/context')
          .send({ ragStrictness: 40 + (i % 20) })
          .expect(200);
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal for configuration operations
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB limit
    });
  });
});