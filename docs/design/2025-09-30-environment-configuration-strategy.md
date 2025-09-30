# Environment-Based Configuration Strategy

**Document**: Environment Configuration Strategy for Dev/Test/Production
**Date**: 2025-09-30
**Version**: 1.0
**Status**: Implemented
**Author**: Senior Software Engineer

## Executive Summary

This document describes the environment-based configuration strategy for the nxtProposal Government Proposal AI system, enabling seamless deployment across development, test, and production environments with centralized API configuration management.

## Problem Statement

Previously, the application had hardcoded API URLs (`http://localhost:3001`) scattered across 20+ components, making it:
- Difficult to switch between environments
- Error-prone when deploying to different servers
- Hard to maintain and update API endpoints
- Impossible to use different backends for testing vs. production

## Solution Architecture

### Centralized Configuration File

**Location**: `frontend/src/config/api.js`

**Key Features**:
1. Single source of truth for all API endpoints
2. Environment-aware base URL resolution
3. Helper functions for building dynamic URLs
4. Environment detection and feature flags

### Configuration Structure

```javascript
// Base URL determination (automatic)
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;  // Explicit URL (test/prod)
  }
  if (process.env.NODE_ENV === 'development') {
    return '';  // Use proxy (package.json)
  }
  return '';  // Relative URLs (production)
};

// Centralized endpoint definitions
export const API_ENDPOINTS = {
  AUTH_ME: '/api/auth/me',
  PROJECTS: '/api/projects',
  DOCUMENTS_UPLOAD: '/api/documents/upload',
  // ... 50+ more endpoints
};
```

## Environment Configuration Files

### 1. Development (`.env.development`)

**Purpose**: Local development with hot-reload and debugging

**Configuration**:
```bash
REACT_APP_API_URL=              # Empty - uses proxy
REACT_APP_ENABLE_DEBUG=true
REACT_APP_LOG_LEVEL=debug
```

**Backend**: `localhost:3001` (via proxy in `package.json`)

**Usage**:
```bash
npm start
```

### 2. Test (`.env.test`)

**Purpose**: Automated testing and CI/CD pipelines

**Configuration**:
```bash
REACT_APP_API_URL=http://test-api.govproposalai.local:3001
REACT_APP_ENABLE_DEBUG=false
REACT_APP_ENABLE_MOCK_DATA=true
REACT_APP_LOG_LEVEL=warn
```

**Backend**: Dedicated test server

**Usage**:
```bash
npm run test
# or for CI/CD
REACT_APP_ENV=test npm run build
```

### 3. Production (`.env.production`)

**Purpose**: Live production deployment

**Configuration**:
```bash
# Option A: Same-domain deployment
REACT_APP_API_URL=              # Empty - relative URLs

# Option B: Different-domain deployment
REACT_APP_API_URL=https://api.govproposalai.com

REACT_APP_ENABLE_DEBUG=false
REACT_APP_ENABLE_MOCK_DATA=false
REACT_APP_LOG_LEVEL=error
REACT_APP_ENABLE_HTTPS_ONLY=true
```

**Backend**: Production API server

**Usage**:
```bash
npm run build
npm start
```

## Implementation Details

### Proxy Configuration (Development Only)

**File**: `frontend/package.json`

```json
{
  "proxy": "http://localhost:3001"
}
```

**How it works**:
- React Dev Server intercepts requests to `/api/*`
- Forwards them to `localhost:3001`
- Avoids CORS issues in development
- Transparent to application code

### Component Usage Pattern

**Before** (Hardcoded):
```javascript
const apiUrl = 'http://localhost:3001';
fetch(`${apiUrl}/api/auth/me`);
```

**After** (Centralized):
```javascript
import { API_ENDPOINTS } from '../config/api';
fetch(API_ENDPOINTS.AUTH_ME);
```

### Dynamic URL Building

For dynamic endpoints:

