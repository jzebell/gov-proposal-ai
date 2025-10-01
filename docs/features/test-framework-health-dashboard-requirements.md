# Test Framework & Health Dashboard - Requirements

**Status:** 📋 Ready for Implementation (AQAD - Awaiting Go-Ahead)
**Priority:** #1 - Highest Priority
**Goal:** 90% test coverage with auto-generated health dashboard
**Added:** 2025-09-30

## Overview

Build a comprehensive testing framework for both backend and frontend with automated coverage reporting displayed in an admin-only Health Dashboard.

## Testing Framework Requirements

### Testing Tools & Frameworks

**Backend:**
- **Framework:** Jest (already installed)
- **Coverage:** Istanbul/NYC (built into Jest)
- **API Testing:** Supertest (for HTTP assertions)
- **Database:** In-memory SQLite or test database
- **Mocking:** Jest mocks for external services

**Frontend:**
- **Framework:** Jest
- **Component Testing:** React Testing Library
- **Coverage:** Istanbul (built into Jest)
- **Mocking:** Mock Service Worker (MSW) for API mocking
- **DOM:** jsdom (built into Jest)

**E2E Testing:**
- **Recommendation:** Playwright
  - **Why:** Modern, fast, supports multiple browsers, great debugging
  - **Alternatives considered:** Cypress (heavier), Puppeteer (Chrome-only)
  - **Installation:** `npm install -D @playwright/test`

### Coverage Goals & Thresholds

**Target Coverage:** 90% overall

**Minimum Thresholds (Enforced):**
- **Global Minimum:** 80% (builds fail if below this)
- **Some areas can be lower:** Config files, constants, type definitions

**Coverage Metrics:**
- Statements: 90% target, 80% minimum
- Branches: 90% target, 80% minimum
- Functions: 90% target, 80% minimum
- Lines: 90% target, 80% minimum

**Enforcement:**
- Tests run on every build
- Build **blocks** if coverage drops below 80%
- CI/CD pipeline fails on coverage drop
- Dashboard shows red indicator when below threshold

### Test Organization

**Backend Structure (Consolidate):**
```
backend/
├── src/
│   ├── models/
│   │   ├── User.js
│   │   └── User.test.js          # Co-located
│   ├── routes/
│   │   ├── projects.js
│   │   └── projects.test.js      # Co-located
│   ├── services/
│   │   ├── ProjectService.js
│   │   └── ProjectService.test.js # Co-located
│   └── utils/
│       ├── helpers.js
│       └── helpers.test.js       # Co-located
├── tests/
│   ├── integration/              # Cross-module integration tests
│   │   └── project-workflow.test.js
│   └── e2e/                      # End-to-end tests
│       └── user-journey.test.js
└── jest.config.js
```

**Frontend Structure (Co-located):**
```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout.js
│   │   ├── Layout.test.js        # Co-located
│   │   ├── ProjectCard.js
│   │   └── ProjectCard.test.js   # Co-located
│   ├── hooks/
│   │   ├── useModelWarmup.js
│   │   └── useModelWarmup.test.js # Co-located
│   └── utils/
│       ├── helpers.js
│       └── helpers.test.js       # Co-located
├── tests/
│   ├── integration/              # Component integration tests
│   └── e2e/                      # Playwright E2E tests
│       └── proposal-creation.spec.js
└── jest.config.js
```

**Migration Plan:**
1. Move existing tests from `backend/test/` and `backend/tests/` to co-located structure
2. Keep integration and e2e tests in dedicated folders
3. Update import paths

### Testing Priority Areas

**Must Test (High Priority):**
1. ✅ **API Routes** - All endpoints in `backend/src/routes/`
2. ✅ **Services** - Business logic in `backend/src/services/`
3. ✅ **Models** - Database models (already ~90% covered)
4. ✅ **React Components** - Main UI components (Layout, ProjectCard, AdminSettings, etc.)
5. ✅ **Custom Hooks** - useModelWarmup, etc.
6. ✅ **Forms** - Document upload, project creation, user management

**Can Skip (Low Priority):**
- ❌ Config files (`config/api.js`, `config/uploadDefaults.js`)
- ❌ Constants files
- ❌ Type definitions (if any)
- ❌ Auto-generated files

