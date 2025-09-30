/**
 * API Configuration
 * Centralized API base URL configuration for the application
 *
 * Environment-based configuration strategy:
 * - Development: Uses proxy configuration (empty base URL, proxy to localhost:3001)
 * - Test: Uses REACT_APP_API_URL environment variable
 * - Production: Uses REACT_APP_API_URL environment variable or relative URLs
 */

/**
 * Get API base URL based on environment
 * @returns {string} API base URL
 */
const getApiBaseUrl = () => {
  // Check if we have an explicit API URL set (test/production environments)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Development mode: use proxy configuration (empty base URL)
  // The proxy in package.json redirects /api/* requests to the backend
  if (process.env.NODE_ENV === 'development') {
    return '';
  }

  // Production fallback: use relative URLs
  // This assumes frontend and backend are served from the same domain
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Environment information
 */
export const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  API_URL: process.env.REACT_APP_API_URL,
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test'
};

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH_ME: '/api/auth/me',
  AUTH_MOCK: '/api/auth/mock',
  AUTH_LOGOUT: '/api/auth/logout',

  // Projects
  PROJECTS: '/api/projects',
  PROJECTS_LIST: '/api/documents/projects',

  // Documents
  DOCUMENTS_UPLOAD: '/api/documents/upload',
  DOCUMENTS_LIST: '/api/documents/list',
  DOCUMENTS_CONTENT: '/api/documents/content',

  // AI Writing
  AI_WRITING_GENERATE: '/api/ai-writing/generate',
  AI_WRITING_MODELS: '/api/ai-writing/models',
  AI_WRITING_PERSONAS: '/api/ai-writing/personas',

  // Global Prompts
  GLOBAL_PROMPTS: '/api/global-prompts',
  GLOBAL_PROMPTS_ACTIVE: '/api/global-prompts/active',

  // Model Warmup
  MODEL_WARMUP: '/api/model-warmup',

  // Document Types
  DOCUMENT_TYPES: '/api/document-types',

  // Compliance
  COMPLIANCE: '/api/compliance',

  // Past Performance
  PAST_PERFORMANCE: '/api/past-performance',

  // Analytics
  ANALYTICS: '/api/analytics',

  // Health
  HEALTH: '/api/health'
};

/**
 * Build full API URL
 * @param {string} endpoint - Endpoint path (should start with /api/)
 * @returns {string} Full API URL
 */
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

/**
 * Build document content URL
 * @param {string} type - Document type
 * @param {string} project - Project name
 * @param {string} filename - File name
 * @returns {string} Document content URL
 */
export const buildDocumentUrl = (type, project, filename) => {
  return `${API_BASE_URL}/api/documents/content/${type}/${project}/${filename}`;
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  buildApiUrl,
  buildDocumentUrl
};