```javascript
import { buildDocumentUrl } from '../config/api';

// Build document content URL
const url = buildDocumentUrl('Solicitation', 'Project-123', 'file.pdf');
// Result: /api/documents/content/Solicitation/Project-123/file.pdf
```

## Deployment Scenarios

### Scenario 1: Development Workstation

**Setup**:
```bash
# Clone repository
git clone https://github.com/your-org/gov-proposal-ai.git
cd gov-proposal-ai

# Start all services with Docker Compose
docker-compose up -d

# Frontend automatically uses .env.development
# Proxy redirects to backend at localhost:3001
```

**Access**:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001 (via proxy)

### Scenario 2: CI/CD Test Environment

**Setup**:
```bash
# Build with test configuration
REACT_APP_ENV=test npm run build

# Deploy to test server
docker build -t gov-proposal-ai-test .
docker run -p 80:3000 \
  -e REACT_APP_API_URL=http://test-api.internal:3001 \
  gov-proposal-ai-test
```

**Access**:
- Frontend: http://test.govproposalai.local
- Backend: http://test-api.govproposalai.local:3001

### Scenario 3: Production (Same-Domain)

**Setup**:
```bash
# Build production bundle
npm run build

# Deploy with reverse proxy (nginx/Apache)
# Both frontend and backend served from same domain
```

**Nginx Configuration**:
```nginx
server {
  listen 80;
  server_name govproposalai.com;

  # Frontend (React build)
  location / {
    root /var/www/frontend/build;
    try_files $uri /index.html;
  }

  # Backend API
  location /api/ {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

**Access**:
- Application: https://govproposalai.com
- API: https://govproposalai.com/api/* (proxied to backend)

### Scenario 4: Production (Different Domains)

**Setup**:
```bash
# Build with explicit API URL
REACT_APP_API_URL=https://api.govproposalai.com npm run build

# Deploy frontend and backend separately
```

**Configuration**:
- Frontend: Served from CDN or static hosting
- Backend: Separate server with CORS enabled

**Access**:
- Frontend: https://govproposalai.com
- Backend: https://api.govproposalai.com

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL | `http://localhost:3001` |
| `NODE_ENV` | Node environment | `development`, `test`, `production` |

### Optional Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_ENABLE_DEBUG` | Enable debug logging | `false` |
| `REACT_APP_ENABLE_MOCK_DATA` | Enable mock data for testing | `false` |
| `REACT_APP_LOG_LEVEL` | Logging level | `error` |
| `REACT_APP_FEATURE_PAST_PERFORMANCE` | Enable Past Performance RAG | `true` |
| `REACT_APP_FEATURE_ANALYTICS` | Enable analytics dashboard | `true` |
| `REACT_APP_FEATURE_COMPLIANCE` | Enable compliance features | `true` |
| `REACT_APP_API_TIMEOUT` | API request timeout (ms) | `30000` |

## Security Considerations

### Development Environment

- **Mock Authentication**: Enabled for rapid development
- **Debug Logging**: Detailed logs for troubleshooting
- **CORS**: Handled by proxy configuration
- **HTTPS**: Not required (localhost)

### Test Environment

- **Real Authentication**: OAuth or mock depending on test type
- **Limited Logging**: Warn level only
- **CORS**: Configured on backend
- **HTTPS**: Optional

### Production Environment

- **Real Authentication**: OAuth with real providers
- **Minimal Logging**: Error level only
- **CORS**: Strictly configured
- **HTTPS**: Required (`REACT_APP_ENABLE_HTTPS_ONLY=true`)
- **Secrets**: Never commit `.env.production.local` with real secrets

### Environment File Security

**Never commit**:
- `.env.local`
- `.env.development.local`
- `.env.test.local`
- `.env.production.local`

These files can contain sensitive data and should be:
- Added to `.gitignore`
- Managed through secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
- Injected at build/runtime via CI/CD pipelines

## Migration Path