## Health Dashboard Requirements

### Dashboard Location & Access

**Menu Structure:**
```
Left Sidebar (Admin Only):
├── 📊 Dashboard
├── 📁 Projects
├── 🤖 AI Writing
├── ⚙️ Admin Settings
└── ❌ Health          # NEW - Red cross icon, admin-only
    ├── Overview
    ├── Test Coverage
    ├── Build Status
    └── Dev Tools      # Future: Move existing dev tools here
```

**Access Control:**
- **Admin-only access** (check `isAdmin()` permission)
- Regular users: Menu item not visible
- Direct URL access: Redirect to 403 or dashboard
- **Future:** Different admin roles may see different metrics (not yet)

### Dashboard Content

**Main Sections:**

**1. Overview Section:**
- System health status (🟢 Healthy / 🟡 Warning / 🔴 Critical)
- Last build timestamp
- Last test run timestamp
- Quick metrics summary

**2. Test Coverage Section:**
```
Backend Coverage:
├── Overall: 87.5% 🟡 (Target: 90%, Minimum: 80%)
├── Statements: 85% / 90%
├── Branches: 88% / 90%
├── Functions: 89% / 90%
└── Lines: 87% / 90%

Frontend Coverage:
├── Overall: 92.3% 🟢 (Target: 90%, Minimum: 80%)
├── Statements: 91% / 90%
├── Branches: 93% / 90%
├── Functions: 94% / 90%
└── Lines: 91% / 90%

Coverage Trend (Last 7 builds):
[Chart showing coverage % over time]
```

**3. Test Results Section:**
```
Backend Tests:
├── ✅ Passed: 342 tests
├── ❌ Failed: 2 tests
├── ⏭️ Skipped: 5 tests
├── Duration: 45.3s
└── Last Run: 2025-09-30 10:23:45 PM

Frontend Tests:
├── ✅ Passed: 156 tests
├── ❌ Failed: 0 tests
├── ⏭️ Skipped: 3 tests
├── Duration: 22.1s
└── Last Run: 2025-09-30 10:24:12 PM

E2E Tests:
├── ✅ Passed: 18 scenarios
├── ❌ Failed: 1 scenario
├── Duration: 3m 12s
└── Last Run: 2025-09-30 10:27:34 PM
```

**4. Build Status Section:**
```
Backend Build:
├── Status: ✅ Success
├── Version: 2.1.6
├── Commit: 435346f
├── Duration: 2m 34s
└── Timestamp: 2025-09-30 10:20:15 PM

Frontend Build:
├── Status: ✅ Success
├── Version: 2.1.6
├── Commit: 435346f
├── Duration: 1m 48s
└── Timestamp: 2025-09-30 10:21:53 PM
```

**5. Uncovered Files Section:**
```
Files Below 80% Coverage:
├── backend/src/services/EmailService.js - 45% ❌
├── backend/src/routes/notifications.js - 72% 🟡
├── frontend/src/components/ChatPanel.js - 68% 🟡
└── [Show All] (if > 5 files)
```

**6. Dev Tools Section (Future):**
- Move existing Dev Tools functionality here
- Feature flags management
- Performance monitoring
- Error logs viewer

### Visual Design

**Style Requirements:**
- **Visually appealing** but functional
- **Clear separation** between metric areas (cards/panels)
- **Color coding:**
  - 🟢 Green: >= 90% (excellent)
  - 🟡 Yellow: 80-89% (warning)
  - 🔴 Red: < 80% (critical/failing)
- **Consistent theme:** Match existing admin panel styling
- **Responsive:** Works on desktop (primary use case)

