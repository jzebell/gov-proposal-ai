# Docker Proxy Configuration Fix

**Date:** 2025-09-30
**Issue:** Frontend unable to communicate with backend in Docker environment
**Status:** ✅ Resolved

## Problem

Frontend was getting 500/504 errors when trying to reach backend API endpoints. The root cause was improper proxy configuration for Docker networking.

## Root Causes Identified

1. **Database Connection**: `DocumentType.js` using hardcoded IP instead of environment variables
2. **Proxy Configuration**: Missing `setupProxy.js` for Docker container networking
3. **Hardcoded URLs**: Multiple components using `http://localhost:3001` instead of centralized config
4. **Environment Variables**: `.env` file had localhost instead of Docker service name
5. **Docker Compose Override**: `docker-compose.yml` hardcoding `REACT_APP_API_URL` and overriding `.env` file

## Solutions Implemented

### 1. Fixed Database Connection (backend/src/models/DocumentType.js)

**Changed from:**
```javascript
this.pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://...@localhost:5432/...`
});
```

**Changed to:**
```javascript
this.pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'govai',
  user: process.env.DB_USER || 'govaiuser',
  password: process.env.DB_PASSWORD
});
```

### 2. Created Proxy Configuration (frontend/src/setupProxy.js)

```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Use backend service name in Docker, localhost for local development
  const target = process.env.REACT_APP_API_URL || 'http://backend:3001';

  app.use(
    '/api',
    createProxyMiddleware({
      target: target,
      changeOrigin: true,
      logLevel: 'debug'
    })
  );
};
```

### 3. Centralized API Configuration

Updated 5 component files to use centralized `API_BASE_URL`:
- `InteractiveCitation.js`
- `DocumentTypeManagement.js`
- `AdminSettings.js`
- `DocumentPreviewPane.js`
- `AnalyticsDashboard.js`

**Changed from:**
```javascript
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
```

**Changed to:**
```javascript
import { API_BASE_URL } from '../config/api';
const apiUrl = API_BASE_URL;
```

### 4. Updated Environment Files

**frontend/.env:**
```bash
PORT=3000
REACT_APP_API_URL=http://backend:3001  # Changed from localhost:3001
DISABLE_ESLINT_PLUGIN=true
GENERATE_SOURCEMAP=false
```

**frontend/package.json:**
- Removed `"proxy": "http://localhost:3001"` (conflicted with setupProxy.js)
- Added `"http-proxy-middleware": "^2.0.6"` dependency

### 5. Fixed Docker Compose Configuration

**docker-compose.yml - frontend service:**
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  environment:
    NODE_ENV: development
    # Removed: REACT_APP_API_URL hardcoding - now uses .env file
  ports:
    - "3000:3000"
```

## Verification Steps

1. All containers running: `docker-compose ps`
2. Backend listening on correct port: `docker-compose logs backend | grep "listening"`
3. Database accepting connections: `docker-compose exec database pg_isready`
4. Frontend proxy configured correctly: `docker-compose logs frontend | grep "HPM"`
5. Authentication working: Login page loads and mock auth succeeds

## Key Learnings

1. **Docker Networking**: Use Docker service names (e.g., `backend`) not `localhost` for inter-container communication
2. **Environment Variable Precedence**: Docker Compose environment variables override `.env` files
3. **Proxy Configuration**: `setupProxy.js` is the proper way to configure proxies in Create React App for Docker
4. **Centralized Config**: All API URLs should use a single configuration source (`config/api.js`)

## Network Architecture

```
Browser (localhost:3000)
  ↓
Frontend Container (172.18.0.5:3000)
  ↓ [proxy: /api/* → http://backend:3001]
Backend Container (172.18.0.3:3001)
  ↓ [DB_HOST=database]
Database Container (172.18.0.2:5432)
```

## Related Files

- `backend/src/models/DocumentType.js`
- `frontend/src/setupProxy.js`
- `frontend/.env`
- `frontend/package.json`
- `frontend/src/config/api.js`
- `docker-compose.yml`
- `frontend/src/components/InteractiveCitation.js`
- `frontend/src/components/DocumentTypeManagement.js`
- `frontend/src/components/AdminSettings.js`
- `frontend/src/components/DocumentPreviewPane.js`
- `frontend/src/components/AnalyticsDashboard.js`

## Testing

After changes:
- Frontend loads successfully at http://localhost:3000
- Login page displays correctly
- Mock authentication works
- API calls return 401 (expected) or proper responses
- No 500/504 errors
- Console shows only expected 401s (browser network tab only, not JS errors)