# Frontend Configuration Guide

Quick reference for environment-based configuration.

## 🚀 Quick Start

### Development (Local)
```bash
npm start
# Uses .env.development
# API: localhost:3001 (via proxy)
# Access: http://localhost:3000
```

### Test (CI/CD)
```bash
REACT_APP_ENV=test npm run build
# Uses .env.test
# API: http://test-api.govproposalai.local:3001
```

### Production
```bash
npm run build
# Uses .env.production
# API: https://api.govproposalai.com or relative URLs
```

## 📁 Configuration Files

```
frontend/
├── .env.development      # Development environment
├── .env.test            # Test environment
├── .env.production      # Production environment
├── .env.local           # Local overrides (gitignored)
└── src/config/
    └── api.js          # Centralized API configuration
```

## 🔧 Environment Variables

### Core Variables
```bash
# Backend API URL (leave empty for proxy/relative URLs)
REACT_APP_API_URL=

# Node environment (auto-set by React Scripts)
NODE_ENV=development|test|production
```

### Feature Flags
```bash
# Enable/disable features
REACT_APP_ENABLE_DEBUG=true|false
REACT_APP_ENABLE_MOCK_DATA=true|false
REACT_APP_FEATURE_PAST_PERFORMANCE=true|false
REACT_APP_FEATURE_ANALYTICS=true|false
REACT_APP_FEATURE_COMPLIANCE=true|false
```

### Advanced Settings
```bash
# Logging level
REACT_APP_LOG_LEVEL=debug|info|warn|error

# API timeout (milliseconds)
REACT_APP_API_TIMEOUT=30000

# Security
REACT_APP_ENABLE_HTTPS_ONLY=true|false
REACT_APP_ENABLE_REDUX_DEVTOOLS=true|false
```

## 💻 Usage in Components

### Import API Configuration
```javascript
import { API_ENDPOINTS, buildDocumentUrl, ENV } from '../config/api';
```

### Use Endpoint Constants
```javascript
// Simple endpoint
fetch(API_ENDPOINTS.AUTH_ME, {
  method: 'GET',
  credentials: 'include'
});

// With parameters
fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}`, {
  method: 'GET'
});
```

### Build Dynamic URLs
```javascript
// Document content URL
const url = buildDocumentUrl('Solicitation', 'Project-123', 'file.pdf');
// Result: /api/documents/content/Solicitation/Project-123/file.pdf

// Any relative API endpoint
fetch('/api/documents/list', { method: 'GET' });
```

### Check Environment
```javascript
if (ENV.IS_DEVELOPMENT) {
  console.log('Debug info:', data);
}

if (ENV.IS_PRODUCTION) {
  // Production-only logic
}
```

## 🌍 Deployment Scenarios

### Scenario 1: Same-Domain Deployment
**Use Case**: Frontend and backend on same domain (nginx/Apache reverse proxy)

**Configuration**:
```bash
# .env.production
REACT_APP_API_URL=
```

**Nginx**:
```nginx
location / {
  root /var/www/frontend/build;
  try_files $uri /index.html;
}

location /api/ {
  proxy_pass http://localhost:3001;
}
```

### Scenario 2: Different-Domain Deployment
**Use Case**: Frontend on CDN, backend on separate server

**Configuration**:
```bash
# .env.production
REACT_APP_API_URL=https://api.govproposalai.com
```

**Backend CORS**:
```javascript
app.use(cors({
  origin: 'https://govproposalai.com',
  credentials: true
}));
```

### Scenario 3: Docker Container
**Use Case**: Containerized deployment with environment variables

**Build**:
```bash
docker build -t gov-proposal-ai-frontend .
```

**Run**:
```bash
docker run -p 3000:3000 \
  -e REACT_APP_API_URL=http://api-server:3001 \
  -e REACT_APP_ENABLE_DEBUG=false \
  gov-proposal-ai-frontend
```

## 🔒 Security Best Practices

### ✅ DO
- Use `.env.*.local` files for local secrets (gitignored)
- Inject secrets via CI/CD pipelines
- Use HTTPS in production (`REACT_APP_ENABLE_HTTPS_ONLY=true`)
- Set `REACT_APP_ENABLE_DEBUG=false` in production
- Validate environment variables on app startup

### ❌ DON'T
- Commit `.env.local`, `.env.*.local` files
- Store API keys or secrets in `.env` files committed to git
- Use development URLs in production builds
- Enable debug logging in production
- Hardcode URLs in components

## 🛠️ Troubleshooting

### Problem: API calls return 404
**Solution**: Check proxy configuration in `package.json`:
```json
{
  "proxy": "http://localhost:3001"
}
```

### Problem: CORS errors in production
**Solution**: Configure backend CORS or use same-domain deployment

### Problem: Environment variables not updating
**Solution**:
1. Restart dev server: `npm start`
2. Clear cache: `rm -rf node_modules/.cache`
3. Rebuild: `npm run build`

### Problem: Wrong environment loaded
**Solution**:
```bash
# Check which file is being used
echo $NODE_ENV

# Force specific environment
NODE_ENV=production npm run build
```

## 📚 Available API Endpoints

```javascript
API_ENDPOINTS = {
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
}
```

## 🔄 Migration from Hardcoded URLs

**Old Pattern** (❌ Don't use):
```javascript
const apiUrl = 'http://localhost:3001';
fetch(`${apiUrl}/api/auth/me`);
```

**New Pattern** (✅ Use this):
```javascript
import { API_ENDPOINTS } from '../config/api';
fetch(API_ENDPOINTS.AUTH_ME);
```

## 📖 Additional Resources

- [Full Documentation](../docs/design/2025-09-30-environment-configuration-strategy.md)
- [Create React App Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Docker Environment Variables](https://docs.docker.com/compose/environment-variables/)

---

**Questions?** See full documentation in `/docs/design/2025-09-30-environment-configuration-strategy.md`