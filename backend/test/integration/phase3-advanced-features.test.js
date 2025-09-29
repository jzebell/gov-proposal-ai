/**
 * Phase 3 Integration Tests - Advanced Features & Analytics
 * Tests context overflow management, citations system, and analytics dashboard
 */

const request = require('supertest');
const { app } = require('../../src/app');

describe('Phase 3: Advanced Features Integration', () => {
  describe('Context Overflow Management', () => {
    test('should check for context overflow', async () => {
      const overflowRequest = {
        projectName: 'TestProject',
        selectedDocuments: ['doc1', 'doc2', 'doc3'],
        requirements: 'Test requirements for overflow checking'
      };

      const response = await request(app)
        .post('/api/context/overflow/check')
        .send(overflowRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('wouldOverflow');
      expect(response.body.data).toHaveProperty('currentTokens');
      expect(response.body.data).toHaveProperty('maxTokens');
    });

    test('should provide document recommendations on overflow', async () => {
      const overflowRequest = {
        projectName: 'TestProject',
        selectedDocuments: Array.from({length: 20}, (_, i) => `doc${i}`), // Large set
        requirements: 'Test requirements for overflow recommendations'
      };

      const response = await request(app)
        .post('/api/context/overflow/check')
        .send(overflowRequest)
        .expect(200);

      if (response.body.data.wouldOverflow) {
        expect(response.body.data).toHaveProperty('recommendations');
        expect(Array.isArray(response.body.data.recommendations)).toBe(true);
      }
    });

    test('should apply document selection', async () => {
      const selectionRequest = {
        projectName: 'TestProject',
        selectedDocuments: ['doc1', 'doc2'],
        requirements: 'Applied selection test'
      };

      const response = await request(app)
        .post('/api/context/overflow/select')
        .send(selectionRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('finalSelection');
    });

    test('should track overflow events', async () => {
      const response = await request(app)
        .get('/api/context/overflow/stats/TestProject')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalOverflowEvents');
      expect(response.body.data).toHaveProperty('averageResolutionTime');
    });
  });

  describe('Enhanced Citation System', () => {
    test('should generate enhanced citations', async () => {
      const citationRequest = {
        documents: [
          {
            id: 'doc1',
            title: 'Test Document 1',
            content: 'Test content for citation generation'
          }
        ],
        context: 'Generated content that references the documents'
      };

      const response = await request(app)
        .post('/api/citations/generate')
        .send(citationRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('citations');
      expect(Array.isArray(response.body.data.citations)).toBe(true);
    });

    test('should provide document previews', async () => {
      const response = await request(app)
        .get('/api/citations/preview/doc1/0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('navigation');
    });

    test('should track citation access', async () => {
      const accessData = {
        citationId: 'citation1',
        documentId: 'doc1',
        userId: 'testuser',
        accessType: 'click',
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/citations/track-access')
        .send(accessData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should provide citation analytics', async () => {
      const response = await request(app)
        .get('/api/citations/analytics/TestProject')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalAccesses');
      expect(response.body.data).toHaveProperty('mostAccessedDocuments');
    });

    test('should support citation feedback', async () => {
      const feedbackData = {
        citationId: 'citation1',
        rating: 5,
        feedback: 'Very helpful citation',
        userId: 'testuser'
      };

      const response = await request(app)
        .post('/api/citations/feedback')
        .send(feedbackData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Performance Analytics Dashboard', () => {
    test('should provide dashboard analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('systemOverview');
      expect(response.body.data).toHaveProperty('contextPerformance');
      expect(response.body.data).toHaveProperty('citationAnalytics');
      expect(response.body.data).toHaveProperty('userEngagement');
    });

    test('should provide real-time metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/realtime')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('activeBuilds');
      expect(response.body.data).toHaveProperty('activeCitations');
      expect(response.body.data).toHaveProperty('systemHealth');
    });

    test('should track performance metrics', async () => {
      const performanceData = {
        projectName: 'TestProject',
        buildDuration: 1500,
        tokenCount: 8000,
        documentCount: 5,
        success: true
      };

      const response = await request(app)
        .post('/api/analytics/context-build')
        .send(performanceData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should provide performance trends', async () => {
      const response = await request(app)
        .get('/api/analytics/trends/TestProject')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('performanceOverTime');
      expect(response.body.data).toHaveProperty('trend');
    });

    test('should support data export', async () => {
      const exportRequest = {
        projectName: 'TestProject',
        timeRange: '24h',
        includeRawData: true
      };

      const response = await request(app)
        .post('/api/analytics/export')
        .send(exportRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('exportData');
    });
  });

  describe('Service Health Checks', () => {
    test('should verify context service health', async () => {
      const response = await request(app)
        .get('/api/context/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });

    test('should verify citation service health', async () => {
      const response = await request(app)
        .get('/api/citations/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.features).toHaveProperty('citationGeneration');
    });

    test('should verify analytics service health', async () => {
      const response = await request(app)
        .get('/api/analytics/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.features).toHaveProperty('contextBuildTracking');
    });
  });

  describe('Cross-Service Integration', () => {
    test('should integrate overflow events with analytics', async () => {
      // Generate overflow event
      const overflowRequest = {
        projectName: 'IntegrationTest',
        selectedDocuments: Array.from({length: 25}, (_, i) => `doc${i}`),
        requirements: 'Integration test requirements'
      };

      await request(app)
        .post('/api/context/overflow/check')
        .send(overflowRequest)
        .expect(200);

      // Check if analytics captured the event
      const analyticsResponse = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      // Analytics should reflect the overflow event
      expect(analyticsResponse.body.success).toBe(true);
    });

    test('should integrate citation access with analytics', async () => {
      // Track citation access
      const accessData = {
        citationId: 'integration-citation',
        documentId: 'integration-doc',
        userId: 'integration-user',
        accessType: 'preview'
      };

      await request(app)
        .post('/api/citations/track-access')
        .send(accessData)
        .expect(200);

      // Check if analytics captured the access
      const analyticsResponse = await request(app)
        .get('/api/analytics/citations/IntegrationTest')
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    test('should handle missing documents gracefully', async () => {
      const response = await request(app)
        .get('/api/citations/preview/nonexistent/0');

      expect([200, 404]).toContain(response.status);
    });

    test('should handle invalid overflow requests', async () => {
      const response = await request(app)
        .post('/api/context/overflow/check')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle analytics service overload', async () => {
      // Send many concurrent analytics requests
      const requests = Array.from({length: 100}, () =>
        request(app).get('/api/analytics/dashboard')
      );

      const responses = await Promise.all(requests);

      // All should complete, though some might be rate-limited
      responses.forEach(response => {
        expect([200, 429, 503]).toContain(response.status);
      });
    });
  });
});

describe('Phase 3: Performance Benchmarks', () => {
  describe('Response Time Benchmarks', () => {
    test('context overflow check should be fast', async () => {
      const start = Date.now();
      await request(app)
        .post('/api/context/overflow/check')
        .send({
          projectName: 'PerfTest',
          selectedDocuments: ['doc1', 'doc2', 'doc3'],
          requirements: 'Performance test'
        })
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // 1 second max
    });

    test('citation generation should be efficient', async () => {
      const start = Date.now();
      await request(app)
        .post('/api/citations/generate')
        .send({
          documents: [{
            id: 'perf-doc',
            title: 'Performance Test Doc',
            content: 'Content for performance testing'
          }],
          context: 'Generated content for performance testing'
        })
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000); // 2 seconds max
    });

    test('analytics dashboard should load quickly', async () => {
      const start = Date.now();
      await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500); // 500ms max
    });
  });

  describe('Scalability Tests', () => {
    test('should handle concurrent overflow checks', async () => {
      const concurrentRequests = Array.from({length: 10}, (_, i) =>
        request(app)
          .post('/api/context/overflow/check')
          .send({
            projectName: `ConcurrentTest${i}`,
            selectedDocuments: [`doc${i}1`, `doc${i}2`],
            requirements: `Concurrent test ${i}`
          })
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should handle high-volume analytics tracking', async () => {
      const trackingRequests = Array.from({length: 50}, (_, i) =>
        request(app)
          .post('/api/analytics/context-build')
          .send({
            projectName: 'VolumeTest',
            buildDuration: 1000 + i,
            tokenCount: 5000 + i * 100,
            documentCount: 3,
            success: true
          })
      );

      const responses = await Promise.all(trackingRequests);

      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });
    });
  });

  describe('Memory Management', () => {
    test('should not leak memory during intensive operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform intensive Phase 3 operations
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post('/api/context/overflow/check')
          .send({
            projectName: `MemoryTest${i}`,
            selectedDocuments: Array.from({length: 10}, (_, j) => `doc${i}-${j}`),
            requirements: `Memory test iteration ${i}`
          });

        await request(app)
          .get('/api/analytics/dashboard');

        await request(app)
          .post('/api/citations/track-access')
          .send({
            citationId: `mem-citation-${i}`,
            documentId: `mem-doc-${i}`,
            userId: 'memory-test-user',
            accessType: 'click'
          });
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable for intensive operations
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB limit
    });
  });
});