**Layout Example:**
```
┌─────────────────────────────────────────────────────────┐
│  Health Dashboard                    🔄 Refresh          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ System Status│  │ Last Build   │  │ Test Results │ │
│  │  🟢 Healthy  │  │  ✅ Success  │  │ ✅ 516 Pass  │ │
│  │              │  │  2m ago      │  │ ❌ 3 Fail    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Backend Coverage              87.5% 🟡            │ │
│  │ ████████████████░░░░ 90%                          │ │
│  │ Statements: 85% | Branches: 88% | Functions: 89% │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Frontend Coverage             92.3% 🟢            │ │
│  │ █████████████████████ 90%                         │ │
│  │ Statements: 91% | Branches: 93% | Functions: 94% │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Coverage Trend (Last 7 Builds)                    │ │
│  │ [Line chart showing coverage over time]           │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Files Below Threshold                             │ │
│  │ ❌ EmailService.js - 45%                          │ │
│  │ 🟡 notifications.js - 72%                         │ │
│  │ [Show All (23 files)]                             │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Coverage Reporting

**Auto-Generation:**
- **Trigger:** After every successful build (backend and frontend)
- **Process:**
  1. Run tests with coverage during build
  2. Generate coverage JSON reports
  3. Parse reports and save to database
  4. Update dashboard data

**On-Demand Generation:**
- **Refresh Button** in dashboard header
- Triggers: Re-run tests, regenerate coverage, update display
- Loading indicator while running
- Timestamp of last refresh displayed

**Historical Tracking:**
- Store coverage data in database after each build
- Track over time (minimum 30 days, ideally 90 days)
- Display trend chart (last 7 builds on dashboard)
- Full history view available (separate page or expandable section)

**Data Storage:**
```sql
CREATE TABLE test_coverage_history (
  id SERIAL PRIMARY KEY,
  build_type VARCHAR(20), -- 'backend' or 'frontend'
  build_version VARCHAR(50),
  git_commit VARCHAR(40),
  overall_coverage NUMERIC(5,2),
  statements_coverage NUMERIC(5,2),
  branches_coverage NUMERIC(5,2),
  functions_coverage NUMERIC(5,2),
  lines_coverage NUMERIC(5,2),
  tests_passed INTEGER,
  tests_failed INTEGER,
  tests_skipped INTEGER,
  test_duration_ms INTEGER,
  coverage_json JSONB, -- Full coverage details
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coverage_created_at ON test_coverage_history(created_at DESC);
CREATE INDEX idx_coverage_type ON test_coverage_history(build_type);
```

### Update Frequency

**Refresh Triggers:**
- ✅ **Automatic:** After every build (backend/frontend rebuild)
- ✅ **Manual:** "🔄 Refresh" button in dashboard
- ❌ **NOT Real-time:** No websocket updates, no polling
- ❌ **NOT on Page Load:** Dashboard loads cached data from database

**Build Integration:**
```bash
# Backend build script (docker-compose or CI/CD)
npm run test:coverage              # Run tests with coverage
npm run coverage:report            # Generate JSON report
node scripts/update-health-db.js   # Save to database

# Frontend build script
npm run test:coverage
npm run coverage:report
node scripts/update-health-db.js
```

## Implementation Phases

### Phase 1: Backend Testing (Week 1-2)
**Tasks:**
1. Install testing dependencies (Jest, Supertest)
2. Set up Jest configuration with coverage thresholds
3. Migrate existing tests to co-located structure
4. Write unit tests for all services (~20 service files)
5. Write integration tests for all routes (~15 route files)
6. Achieve 90% backend coverage
7. Generate coverage reports (JSON + HTML)

**Deliverables:**
- ✅ Backend tests achieving 90% coverage
- ✅ Coverage reports auto-generated
- ✅ Build fails if coverage < 80%

### Phase 2: Frontend Testing (Week 2-3)
**Tasks:**
1. Install React Testing Library
2. Set up Jest configuration for React
3. Write component tests for all major components (~30 components)
4. Write hook tests (~5 custom hooks)
5. Write form integration tests
6. Achieve 90% frontend coverage
7. Generate coverage reports (JSON + HTML)

**Deliverables:**
- ✅ Frontend tests achieving 90% coverage
- ✅ Coverage reports auto-generated
- ✅ Build fails if coverage < 80%

### Phase 3: Health Dashboard UI (Week 3-4)
**Tasks:**
1. Create database table for coverage history
2. Create Health menu item (admin-only, red cross icon)
3. Build HealthDashboard component with sections:
   - Overview cards
   - Coverage metrics (backend/frontend)
   - Test results summary
   - Build status
   - Uncovered files list
   - Coverage trend chart
4. Create API endpoints for health data
5. Add "Refresh" button functionality
6. Style dashboard (visually appealing, clear separation)

**Deliverables:**
- ✅ Health Dashboard accessible to admins
- ✅ All metrics displaying correctly
- ✅ Historical trend chart working
- ✅ Refresh on-demand working

### Phase 4: Build Integration & Automation (Week 4)
**Tasks:**
1. Update Docker build scripts to run tests
2. Create `update-health-db.js` script to save coverage to database
3. Hook into backend/frontend build process
4. Test build failure when coverage drops below 80%
5. Verify dashboard updates after builds

**Deliverables:**
- ✅ Auto-update on every build
- ✅ Build blocking on low coverage
- ✅ Dashboard showing latest data
- ✅ Complete documentation

### Phase 5: E2E Testing (Optional - Week 5)
**Tasks:**
1. Install Playwright
2. Write critical user journey E2E tests:
   - Login flow
   - Project creation
   - Document upload
   - AI writing workflow
   - Admin settings
3. Integrate E2E results into dashboard

**Deliverables:**
- ✅ 15-20 E2E test scenarios
- ✅ E2E results in Health Dashboard
- ✅ E2E runs in CI/CD

**Total Timeline:** 4-5 weeks for complete implementation

## Technical Architecture

### Testing Infrastructure

**Backend Testing Stack:**
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "@types/jest": "^29.5.5",
    "sqlite3": "^5.1.6"  // For test database
  }
}
```

**Backend Jest Config:**
```javascript
// backend/jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/**',
    '!src/index.js'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  },
  testMatch: [
    '**/*.test.js',
    '**/tests/**/*.test.js'
  ]
};
```

**Frontend Testing Stack:**
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.4",
    "@testing-library/user-event": "^14.5.1",
    "msw": "^2.0.0"  // Mock Service Worker for API mocking
  }
}
```

**Frontend Jest Config:**
```javascript
// frontend/jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/index.js',
    '!src/config/**'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  }
};
```

**E2E Testing (Playwright):**
```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