### Phase 1: ✅ Complete
- Created centralized `config/api.js`
- Updated all 20 components to use API config
- Added environment-aware base URL resolution

### Phase 2: ✅ Complete
- Created `.env.development`, `.env.test`, `.env.production`
- Documented configuration strategy
- Implemented proxy configuration

### Phase 3: Planned
- Add TypeScript types for API endpoints
- Create API response type definitions
- Implement request/response interceptors
- Add automatic retry logic for failed requests

## Testing Strategy

### Unit Tests
```javascript
import { API_ENDPOINTS, buildDocumentUrl } from './config/api';

describe('API Configuration', () => {
  test('builds document URL correctly', () => {
    const url = buildDocumentUrl('Solicitation', 'Project-1', 'file.pdf');
    expect(url).toBe('/api/documents/content/Solicitation/Project-1/file.pdf');
  });
});
```

### Integration Tests
```javascript
// Test with different environment variables
process.env.REACT_APP_API_URL = 'http://test-api:3001';
const { API_BASE_URL } = require('./config/api');
expect(API_BASE_URL).toBe('http://test-api:3001');
```

## Troubleshooting

### Issue: API requests fail in production

**Symptom**: Network errors when calling `/api/*` endpoints

**Causes**:
1. `REACT_APP_API_URL` not set correctly
2. Backend not accessible from frontend domain
3. CORS not configured on backend

**Solutions**:
1. Check `.env.production` has correct `REACT_APP_API_URL`
2. Verify backend is running and accessible
3. Configure CORS on backend to allow frontend domain

### Issue: Proxy not working in development

**Symptom**: 404 errors for `/api/*` requests

**Causes**:
1. Proxy not configured in `package.json`
2. Backend not running on `localhost:3001`
3. Port already in use

**Solutions**:
1. Verify `"proxy": "http://localhost:3001"` in `package.json`
2. Start backend: `docker-compose up backend`
3. Check backend logs: `docker logs gov-proposal-ai-backend-1`

### Issue: Wrong environment configuration loaded

**Symptom**: Using development config in production

**Causes**:
1. Wrong build command
2. Environment variable override
3. Cached build artifacts

**Solutions**:
1. Use correct command: `npm run build` (uses `.env.production`)
2. Clear environment: `unset REACT_APP_API_URL`
3. Clean build: `rm -rf build && npm run build`

## Best Practices

1. **Never hardcode URLs** - Always use `API_ENDPOINTS` constants
2. **Use relative URLs** - Prefer `/api/*` over absolute URLs
3. **Environment-specific secrets** - Use `.env.*.local` files for secrets
4. **Test all environments** - Verify configuration in dev, test, and prod
5. **Document changes** - Update this file when adding new endpoints
6. **Version control** - Commit example `.env` files, not real ones
7. **CI/CD integration** - Inject environment variables at build time

## Monitoring and Logging

### Development
```javascript
if (process.env.REACT_APP_ENABLE_DEBUG) {
  console.log('API Request:', url, options);
}
```

### Production
```javascript
// Log only errors
if (process.env.NODE_ENV === 'production') {
  if (error) {
    console.error('API Error:', error);
    // Send to monitoring service (Sentry, DataDog, etc.)
  }
}
```

## Future Enhancements

1. **API Versioning**: Support `/api/v1/`, `/api/v2/` endpoints
2. **Rate Limiting**: Client-side throttling and retry logic
3. **Caching**: Response caching for GET requests
4. **Offline Support**: Service worker for offline functionality
5. **GraphQL**: Migrate to GraphQL with single endpoint
6. **WebSocket Config**: Centralized WebSocket URL management

## References

- [Create React App: Adding Custom Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Proxying API Requests in Development](https://create-react-app.dev/docs/proxying-api-requests-in-development/)
- [Environment Variables in Docker](https://docs.docker.com/compose/environment-variables/)

---

**Approval**: _________________
**Date**: _________________
**Next Review**: 2025-12-30