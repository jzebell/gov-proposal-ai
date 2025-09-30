# Current Development Priorities - Technical Design Document

**Document**: Current Development Priorities and Implementation Roadmap
**Date**: 2025-09-29
**Version**: 1.0
**Status**: Active Development Planning
**Author**: Senior Software Engineer

## Executive Summary

This document consolidates all current development priorities for the nxtProposal Government Proposal AI system, merging immediate fixes from the Comprehensive Requirements Catalog with the strategic Epic 2 Past Performance RAG implementation. The prioritization focuses on maximizing user experience improvements while building toward advanced AI capabilities.

## Merged Priority List

### 🔴 Priority 1: Critical Fixes (Week 1)
Quick wins that resolve immediate user pain points and system issues.

#### 1.1 Fix Edit Project Button
**Current Issue**: Edit button opens document editing instead of project metadata
**Impact**: User confusion and workflow disruption
**Solution**: Redirect edit action to project information modal
**Files Affected**:
- `frontend/src/components/ProjectManagement/ProjectCard.js`
- `frontend/src/components/ProjectManagement/EditProjectModal.js`

#### 1.2 Default Upload Settings to "Solicitation" with "Active" Subfolder
**Current Issue**: Upload modals don't default to most common document type and subfolder
**Impact**: Extra clicks for most common use case (uploading active solicitations)
**Solution**:
- Set "Solicitation" as default document type in all upload modals
- Set "Active" as default subfolder selection
- Remember user's last selection as override (future enhancement)
**Implementation Details**:
```javascript
// Default configuration
const DEFAULT_UPLOAD_SETTINGS = {
  documentType: 'Solicitation',
  subfolder: 'Active',
  allowMultiple: true
};
```
**Files Affected**:
- `frontend/src/components/DocumentUpload/UploadModal.js`
- `frontend/src/components/ProjectDocuments/DocumentUploadDialog.js`
- `frontend/src/utils/uploadDefaults.js` (new - centralized defaults)
- Any other document upload components

#### 1.3 Remove Console Logging
**Current Issue**: Excessive console.log statements in production code
**Impact**: Performance degradation and security concerns
**Solution**: Remove or convert to proper logging system
**Files Affected**:
- `frontend/src/components/ThreePanelLayout.js`
- `frontend/src/components/AIWritingAssistant.js`

#### 1.4 Model Warm-up Optimization
**Current Issue**: 2-minute delay on first AI response
**Impact**: Poor user experience on initial interaction
**Solution**: Implement proactive model loading on page navigation
**Existing Implementation**:
- `frontend/src/hooks/useModelWarmup.js` (needs optimization)
- `backend/src/services/ModelWarmupService.js` (needs enhancement)
**Enhancement Required**:
- Pre-emptive warm-up on application load
- Model switching warm-up
- Background keep-alive mechanism

### 🟡 Priority 2: Core Functionality (Weeks 2-3)
Essential features for daily operational use.

#### 2.1 Complete Document Type Management
**Current State**: Partially functional admin settings
**Required**: Full CRUD operations for document types
**Components**:
- Document type creation/editing/deletion
- Subfolder configuration per type
- File extension and size limit settings
**Files Affected**:
- `frontend/src/components/AdminSettings/DocumentTypeManager.js`
- `backend/src/routes/documentTypes.js` (new)
- `backend/src/models/DocumentType.js` (enhance)

#### 2.2 Global Prompt Configuration System
**Purpose**: Establish creative writing ground rules and standards
**Features**:
- Base prompt templates for consistency
- Style guidelines (no em-dashes, plain language)
- Metric placeholders for proposals
- Past performance integration rules
**Existing Implementation**:
- `backend/src/routes/globalPrompts.js` (needs expansion)
- `backend/src/services/GlobalPromptService.js` (needs enhancement)
**New Requirements**:
- Admin UI for prompt management
- Prompt versioning and rollback
- Per-persona prompt inheritance

#### 2.3 Full Project CRUD Operations
**Current State**: Incomplete project lifecycle management
**Required**: Complete Create, Read, Update, Delete functionality
**Components**:
- Project creation wizard
- Project archiving/deletion
- Project cloning/templating
- Batch operations support

### 🟢 Priority 3: Advanced Features (Weeks 4-6)
Strategic enhancements for competitive advantage.

#### 3.1 Chat History System with Rolling Threads
**Purpose**: Maintain conversation context across sessions
**Features**:
- User-project specific conversation storage
- Rolling context window management
- Conversation search and export
- Thread branching for alternative approaches
**Database Schema**:
```sql
chat_histories (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    conversation_thread JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    token_count INTEGER,
    model_used VARCHAR(100)
);
```

#### 3.2 ML Decision Dashboard
**Purpose**: Visibility into AI decision-making process
**Components**:
- Document selection rationale display
- Relevance scoring visualization
- Confidence metrics per response
- Performance tracking over time
**Visualizations**:
- Decision tree diagrams
- Relevance heat maps
- Confidence gauges
- Token usage charts