### Database Schema

```sql
-- Test Coverage History
CREATE TABLE test_coverage_history (
  id SERIAL PRIMARY KEY,
  build_type VARCHAR(20) NOT NULL, -- 'backend' or 'frontend'
  build_version VARCHAR(50),
  git_commit VARCHAR(40),

  -- Coverage percentages
  overall_coverage NUMERIC(5,2) NOT NULL,
  statements_coverage NUMERIC(5,2),
  branches_coverage NUMERIC(5,2),
  functions_coverage NUMERIC(5,2),
  lines_coverage NUMERIC(5,2),

  -- Coverage raw counts
  statements_total INTEGER,
  statements_covered INTEGER,
  branches_total INTEGER,
  branches_covered INTEGER,
  functions_total INTEGER,
  functions_covered INTEGER,
  lines_total INTEGER,
  lines_covered INTEGER,

  -- Test results
  tests_passed INTEGER,
  tests_failed INTEGER,
  tests_skipped INTEGER,
  test_duration_ms INTEGER,

  -- Build info
  build_success BOOLEAN DEFAULT TRUE,
  build_duration_ms INTEGER,

  -- Detailed coverage data
  coverage_json JSONB, -- Full Istanbul coverage object
  uncovered_files JSONB, -- Array of files below threshold

  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_coverage_created_at ON test_coverage_history(created_at DESC);
CREATE INDEX idx_coverage_type ON test_coverage_history(build_type);
CREATE INDEX idx_coverage_version ON test_coverage_history(build_version);

-- Test Failures (for tracking specific failures)
CREATE TABLE test_failures (
  id SERIAL PRIMARY KEY,
  coverage_history_id INTEGER REFERENCES test_coverage_history(id),
  test_name TEXT NOT NULL,
  test_file VARCHAR(500),
  error_message TEXT,
  stack_trace TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_failures_history ON test_failures(coverage_history_id);
```

### API Endpoints

