/**
 * End-to-End User Workflow Tests
 * Tests complete user journeys across all phases of the Context Management System
 */

const request = require('supertest');
const { app } = require('../../src/app');

describe('E2E: Complete User Workflows', () => {
  describe('Document Processing to Content Generation Workflow', () => {
    test('should complete full document-to-context workflow', async () => {
      // Step 1: Upload documents (simulated)
      const documentsResponse = await request(app)
        .get('/api/documents')
        .expect(200);

      expect(documentsResponse.body).toHaveProperty('documents');

      // Step 2: Configure admin settings
      const configResponse = await request(app)
        .put('/api/global-settings/config/context')
        .send({
          ragStrictness: 70,
          metadataWeights: {
            agency_match: 8,
            technology_match: 7,
            recency: 5,
            keyword_relevance: 9
          }
        })
        .expect(200);

      expect(configResponse.body.success).toBe(true);

      // Step 3: Check for potential overflow
      const overflowResponse = await request(app)
        .post('/api/context/overflow/check')
        .send({
          projectName: 'E2EWorkflow',
          selectedDocuments: ['doc1', 'doc2', 'doc3'],
          requirements: 'Complete workflow test requirements'
        })
        .expect(200);

      expect(overflowResponse.body.success).toBe(true);

      // Step 4: Build context
      const contextResponse = await request(app)
        .post('/api/context/build')
        .send({
          projectName: 'E2EWorkflow',
          requirements: 'Complete workflow test requirements',
          selectedDocuments: overflowResponse.body.data.wouldOverflow
            ? overflowResponse.body.data.recommendations?.slice(0, 3) || ['doc1']
            : ['doc1', 'doc2', 'doc3']
        });

      expect([200, 201]).toContain(contextResponse.status);

      // Step 5: Generate citations for the context
      if (contextResponse.status === 200 && contextResponse.body.context) {
        const citationsResponse = await request(app)
          .post('/api/citations/generate')
          .send({
            documents: [
              { id: 'doc1', title: 'Test Doc 1', content: 'Test content' }
            ],
            context: contextResponse.body.context
          })
          .expect(200);

        expect(citationsResponse.body.success).toBe(true);
      }

      // Step 6: Check analytics after workflow completion
      const analyticsResponse = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
    }, 30000); // Extended timeout for full workflow
  });

  describe('Admin Configuration and Monitoring Workflow', () => {
    test('should complete admin monitoring workflow', async () => {
      // Step 1: Check system health
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('ok');

      // Step 2: Check service health for all Phase 3 services
      const contextHealthResponse = await request(app)
        .get('/api/context/health')
        .expect(200);

      const citationsHealthResponse = await request(app)
        .get('/api/citations/health')
        .expect(200);

      const analyticsHealthResponse = await request(app)
        .get('/api/analytics/health')
        .expect(200);

      expect(contextHealthResponse.body.data.status).toBe('healthy');
      expect(citationsHealthResponse.body.data.status).toBe('healthy');
      expect(analyticsHealthResponse.body.data.status).toBe('healthy');

      // Step 3: Review current configuration
      const configResponse = await request(app)
        .get('/api/global-settings/config/context')
        .expect(200);

      expect(configResponse.body.success).toBe(true);

      // Step 4: Update configuration based on needs
      const updateResponse = await request(app)
        .put('/api/global-settings/config/context')
        .send({
          ragStrictness: parseInt(configResponse.body.data.ragStrictness) === 70 ? 80 : 70,
          documentTypesPriority: [
            'requirements',
            'solicitations',
            'past-performance',
            'references',
            'proposals',
            'compliance',
            'media'
          ]
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // Step 5: Monitor analytics dashboard
      const dashboardResponse = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data).toHaveProperty('systemOverview');

      // Step 6: Export analytics data
      const exportResponse = await request(app)
        .post('/api/analytics/export')
        .send({
          timeRange: '24h',
          includeRawData: false
        })
        .expect(200);

      expect(exportResponse.body.success).toBe(true);
    }, 20000);
  });

  describe('Error Recovery and Resilience Workflow', () => {
    test('should handle and recover from various error conditions', async () => {
      // Test 1: Invalid configuration recovery
      const invalidConfigResponse = await request(app)
        .put('/api/global-settings/config/context')
        .send({
          ragStrictness: 'invalid',
          metadataWeights: 'not-an-object'
        });

      expect([400, 422]).toContain(invalidConfigResponse.status);

      // Verify system still works after invalid request
      const healthAfterError = await request(app)
        .get('/api/context/health')
        .expect(200);

      expect(healthAfterError.body.data.status).toBe('healthy');

      // Test 2: Overflow handling with massive document set
      const massiveOverflowResponse = await request(app)
        .post('/api/context/overflow/check')
        .send({
          projectName: 'ErrorRecoveryTest',
          selectedDocuments: Array.from({length: 100}, (_, i) => `massive-doc-${i}`),
          requirements: 'Test with extremely large document set'
        });

      expect([200, 400]).toContain(massiveOverflowResponse.status);

      if (massiveOverflowResponse.status === 200) {
        expect(massiveOverflowResponse.body.data.wouldOverflow).toBe(true);
        expect(massiveOverflowResponse.body.data).toHaveProperty('recommendations');
      }

      // Test 3: Invalid citation requests
      const invalidCitationResponse = await request(app)
        .post('/api/citations/generate')
        .send({
          documents: [],
          context: ''
        });

      expect([200, 400]).toContain(invalidCitationResponse.status);

      // Test 4: Verify analytics still works after errors
      const analyticsAfterErrors = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(analyticsAfterErrors.body.success).toBe(true);

      // Test 5: Reset configuration to known good state
      const resetResponse = await request(app)
        .post('/api/global-settings/config/context/reset')
        .expect(200);

      expect(resetResponse.body.success).toBe(true);
    }, 25000);
  });

  describe('High-Load User Simulation', () => {
    test('should handle multiple concurrent user workflows', async () => {
      const concurrentUsers = 5;
      const userWorkflows = [];

      for (let userId = 0; userId < concurrentUsers; userId++) {
        const userWorkflow = async () => {
          // Each user performs a complete workflow
          const projectName = `ConcurrentUser${userId}`;

          // User checks configuration
          await request(app)
            .get('/api/global-settings/config/context')
            .expect(200);

          // User checks for overflow
          await request(app)
            .post('/api/context/overflow/check')
            .send({
              projectName,
              selectedDocuments: [`user${userId}-doc1`, `user${userId}-doc2`],
              requirements: `Requirements for user ${userId}`
            })
            .expect(200);

          // User builds context
          const contextResult = await request(app)
            .post('/api/context/build')
            .send({
              projectName,
              requirements: `Requirements for user ${userId}`,
              selectedDocuments: [`user${userId}-doc1`]
            });

          // User tracks citation access
          await request(app)
            .post('/api/citations/track-access')
            .send({
              citationId: `user${userId}-citation`,
              documentId: `user${userId}-doc1`,
              userId: `testuser${userId}`,
              accessType: 'click'
            })
            .expect(200);

          // User checks analytics
          await request(app)
            .get('/api/analytics/dashboard')
            .expect(200);

          return { userId, success: true };
        };

        userWorkflows.push(userWorkflow());
      }

      const results = await Promise.all(userWorkflows);

      // All user workflows should complete successfully
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.userId).toBe(index);
      });

      // System should remain healthy after concurrent load
      const finalHealthCheck = await request(app)
        .get('/api/analytics/realtime')
        .expect(200);

      expect(finalHealthCheck.body.data.systemHealth).toBe('healthy');
    }, 60000); // Extended timeout for concurrent users
  });

  describe('Data Persistence and Consistency Workflow', () => {
    test('should maintain data consistency across operations', async () => {
      // Set initial configuration
      const initialConfig = {
        ragStrictness: 75,
        metadataWeights: {
          agency_match: 9,
          technology_match: 8,
          recency: 4,
          keyword_relevance: 7
        },
        documentTypesPriority: [
          'past-performance',
          'requirements',
          'solicitations',
          'references',
          'proposals',
          'compliance',
          'media'
        ]
      };

      await request(app)
        .put('/api/global-settings/config/context')
        .send(initialConfig)
        .expect(200);

      // Perform various operations that should maintain consistency
      const operations = [
        // Track some analytics data
        request(app)
          .post('/api/analytics/context-build')
          .send({
            projectName: 'ConsistencyTest',
            buildDuration: 2000,
            tokenCount: 7500,
            documentCount: 4,
            success: true
          }),

        // Check overflow for consistency test
        request(app)
          .post('/api/context/overflow/check')
          .send({
            projectName: 'ConsistencyTest',
            selectedDocuments: ['consistency-doc1', 'consistency-doc2'],
            requirements: 'Consistency test requirements'
          }),

        // Track citation access
        request(app)
          .post('/api/citations/track-access')
          .send({
            citationId: 'consistency-citation',
            documentId: 'consistency-doc1',
            userId: 'consistency-user',
            accessType: 'preview'
          })
      ];

      await Promise.all(operations);

      // Verify configuration remained consistent
      const finalConfigResponse = await request(app)
        .get('/api/global-settings/config/context')
        .expect(200);

      expect(finalConfigResponse.body.data.ragStrictness).toBe(75);

      // Verify analytics captured the operations
      const analyticsResponse = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data.systemOverview.totalContextBuilds).toBeGreaterThanOrEqual(1);

      // Verify overflow statistics are available
      const overflowStatsResponse = await request(app)
        .get('/api/context/overflow/stats/ConsistencyTest')
        .expect(200);

      expect(overflowStatsResponse.body.success).toBe(true);
    }, 20000);
  });
});

describe('E2E: Performance Under Real-World Conditions', () => {
  describe('Realistic Usage Patterns', () => {
    test('should handle typical daily usage pattern', async () => {
      const dailyOperations = [];

      // Simulate morning configuration check
      dailyOperations.push(
        request(app)
          .get('/api/global-settings/config/context')
          .expect(200)
      );

      // Simulate multiple context building sessions
      for (let session = 0; session < 10; session++) {
        dailyOperations.push(
          request(app)
            .post('/api/context/overflow/check')
            .send({
              projectName: `DailySession${session}`,
              selectedDocuments: [`session${session}-doc1`, `session${session}-doc2`],
              requirements: `Daily session ${session} requirements`
            })
            .expect(200)
        );
      }

      // Simulate analytics checks throughout the day
      for (let check = 0; check < 5; check++) {
        dailyOperations.push(
          request(app)
            .get('/api/analytics/dashboard')
            .expect(200)
        );
      }

      // Execute all daily operations
      const results = await Promise.all(dailyOperations);

      // All operations should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // System should remain performant
      const performanceCheck = await request(app)
        .get('/api/analytics/realtime')
        .expect(200);

      expect(performanceCheck.body.data.systemHealth).toBe('healthy');
    }, 45000);
  });
});