#### 3.3 Comprehensive Configuration Tab
**Purpose**: Centralize all system settings
**Features**:
- Dynamic configuration management
- Change history and rollback
- Impact analysis for settings
- Export/import configurations
**Categories**:
- AI model settings
- Document processing rules
- User interface preferences
- System performance tuning

### 🔵 Priority 4: Epic Features (Weeks 7-12)
Major system expansions and capabilities.

#### 4.1 Epic 2: Past Performance RAG System
**Purpose**: Semantic search for relevant past performance matching
**Core Features**:
- pgvector integration for embeddings
- Multi-document unification
- Technology extraction and taxonomy
- AI-powered explanation generation
**Status**: Technical design complete, ready for implementation
**Reference**: `/docs/design/2025-09-27-epic-2-past-performance-rag-design.md`

#### 4.2 Word Cloud Visualizations
**Purpose**: Visual analysis of documents and taxonomies
**Applications**:
- Solicitation keyword extraction
- Technology stack visualization
- Proposal theme identification
- Compliance requirement clustering
**Technology**: D3.js or React-Wordcloud library

#### 4.3 Department/Agency Taxonomy with Icon Mapping
**Structure**: Department → Agency → Sub-Agency → Program
**Features**:
- Pre-populated federal department/agency database
- Icon/symbol mapping for visual identification
- Custom program creation capability
- Hierarchical filtering and search
- Department logos and official seals integration
**Database Schema**:
```sql
departments (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    acronym VARCHAR(50),
    icon_path VARCHAR(500),
    seal_path VARCHAR(500),
    parent_id UUID REFERENCES departments(id),
    level ENUM('department', 'agency', 'sub_agency', 'program'),
    active BOOLEAN DEFAULT true
);
```
**Examples**:
- DOD → Army → CECOM → C5ISR
- USDA → FSA → FLP
- HHS → CDC → NCHS

#### 4.4 Internal Document Management
**Purpose**: Manage non-project company documents
**Features**:
- Template library
- Standards documentation
- Deduplication system
- Version control

### 🟣 Priority 5: Integration Features (Weeks 13-16)
External system connections and enterprise features.

#### 5.1 Compliance System Deep-Dive
**Purpose**: Comprehensive requirement tracking
**Features**:
- Automated requirement extraction
- Gap analysis reporting
- Compliance scoring
- Audit trail generation

#### 5.2 Project Role Management with RBAC
**Roles**:
- Proposal Lead
- Writer
- Solutions Architect
- Reviewer
- Subject Matter Expert
**Permissions**: Granular access control per role

#### 5.3 External Document Integration
**Target**: SharePoint and similar systems
**Features**:
- API connections
- Link management
- Sync capabilities
- Secure access control

## Implementation Approach

### Phase 1: Quick Wins (Week 1)
- Fix critical UI issues
- Remove console logging
- Initial warm-up optimization

### Phase 2: Core Enhancement (Weeks 2-3)
- Complete admin functionality
- Implement global prompts
- Finish CRUD operations

### Phase 3: Intelligence Layer (Weeks 4-6)
- Build chat history system
- Create ML dashboard
- Centralize configurations

### Phase 4: Major Features (Weeks 7-12)
- Deploy Epic 2 RAG system
- Add visualizations
- Implement classifications

### Phase 5: Enterprise Integration (Weeks 13-16)
- Compliance system
- RBAC implementation
- External integrations

## Success Metrics

### User Experience
- First response time: <3 seconds (from 2 minutes)
- Project operations: <1 second response
- Search results: <3 seconds

### System Quality
- Zero console logs in production
- 100% CRUD operation coverage
- Full configuration management

### Feature Adoption
- 80% users utilizing chat history
- 100% projects using global prompts
- 50% users customizing ML weights

## Risk Mitigation

### Technical Risks
- **Model warm-up complexity**: Incremental optimization approach
- **pgvector performance**: Careful index optimization
- **Chat history storage**: Implement rolling window limits

### Resource Risks
- **Development bandwidth**: Prioritized phases allow partial deployment
- **Testing coverage**: Automated testing for each phase
- **User training**: Progressive feature rollout

## Dependencies

### Technical Dependencies
- PostgreSQL with pgvector extension
- Ollama model availability
- Docker environment stability

### Data Dependencies
- Existing project data migration
- Document processing pipeline
- User authentication system

## Testing Strategy

### Phase 1 Tests
- UI interaction tests
- Console log elimination verification
- Warm-up time benchmarks

### Phase 2 Tests
- CRUD operation coverage
- Prompt inheritance validation
- Admin interface testing

### Phase 3 Tests
- Chat history persistence
- ML decision accuracy
- Configuration rollback

### Phase 4 Tests
- RAG search performance
- Visualization rendering
- Classification accuracy

## Rollback Plan

Each phase includes:
- Feature flags for new functionality
- Database migration rollback scripts
- Configuration backup/restore
- Service-level rollbacks

## Next Steps

1. **Immediate Action**: Begin Priority 1 fixes
2. **Team Alignment**: Review and approve priority order
3. **Resource Allocation**: Assign developers to phases
4. **Monitoring Setup**: Establish success metrics tracking

---

**Approval**: _________________
**Date**: _________________