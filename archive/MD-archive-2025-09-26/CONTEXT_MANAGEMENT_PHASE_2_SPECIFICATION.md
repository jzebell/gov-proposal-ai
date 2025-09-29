# Context Management Phase 2: Admin Configuration Interface - Technical Specification

## Overview
Implementation of administrative configuration interface for the Document Context Feeding system, allowing administrators to configure priority rules, model settings, and system behavior.

## Status: 🟡 In Progress
**Epic**: Document Context Integration Phase 2
**Priority**: High
**Dependencies**: Phase 1 Context Feeding System (✅ Complete)
**Started**: 2024-09-24
**Estimated Completion**: 2-3 hours

---

## Requirements Summary

### User Requirements
- **Admin Access Only**: Context management settings restricted to admin users
- **Document Priority Configuration**: Drag-and-drop reordering + numerical sliders (0-10) for metadata weights
- **Model Token Limits**: Pull from AI service + general category-based configuration
- **RAG Strictness Control**: Simple slider (0-100%) for system default (no per-user override)
- **Global Settings Integration**: Store in existing global settings system

### Technical Requirements
- Integration with existing AdminSettings.js component
- New "Context Management" tab in admin interface
- Backend API endpoints for configuration management
- Database schema updates for storing configuration
- ContextService updates to use configurable settings

---

## Implementation Plan

### Phase 2.1: Basic Settings Panel ⏳ IN PROGRESS
**Files to Modify:**
- `frontend/src/components/AdminSettings.js`
- `backend/src/routes/globalSettings.js`
- `backend/src/services/GlobalSettingsService.js`

**Components:**
1. **Token Limit Management**
   - Model category selection (Small: 4K, Medium: 16K, Large: 32K+)
   - Pull available models from AI service
   - Per-category token allocation settings

2. **Display Preferences**
   - Token/Word/Character count selection for UI
   - Context build delay configuration (default: 10 seconds)
   - Retry attempt configuration (default: 3)

3. **Error Handling Settings**
   - Fallback behavior: Partial/Previous/Error priority
   - Warning thresholds for context size alerts
   - Cleanup schedule configuration

### Phase 2.2: Document Priority Rules
**Files to Create/Modify:**
- `frontend/src/components/admin/ContextPriorityManager.js` (NEW)
- Drag-and-drop library integration (react-beautiful-dnd)

**Components:**
1. **Document Type Hierarchy**
   - Drag-and-drop interface for reordering document types
   - Current order: solicitations > requirements > references > past-performance > proposals > compliance > media
   - Visual priority indicators

2. **Metadata Weight Sliders**
   - Agency match weight (0-10, default: 5)
   - Technology match weight (0-10, default: 4)
   - Recency weight (0-10, default: 3)
   - Keyword relevance weight (0-10, default: 6)
   - File size penalty thresholds

### Phase 2.3: Section Classification Keywords
**Files to Create/Modify:**
- `frontend/src/components/admin/SectionKeywordManager.js` (NEW)
- Database schema for keyword storage

**Components:**
1. **Section Type Management**
   - Executive Summary keywords (default: executive, summary)
   - Technical keywords (default: technical, technology, solution)
   - Management keywords (default: management, project, timeline)
   - Requirements keywords (default: requirement, specification)
   - Experience keywords (default: experience, performance, past)

2. **Keyword Editor Interface**
   - Add/remove keywords per section type
   - Preview section classification results
   - Import/export keyword configurations

### Phase 2.4: RAG Strictness & Context Controls
**Files to Modify:**
- AdminSettings.js (additional controls)
- AIWritingService.js (to use configured defaults)

**Components:**
1. **RAG Strictness Control**
   - Single slider (0-100%) for system-wide default
   - Preview of strictness impact on AI behavior
   - No per-user override capability

2. **Context Percentage Allocation**
   - Context/Generation/Buffer split (default: 70/20/10)
   - Model-specific overrides
   - Visual representation of token allocation

---

## Database Schema Changes

