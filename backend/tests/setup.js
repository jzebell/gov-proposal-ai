/**
 * Test Setup Configuration
 * Global test setup and teardown for comprehensive testing
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;

// Test environment configuration
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Database configuration for tests
const testDbConfig = {
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5432/govpropai_test'
};

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce test output noise
const originalConsole = { ...console };

beforeAll(() => {
  // Reduce console noise during tests
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Mock external services for unit tests
jest.mock('../src/services/EmbeddingService', () => {
  return class MockEmbeddingService {
    async generateEmbedding(text) {
      // Return deterministic mock embedding
      return new Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1));
    }

    async generateBatchEmbeddings(texts) {
      return texts.map(() => this.generateEmbedding(''));
    }

    calculateCosineSimilarity(emb1, emb2) {
      return 0.8; // Mock similarity
    }

    async isServiceAvailable() {
      return true;
    }

    async getHealthStatus() {
      return {
        available: true,
        status: 'healthy',
        responseTime: 100,
        timestamp: new Date().toISOString()
      };
    }
  };
});

// Global test utilities
global.testUtils = {
  /**
   * Create test database connection
   */
  async createTestDb() {
    const pool = new Pool(testDbConfig);

    try {
      // Test connection
      await pool.query('SELECT NOW()');
      return pool;
    } catch (error) {
      console.error('Failed to connect to test database:', error.message);
      throw error;
    }
  },

  /**
   * Setup test database schema
   */
  async setupTestSchema(pool) {
    try {
      // Drop existing schema
      await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
      await pool.query('CREATE SCHEMA public');

      // Run migrations
      const migrationPath = path.join(__dirname, '../../database/migrations/002_epic2_schema.sql');
      const migrationSql = await fs.readFile(migrationPath, 'utf8');
      await pool.query(migrationSql);

      console.log('Test schema setup completed');
    } catch (error) {
      console.error('Failed to setup test schema:', error.message);
      throw error;
    }
  },

  /**
   * Load test data
   */
  async loadTestData(pool) {
    try {
      const seedPath = path.join(__dirname, '../../database/seeds/epic2_mock_data.sql');
      const seedSql = await fs.readFile(seedPath, 'utf8');
      await pool.query(seedSql);

      console.log('Test data loaded successfully');
    } catch (error) {
      console.error('Failed to load test data:', error.message);
      throw error;
    }
  },

  /**
   * Clean test database
   */
  async cleanTestDb(pool) {
    try {
      // Clean all data but keep schema
      const tables = [
        'search_feedback',
        'query_responses',
        'document_technologies',
        'document_chunks',
        'documents',
        'past_performance',
        'solicitation_projects',
        'technologies',
        'technology_categories'
      ];

      for (const table of tables) {
        await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      }

      console.log('Test database cleaned');
    } catch (error) {
      console.error('Failed to clean test database:', error.message);
      throw error;
    }
  },

  /**
   * Generate test past performance data
   */
  generateTestPPData(overrides = {}) {
    return {
      projectName: 'Test Project ' + Date.now(),
      customer: 'Test Customer Agency',
      customerType: 'Federal',
      contractNumber: 'TEST-' + Date.now(),
      contractValue: 1000000 + Math.floor(Math.random() * 9000000),
      contractType: 'Prime',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      workType: 'DME',
      dmePercentage: 80,
      omPercentage: 20,
      summary: 'This is a test project summary with detailed information about the work performed.',
      technicalApproach: 'Used modern technologies and agile methodologies to deliver high-quality solutions.',
      technologiesUsed: ['Java', 'React', 'PostgreSQL', 'AWS'],
      domainAreas: ['Software Development', 'Cloud Computing'],
      keyPersonnel: [
        { name: 'John Doe', role: 'Technical Lead' },
        { name: 'Jane Smith', role: 'Project Manager' }
      ],
      performanceMetrics: {
        onTime: true,
        onBudget: true,
        customerSatisfaction: 4.5,
        qualityScore: 95
      },
      lessonsLearned: 'Early stakeholder engagement and frequent communication were key to success.',
      challengesOvercome: 'Resolved integration challenges through careful API design and testing.',
      relevanceTags: ['modernization', 'agile', 'cloud'],
      confidenceScore: 0.95,
      ...overrides
    };
  },

  /**
   * Generate test solicitation project data
   */
  generateTestProjectData(overrides = {}) {
    return {
      name: 'Test Solicitation Project ' + Date.now(),
      agency: 'Test Agency',
      solicitationNumber: 'TEST-SOL-' + Date.now(),
      projectType: 'Federal',
      status: 'Active',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      estimatedValue: 5000000,
      pursuitDecision: 'Pursuing',
      description: 'Test solicitation project for automated testing purposes.',
      ...overrides
    };
  },

  /**
   * Wait for async operations
   */
  async wait(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Assert array equality (order-independent)
   */
  expectArraysEqual(actual, expected) {
    expect(actual.length).toBe(expected.length);
    expected.forEach(item => {
      expect(actual).toContain(item);
    });
  },

  /**
   * Assert object contains expected properties
   */
  expectObjectContains(actual, expected) {
    Object.keys(expected).forEach(key => {
      expect(actual).toHaveProperty(key, expected[key]);
    });
  },

  /**
   * Generate mock embedding vector
   */
  generateMockEmbedding(dimension = 1536) {
    return new Array(dimension).fill(0).map(() => Math.random() - 0.5);
  },

  /**
   * Mock HTTP request/response objects
   */
  createMockReq(overrides = {}) {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: { id: 'test-user' },
      ...overrides
    };
  },

  createMockRes() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      headers: {}
    };
    return res;
  },

  /**
   * Create mock Express app for testing
   */
  createMockApp() {
    const express = require('express');
    const app = express();

    app.use(express.json());

    // Error handling middleware
    app.use((error, req, res, next) => {
      res.status(500).json({
        success: false,
        message: error.message
      });
    });

    return app;
  }
};

// Export test configuration
module.exports = {
  testDbConfig,
  setupTimeout: 30000,
  teardownTimeout: 10000
};

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process during tests
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit process during tests
});

// Clean up resources on process exit
process.on('exit', () => {
  console.log('Test process exiting...');
});

// Additional Jest configuration
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeRecentTimestamp(received, maxAgeMs = 5000) {
    const receivedTime = new Date(received).getTime();
    const currentTime = Date.now();
    const age = currentTime - receivedTime;
    const pass = age >= 0 && age <= maxAgeMs;

    if (pass) {
      return {
        message: () => `expected ${received} not to be a recent timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a recent timestamp (within ${maxAgeMs}ms)`,
        pass: false,
      };
    }
  }
});