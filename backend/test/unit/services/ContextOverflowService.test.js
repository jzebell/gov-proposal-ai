/**
 * Unit Tests for ContextOverflowService
 * Tests context overflow detection and document prioritization
 */

const ContextOverflowService = require('../../../src/services/ContextOverflowService');

// Mock the database connection
jest.mock('../../../src/app', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('ContextOverflowService', () => {
  let service;

  beforeEach(() => {
    service = new ContextOverflowService();
    jest.clearAllMocks();
  });

  describe('Token Calculation', () => {
    test('should calculate tokens correctly', () => {
      const text = 'This is a test text with multiple words';
      const tokens = service.calculateTokens(text);

      // Roughly 4 characters per token
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });

    test('should handle empty text', () => {
      const tokens = service.calculateTokens('');
      expect(tokens).toBe(0);
    });

    test('should handle null or undefined text', () => {
      expect(service.calculateTokens(null)).toBe(0);
      expect(service.calculateTokens(undefined)).toBe(0);
    });
  });

  describe('Document Relevance Scoring', () => {
    test('should calculate relevance score based on multiple factors', () => {
      const document = {
        id: 'test-doc',
        type: 'solicitation',
        metadata: {
          agency: 'Test Agency',
          keywords: ['test', 'keyword'],
          date: '2025-01-01'
        },
        content: 'Test document content'
      };

      const requirements = 'Looking for test solicitation documents';

      const score = service.calculateRelevanceScore(document, requirements);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should prioritize solicitations over other document types', () => {
      const solicitation = {
        id: 'sol-1',
        type: 'solicitation',
        metadata: { keywords: ['test'] },
        content: 'Solicitation content'
      };

      const reference = {
        id: 'ref-1',
        type: 'references',
        metadata: { keywords: ['test'] },
        content: 'Reference content'
      };

      const solScore = service.calculateRelevanceScore(solicitation, 'test requirements');
      const refScore = service.calculateRelevanceScore(reference, 'test requirements');

      expect(solScore).toBeGreaterThan(refScore);
    });
  });

  describe('Overflow Detection', () => {
    test('should detect overflow when tokens exceed limit', async () => {
      const documents = [
        { id: 'doc1', content: 'A'.repeat(10000) }, // Large document
        { id: 'doc2', content: 'B'.repeat(10000) }
      ];

      const result = await service.checkOverflow({
        selectedDocuments: documents,
        maxTokens: 1000,
        requirements: 'Test requirements'
      });

      expect(result.wouldOverflow).toBe(true);
      expect(result.currentTokens).toBeGreaterThan(1000);
    });

    test('should not detect overflow when tokens are within limit', async () => {
      const documents = [
        { id: 'doc1', content: 'Small document' },
        { id: 'doc2', content: 'Another small document' }
      ];

      const result = await service.checkOverflow({
        selectedDocuments: documents,
        maxTokens: 10000,
        requirements: 'Test requirements'
      });

      expect(result.wouldOverflow).toBe(false);
      expect(result.currentTokens).toBeLessThan(10000);
    });
  });

  describe('Document Recommendations', () => {
    test('should provide recommendations when overflow occurs', async () => {
      const documents = [
        {
          id: 'doc1',
          type: 'solicitation',
          content: 'High priority document',
          metadata: { keywords: ['important'] }
        },
        {
          id: 'doc2',
          type: 'references',
          content: 'Lower priority document',
          metadata: { keywords: ['reference'] }
        },
        {
          id: 'doc3',
          content: 'A'.repeat(50000) // Very large document
        }
      ];

      const result = await service.getRecommendations({
        selectedDocuments: documents,
        maxTokens: 5000,
        requirements: 'important solicitation requirements'
      });

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Should prioritize higher relevance documents
      const firstRec = result.recommendations[0];
      expect(firstRec).toHaveProperty('relevanceScore');
      expect(firstRec.relevanceScore).toBeGreaterThan(0);
    });

    test('should limit recommendations to fit within token budget', async () => {
      const manyDocuments = Array.from({ length: 20 }, (_, i) => ({
        id: `doc${i}`,
        type: 'requirements',
        content: `Document ${i} content with reasonable length`,
        metadata: { keywords: [`keyword${i}`] }
      }));

      const result = await service.getRecommendations({
        selectedDocuments: manyDocuments,
        maxTokens: 2000,
        requirements: 'test requirements'
      });

      const totalTokens = result.recommendations.reduce(
        (sum, doc) => sum + service.calculateTokens(doc.content || ''),
        0
      );

      expect(totalTokens).toBeLessThanOrEqual(2000);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid document data gracefully', async () => {
      const invalidDocuments = [
        null,
        undefined,
        { id: 'valid-doc', content: 'Valid content' },
        { id: 'no-content' }, // Missing content
        { content: 'no-id' } // Missing id
      ];

      const result = await service.checkOverflow({
        selectedDocuments: invalidDocuments,
        maxTokens: 10000,
        requirements: 'Test requirements'
      });

      expect(result).toBeDefined();
      expect(result.wouldOverflow).toBeDefined();
      expect(result.currentTokens).toBeGreaterThanOrEqual(0);
    });

    test('should handle missing requirements', async () => {
      const documents = [
        { id: 'doc1', content: 'Test content' }
      ];

      const result = await service.checkOverflow({
        selectedDocuments: documents,
        maxTokens: 10000
        // requirements missing
      });

      expect(result).toBeDefined();
      expect(result.wouldOverflow).toBeDefined();
    });

    test('should handle zero or negative token limits', async () => {
      const documents = [
        { id: 'doc1', content: 'Test content' }
      ];

      const resultZero = await service.checkOverflow({
        selectedDocuments: documents,
        maxTokens: 0,
        requirements: 'Test'
      });

      const resultNegative = await service.checkOverflow({
        selectedDocuments: documents,
        maxTokens: -100,
        requirements: 'Test'
      });

      expect(resultZero.wouldOverflow).toBe(true);
      expect(resultNegative.wouldOverflow).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should process large document sets efficiently', async () => {
      const largeDocumentSet = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-doc-${i}`,
        type: 'requirements',
        content: `Performance test document ${i} with substantial content to test processing speed and efficiency`,
        metadata: {
          keywords: [`perf${i}`, 'performance', 'test'],
          priority: Math.floor(Math.random() * 10)
        }
      }));

      const startTime = Date.now();

      const result = await service.checkOverflow({
        selectedDocuments: largeDocumentSet,
        maxTokens: 5000,
        requirements: 'performance test requirements'
      });

      const processingTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    test('should handle concurrent overflow checks', async () => {
      const documents = [
        { id: 'concurrent1', content: 'Test content 1' },
        { id: 'concurrent2', content: 'Test content 2' }
      ];

      const concurrentChecks = Array.from({ length: 10 }, (_, i) =>
        service.checkOverflow({
          selectedDocuments: documents,
          maxTokens: 1000,
          requirements: `Concurrent test ${i}`
        })
      );

      const results = await Promise.all(concurrentChecks);

      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.wouldOverflow).toBeDefined();
        expect(result.currentTokens).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration with Analytics', () => {
    test('should prepare analytics data correctly', async () => {
      const documents = [
        {
          id: 'analytics-doc',
          type: 'solicitation',
          content: 'Document for analytics testing',
          metadata: { keywords: ['analytics'] }
        }
      ];

      const result = await service.checkOverflow({
        selectedDocuments: documents,
        maxTokens: 100, // Force overflow
        requirements: 'analytics test'
      });

      if (result.wouldOverflow) {
        expect(result.analyticsData).toBeDefined();
        expect(result.analyticsData).toHaveProperty('overflowAmount');
        expect(result.analyticsData).toHaveProperty('documentCount');
        expect(result.analyticsData).toHaveProperty('recommendations');
      }
    });
  });
});