### Global Settings Extensions
```sql
-- Add context management settings to existing global_settings table
INSERT INTO global_settings (key, value, category) VALUES
-- Document Priority Configuration
('context.document_types_priority', '["solicitations", "requirements", "references", "past-performance", "proposals", "compliance", "media"]', 'context'),
('context.metadata_weights', '{"agency_match": 5, "technology_match": 4, "recency": 3, "keyword_relevance": 6}', 'context'),

-- Model & Performance Settings
('context.model_categories', '{"small": {"max_tokens": 4000, "models": []}, "medium": {"max_tokens": 16000, "models": []}, "large": {"max_tokens": 32000, "models": []}}', 'context'),
('context.token_allocation', '{"context_percent": 70, "generation_percent": 20, "buffer_percent": 10}', 'context'),
('context.display_preference', 'tokens', 'context'),
('context.rag_strictness', 60, 'context'),

-- Error Handling & Performance
('context.retry_attempts', 3, 'context'),
('context.build_delay_seconds', 10, 'context'),
('context.warning_threshold_percent', 85, 'context'),
('context.fallback_behavior', 'partial', 'context'),

-- Section Classification Keywords
('context.section_keywords', '{"executive_summary": ["executive", "summary"], "technical": ["technical", "technology", "solution"], "management": ["management", "project", "timeline"], "requirements": ["requirement", "specification"], "experience": ["experience", "performance", "past"]}', 'context');
```

### New Configuration Tables (Alternative Approach)
```sql
-- If we need more complex configuration storage
CREATE TABLE context_configurations (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(50)
);

CREATE INDEX idx_context_configs_category ON context_configurations(category);
CREATE INDEX idx_context_configs_key ON context_configurations(config_key);
```

---

## API Endpoints

### Context Configuration Management
```javascript
// GET /api/global-settings/context - Get all context configuration
// PUT /api/global-settings/context - Update context configuration
// GET /api/global-settings/context/:key - Get specific configuration
// POST /api/context/test-configuration - Test configuration changes
// POST /api/context/reset-defaults - Reset to default configuration
```

### Model Integration
```javascript
// GET /api/ai-writing/models/categories - Get model categories with token limits
// POST /api/ai-writing/models/categorize - Auto-categorize models by capabilities
```

---

## Frontend Component Architecture

### AdminSettings.js Enhancement
```javascript
// New state for context management
const [contextConfig, setContextConfig] = useState({
  documentTypesPriority: [],
  metadataWeights: {},
  modelCategories: {},
  ragStrictness: 60,
  tokenAllocation: { context_percent: 70, generation_percent: 20, buffer_percent: 10 },
  sectionKeywords: {},
  errorHandling: {
    retryAttempts: 3,
    buildDelay: 10,
    warningThreshold: 85,
    fallbackBehavior: 'partial'
  }
});

// New functions
const loadContextConfiguration = async () => { /* ... */ };
const saveContextConfiguration = async () => { /* ... */ };
const resetContextDefaults = async () => { /* ... */ };
const testConfigurationChanges = async () => { /* ... */ };
```

### Component Structure
```
AdminSettings.js
├── Context Management Tab
│   ├── BasicSettingsPanel
│   │   ├── TokenLimitManager
│   │   ├── DisplayPreferences
│   │   └── ErrorHandlingSettings
│   ├── DocumentPriorityManager
│   │   ├── DragDropTypeList
│   │   └── MetadataWeightSliders
│   ├── SectionKeywordManager
│   │   ├── KeywordEditor
│   │   └── SectionTypeManager
│   └── RAGControlPanel
│       ├── StrictnessSlider
│       └── ContextAllocationSettings
```

---

## Integration Points

### ContextService Integration
- Update `getDocumentTypeScore()` to use configured priority order
- Update `getMetadataScore()` to use configured metadata weights
- Update `detectSectionType()` to use configured keywords
- Add configuration loading on service initialization

### AIWritingService Integration
- Update RAG mode selection to use configured default strictness
- Apply configured context percentage allocation
- Use configured model token limits for context sizing

### GlobalSettingsService Extension
- Add context-specific configuration methods
- Implement configuration validation
- Add configuration export/import capabilities

---

## User Experience Design

