/**
 * Jest Test Setup Configuration
 * Global test configuration and setup for the Context Management System
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'govai_test';
process.env.DB_USER = 'govaiuser';
process.env.DB_PASSWORD = 'password';

// Mock external services
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

// Global test configuration
jest.setTimeout(30000);

// Suppress console.log during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  console.log = jest.fn();
  console.warn = jest.fn();
}

// Global test helpers
global.testHelpers = {
  // Create a delay for async testing
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate test IDs
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  // Create mock request data
  createMockRequest: (overrides = {}) => ({
    projectName: 'TestProject',
    requirements: 'Test requirements',
    selectedDocuments: ['doc1', 'doc2'],
    ...overrides
  }),

  // Validate response structure
  validateApiResponse: (response, expectedKeys = []) => {
    expect(response.body).toHaveProperty('success');
    expectedKeys.forEach(key => {
      expect(response.body).toHaveProperty(key);
    });
  },

  // Check response times
  expectFastResponse: (duration, maxMs = 1000) => {
    expect(duration).toBeLessThan(maxMs);
  }
};

// Setup and teardown hooks
beforeAll(async () => {
  // Global setup if needed
});

afterAll(async () => {
  // Global cleanup if needed
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test if needed
});