```
GET    /api/health/overview
  - Get current system health overview
  - Output: Status, last build info, summary metrics

GET    /api/health/coverage/latest
  - Get latest coverage data (backend + frontend)
  - Output: Latest coverage percentages, test results

GET    /api/health/coverage/history
  - Get coverage history for trend chart
  - Input: days (default 7), build_type (backend/frontend/both)
  - Output: Array of coverage data points

GET    /api/health/coverage/uncovered
  - Get list of files below coverage threshold
  - Output: Array of files with coverage %

POST   /api/health/refresh
  - Trigger on-demand test run and coverage update
  - Admin only
  - Output: Job ID, status updates

GET    /api/health/build-status
  - Get latest build status (backend + frontend)
  - Output: Build success/fail, version, timestamp

POST   /api/health/coverage/save
  - Internal endpoint called by build scripts
  - Input: Coverage JSON data
  - Output: Coverage history ID
```

### Build Script Integration

**Backend Build Script:**
```javascript
// backend/scripts/update-health-db.js
const fs = require('fs');
const { Pool } = require('pg');

async function updateHealthDB() {
  // Read coverage JSON
  const coverage = JSON.parse(
    fs.readFileSync('./coverage/coverage-final.json', 'utf8')
  );

  // Parse summary
  const summary = calculateSummary(coverage);

  // Save to database
  const pool = new Pool({...});
  await pool.query(`
    INSERT INTO test_coverage_history (
      build_type, overall_coverage, statements_coverage,
      branches_coverage, functions_coverage, lines_coverage,
      coverage_json, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
  `, [
    'backend',
    summary.overall,
    summary.statements,
    summary.branches,
    summary.functions,
    summary.lines,
    JSON.stringify(coverage)
  ]);
}

updateHealthDB().catch(console.error);
```

**Docker Build Integration:**
```dockerfile
# backend/Dockerfile
FROM node:18

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

# Install dev dependencies for testing
RUN npm install --save-dev jest supertest

COPY . .

# Run tests with coverage during build
RUN npm run test:coverage

# Update health database with results
RUN node scripts/update-health-db.js

# Start application
CMD ["npm", "start"]
```

## Success Criteria

### Coverage Goals:
- ✅ Backend coverage >= 90% (minimum 80%)
- ✅ Frontend coverage >= 90% (minimum 80%)
- ✅ E2E coverage: 15-20 critical user journeys
- ✅ All new code requires accompanying tests

### Dashboard Requirements:
- ✅ Admin-only "Health" menu item visible
- ✅ All metrics displaying correctly
- ✅ Coverage trend chart showing last 7 builds
- ✅ Refresh button working (on-demand test run)
- ✅ Auto-updates after every build
- ✅ Visually appealing with clear metric separation

### Build Integration:
- ✅ Tests run automatically on every build
- ✅ Builds fail if coverage drops below 80%
- ✅ Coverage data saved to database
- ✅ Dashboard reflects latest build data

### Performance:
- ✅ Test suite completes in < 5 minutes (backend + frontend)
- ✅ Dashboard loads in < 2 seconds
- ✅ On-demand refresh completes in < 6 minutes

## Risks & Mitigations

**Risk:** Tests slow down build process significantly
**Mitigation:** Optimize slow tests, run in parallel, use in-memory database

**Risk:** Coverage targets too aggressive (90% hard to achieve)
**Mitigation:** Start with 80% minimum, gradually increase to 90%

**Risk:** Flaky tests cause build failures
**Mitigation:** Identify and fix flaky tests immediately, use retry logic

**Risk:** Dashboard becomes too complex (not AQAD)
**Mitigation:** Start simple (tables + numbers), add charts later

**Risk:** Historical data grows too large
**Mitigation:** Archive data older than 90 days, aggregate old data

## Future Enhancements

**Post-Launch Improvements:**
1. Move Dev Tools into Health Dashboard
2. Add performance metrics (API response times, memory usage)
3. Add error rate tracking and alerts
4. Add test flakiness detection
5. Add code complexity metrics (cyclomatic complexity)
6. Add security vulnerability scanning results
7. Add dependency audit results
8. Email alerts when coverage drops below threshold
9. Slack/Teams integration for build failures
10. Coverage badges for README

---

**Document Owner:** Product Team
**Last Updated:** 2025-09-30
**Status:** ✅ Requirements Complete - Awaiting Go-Ahead
**Next Steps:** Wait for approval, then begin Phase 1 implementation

**AQAD Complete - Ready for your go-ahead! 🚀**