### Context Management Interface Layout
```
🧠 Context Management
├── 📊 Basic Settings
│   ├── Model Token Limits [Dropdown + Input]
│   ├── Display Preference [Radio: Tokens|Words|Characters]
│   ├── Build Delay [Slider: 5-60 seconds]
│   └── Retry Attempts [Slider: 1-5]
├── 📋 Document Priority Rules
│   ├── Document Type Order [Drag & Drop List]
│   └── Metadata Weights [Sliders: Agency|Tech|Recency|Keywords]
├── 🏷️ Section Classification
│   ├── Executive Summary [Tag Input]
│   ├── Technical Content [Tag Input]
│   ├── Management Content [Tag Input]
│   └── Requirements Content [Tag Input]
└── 🎯 RAG & Context Controls
    ├── RAG Strictness [Slider: 0-100%]
    ├── Context Allocation [Three-way slider: Context|Generation|Buffer]
    └── Warning Thresholds [Slider: 70-95%]
```

### Validation & Feedback
- Real-time validation of configuration changes
- Preview impact of priority rule changes
- Warning messages for problematic configurations
- Success/error feedback for save operations
- Configuration test functionality

---

## Testing Strategy

### Unit Tests
- Configuration loading/saving functionality
- Priority rule calculation with custom weights
- Section classification with custom keywords
- Token allocation calculations

### Integration Tests
- Context building with custom configuration
- AI service integration with configured settings
- Admin interface configuration persistence
- Configuration validation and error handling

### User Acceptance Tests
- Admin can modify document priority order
- Configuration changes affect context building behavior
- RAG strictness changes affect AI responses
- Invalid configurations are properly rejected

---

## Implementation Progress

### ✅ Completed
- [x] Requirements gathering and documentation
- [x] Technical specification creation
- [x] Database schema design
- [x] API endpoint planning
- [x] Frontend component architecture design

### 🟡 In Progress
- [x] AdminSettings.js tab addition (partial - tab button added)
- [ ] Basic settings panel implementation
- [ ] Backend configuration API endpoints
- [ ] Global settings service extensions

### ⏳ Pending
- [ ] Document priority drag-and-drop interface
- [ ] Section keyword management interface
- [ ] RAG strictness controls
- [ ] ContextService configuration integration
- [ ] Testing and validation
- [ ] Documentation updates

---

## Risk Assessment

### Technical Risks
- **Configuration Complexity**: Risk of overly complex configuration leading to user confusion
  - *Mitigation*: Start with essential settings, add advanced features incrementally
- **Performance Impact**: Additional configuration loading could slow system startup
  - *Mitigation*: Implement configuration caching and lazy loading
- **Backward Compatibility**: Changes to ContextService could break existing functionality
  - *Mitigation*: Implement graceful fallbacks to hardcoded defaults

### User Experience Risks
- **Admin Overwhelm**: Too many configuration options could be intimidating
  - *Mitigation*: Group settings logically, provide helpful tooltips and defaults
- **Configuration Errors**: Incorrect settings could degrade system performance
  - *Mitigation*: Implement validation, testing features, and reset capabilities

---

## Success Criteria

### Functional Requirements
- [x] Admin users can access context management settings
- [ ] Document priority rules can be modified and saved
- [ ] Section classification keywords can be customized
- [ ] RAG strictness can be adjusted system-wide
- [ ] Model token limits can be configured per category
- [ ] Configuration changes take effect immediately
- [ ] Invalid configurations are rejected with helpful messages

### Performance Requirements
- Configuration loading completes within 2 seconds
- Configuration changes apply without system restart
- Context building incorporates new settings within 30 seconds
- Admin interface remains responsive during configuration updates

### User Experience Requirements
- Intuitive interface for non-technical administrators
- Clear feedback for all configuration changes
- Ability to preview impact of configuration changes
- One-click reset to default configuration
- Comprehensive help documentation and tooltips

---

**Next Steps**: Begin implementation with basic settings panel, following the planned component architecture and integration points.

**Last Updated**: 2024-09-24
**Document Owner**: Context Management Phase 2 Epic