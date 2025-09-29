# Epic 2: Past Performance RAG System - Technical Design

**Document**: Epic 2 Technical Design Document
**Date**: 2025-09-27
**Version**: 1.0
**Status**: Requirements Complete - Ready for Implementation
**Author**: Senior Software Engineer

## Executive Summary

Epic 2 transforms the Government Proposal AI into a comprehensive Past Performance intelligence system with semantic search, AI-powered matching, and sophisticated document processing capabilities. This system enables federal contractors to rapidly identify relevant past performance examples from complex solicitation requirements.

## Business Requirements Summary

### Core Objectives
- **Past Performance Matching**: 3 relevant suggestions per project with auto-generated explanations
- **Search Modes**: Project-context, project free-text, and standalone research capabilities
- **Complex Requirement Parsing**: Handle 5+ consideration solicitation requirements
- **Technology Intelligence**: Self-growing taxonomy with version-specific matching
- **Unified & Per-Project Profiles**: Both individual PP and cross-portfolio capability analysis

### Success Metrics
- **Response Time**: <3 seconds for semantic search queries
- **Scale**: Support 100-1000 past performance documents
- **User Load**: 5-10 concurrent users (40-50 total users)
- **Processing**: <30 seconds per document upload
- **Growth**: 10 new past performances per year

## System Architecture

### High-Level Component Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Project PP    │  │  Standalone PP  │  │  Admin PP       │ │
│  │   Search        │  │  Research       │  │  Management     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Past Performance│  │   Search &      │  │   Technology    │ │
│  │    Service      │  │  Matching       │  │   Extraction    │ │
│  │                 │  │   Service       │  │    Service      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Database & Vector Store                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Past Perf      │  │   Vector        │  │   Technology    │ │
│  │  Metadata       │  │  Embeddings     │  │   Taxonomy      │ │
│  │  (PostgreSQL)   │  │  (pgvector)     │  │  (PostgreSQL)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Processing Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Embedding     │  │  Requirement    │  │   Explanation   │ │
│  │  Generation     │  │   Parsing       │  │   Generation    │ │
│  │   (Ollama)      │  │   (Ollama)      │  │    (Ollama)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Past Performance Service
**Responsibilities:**
- Document upload and processing (1-15 docs per PP)
- Metadata extraction and validation
- Multi-document content unification
- Historical versioning management
- Customer-based organization

#### 2. Search & Matching Service
**Responsibilities:**
- Semantic vector search using pgvector
- User-configurable ranking algorithm
- Complex solicitation requirement parsing
- Cross-project capability aggregation
- Real-time explanation generation

#### 3. Technology Extraction Service
**Responsibilities:**
- Self-growing technology taxonomy
- Version-specific technology detection
- Methodology and approach extraction
- User/admin approval workflows for new technologies
- Unified technology profiling across portfolio

## Data Model Design

### Core Entities

#### Past Performance Projects
```sql
past_performances (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    customer VARCHAR(255) NOT NULL,
    contract_value DECIMAL(15,2),
    period_start DATE,
    period_end DATE,
    role ENUM('prime', 'subcontractor'),
    work_percentage INTEGER, -- For subcontractor roles
    resource_count INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    status ENUM('active', 'archived')
);
```

#### Past Performance Documents
```sql
pp_documents (
    id UUID PRIMARY KEY,
    pp_id UUID REFERENCES past_performances(id),
    document_type ENUM('narrative', 'pws_sow', 'qasp', 'govt_review', 'cpars', 'other'),
    file_name VARCHAR(255),
    file_path TEXT,
    content_text TEXT, -- Extracted text content
    weight_factor DECIMAL(3,2) DEFAULT 1.0, -- Higher for narrative
    uploaded_at TIMESTAMP,
    processed_at TIMESTAMP
);
```

#### Unified Content Profiles
```sql
pp_unified_content (
    pp_id UUID PRIMARY KEY REFERENCES past_performances(id),
    unified_text TEXT, -- Merged content from all documents
    narrative_text TEXT, -- Primary narrative content
    generated_summary TEXT,
    last_updated TIMESTAMP,
    version INTEGER DEFAULT 1
);
```

#### Technology Extraction
```sql
technologies (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category ENUM('platform', 'language', 'framework', 'tool', 'database', 'cloud', 'methodology'),
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    approved_by UUID REFERENCES users(id)
);

pp_technologies (
    id UUID PRIMARY KEY,
    pp_id UUID REFERENCES past_performances(id),
    technology_id UUID REFERENCES technologies(id),
    version_specific VARCHAR(50), -- e.g., "Java 17", "React 18"
    confidence_score DECIMAL(3,2),
    context_snippet TEXT,
    detected_at TIMESTAMP
);
```

#### Vector Embeddings
```sql
pp_embeddings (
    id UUID PRIMARY KEY,
    pp_id UUID REFERENCES past_performances(id),
    chunk_type ENUM('project_level', 'capability_level', 'outcome_level'),
    chunk_text TEXT,
    embedding vector(1536), -- OpenAI/Ollama embedding dimension
    chunk_metadata JSONB, -- Technology tags, timeframes, etc.
    created_at TIMESTAMP
);
```

#### Cross-Project Capabilities
```sql
unified_capabilities (
    id UUID PRIMARY KEY,
    technology_id UUID REFERENCES technologies(id),
    capability_summary TEXT,
    project_count INTEGER,
    total_experience_years DECIMAL(4,2),
    recent_usage_date DATE,
    auto_generated_text TEXT, -- For "32 other programs" narratives
    last_updated TIMESTAMP,
    version INTEGER DEFAULT 1
);
```

#### Search & Ranking Configuration
```sql
search_configurations (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    config_name VARCHAR(100),
    technology_weight DECIMAL(3,2) DEFAULT 0.40,
    domain_weight DECIMAL(3,2) DEFAULT 0.30,
    contract_size_weight DECIMAL(3,2) DEFAULT 0.20,
    customer_type_weight DECIMAL(3,2) DEFAULT 0.10,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);
```

### Indexing Strategy

```sql
-- Performance indexes
CREATE INDEX idx_pp_customer ON past_performances(customer);
CREATE INDEX idx_pp_role ON past_performances(role);
CREATE INDEX idx_pp_contract_value ON past_performances(contract_value);
CREATE INDEX idx_pp_period_end ON past_performances(period_end);

-- Vector search indexes
CREATE INDEX idx_pp_embeddings_vector ON pp_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_pp_embeddings_type ON pp_embeddings(chunk_type);

-- Technology search indexes
CREATE INDEX idx_pp_tech_confidence ON pp_technologies(confidence_score);
CREATE INDEX idx_tech_category ON technologies(category);
CREATE INDEX idx_tech_approved ON technologies(approved);
```

## API Design

### Past Performance Management Endpoints

```javascript
// Upload and process past performance
POST /api/past-performance/upload
{
  "name": "USDA Modernization Project",
  "customer": "USDA",
  "contractValue": 2500000,
  "periodStart": "2021-01-01",
  "periodEnd": "2023-12-31",
  "role": "prime",
  "workPercentage": 100,
  "resourceCount": 15,
  "documents": [/* file uploads */]
}

// Get past performance details
GET /api/past-performance/{id}
Response: {
  "id": "uuid",
  "name": "USDA Modernization Project",
  "customer": "USDA",
  "unifiedContent": "...",
  "technologies": [...],
  "documents": [...],
  "capabilities": [...]
}

// Update past performance (incremental)
PATCH /api/past-performance/{id}
{
  "additionalDocuments": [/* new files */],
  "updatedMetadata": {...}
}
```

### Search & Matching Endpoints

```javascript
// Project-context search (uses solicitation requirements)
POST /api/search/project-context
{
  "projectId": "uuid",
  "searchWeights": {
    "technology": 0.45,
    "domain": 0.25,
    "contractSize": 0.20,
    "customerType": 0.10
  },
  "includeSubcontractor": false
}

// Free-text search
POST /api/search/freetext
{
  "query": "Java Spring microservices federal healthcare",
  "searchWeights": {...},
  "filters": {
    "minContractValue": 1000000,
    "maxAge": "3 years",
    "role": ["prime"],
    "technologies": ["Java", "Spring"]
  }
}

// Standalone research search
POST /api/search/research
{
  "query": "cloud migration experience",
  "returnSummaryOnly": true
}

Response Format:
{
  "results": [
    {
      "ppId": "uuid",
      "name": "USDA Modernization",
      "relevanceScore": 0.87,
      "explanation": [
        "• Matches required Java/Spring technology stack",
        "• Similar $2.5M contract value to solicitation range",
        "• Federal customer experience (USDA)",
        "• Recent completion (2023)"
      ],
      "keyCapabilities": [...],
      "summary": "..."
    }
  ],
  "totalFound": 15,
  "searchTime": 2.3
}
```

### Technology Management Endpoints

```javascript
// Get technology taxonomy
GET /api/technologies
Response: {
  "approved": [...],
  "pendingApproval": [...],
  "categories": {
    "platforms": [...],
    "languages": [...],
    "frameworks": [...],
    "methodologies": [...]
  }
}

// Approve new technologies
POST /api/technologies/approve
{
  "technologyIds": ["uuid1", "uuid2"],
  "category": "framework"
}

// Get unified capabilities summary
GET /api/capabilities/unified
Response: {
  "Java": {
    "projectCount": 8,
    "totalYears": 15.5,
    "recentUsage": "2023-12-31",
    "narrativeText": "Our team has successfully delivered Java-based solutions across 8 federal projects..."
  }
}
```

## Implementation Approach

### Phase 1: Foundation (Weeks 1-2)
**Database Schema & Core Models**
- [ ] Extend PostgreSQL schema with new PP tables
- [ ] Set up pgvector indexes for semantic search
- [ ] Create database migration scripts
- [ ] Implement core Past Performance model classes

**Document Processing Pipeline**
- [ ] Extend existing document upload system for PP workflows
- [ ] Implement multi-document unification logic
- [ ] Add customer-based file organization
- [ ] Create document versioning system

### Phase 2: AI Intelligence (Weeks 3-4)
**Technology Extraction Service**
- [ ] Build technology detection using Ollama
- [ ] Implement self-growing taxonomy with approval workflow
- [ ] Create version-specific matching logic
- [ ] Add methodology extraction capabilities

**Vector Search & Embeddings**
- [ ] Implement dual-level chunking strategy
- [ ] Generate embeddings for project and capability levels
- [ ] Build pgvector search queries
- [ ] Create cross-project capability aggregation

### Phase 3: Search & Matching (Weeks 5-6)
**Search Interface & API**
- [ ] Build three search modes (project-context, free-text, research)
- [ ] Implement user-configurable ranking weights
- [ ] Create complex requirement parsing logic
- [ ] Add real-time explanation generation

**Frontend Integration**
- [ ] Create PP upload interface with metadata capture
- [ ] Build search results display with explanations
- [ ] Add "show more examples" functionality
- [ ] Implement admin technology approval interface

### Phase 4: Advanced Features (Weeks 7-8)
**Export & Integration**
- [ ] Word/PDF export functionality
- [ ] Standalone research page
- [ ] Admin default weight configuration
- [ ] User action tracking (future compliance)

## File Structure Changes

```
backend/src/
├── models/
│   ├── PastPerformance.js          # NEW - Core PP model
│   ├── PPDocument.js               # NEW - PP document model
│   ├── Technology.js               # NEW - Technology taxonomy
│   ├── PPEmbedding.js              # NEW - Vector embeddings
│   └── UnifiedCapability.js        # NEW - Cross-project capabilities
├── services/
│   ├── PastPerformanceService.js   # NEW - PP management
│   ├── TechnologyExtractionService.js # NEW - Tech detection
│   ├── PPSearchService.js          # NEW - Search & matching
│   └── PPProcessingService.js      # NEW - Document processing
├── routes/
│   ├── pastPerformance.js          # NEW - PP CRUD operations
│   ├── ppSearch.js                 # NEW - Search endpoints
│   └── technologies.js             # NEW - Technology management
└── migrations/
    └── 003_past_performance_tables.sql # NEW - Schema changes

frontend/src/components/
├── PastPerformance/
│   ├── PPUploadWizard.js           # NEW - Multi-doc upload
│   ├── PPSearchInterface.js        # NEW - Search with weights
│   ├── PPResultCard.js             # NEW - Results with explanations
│   ├── StandalonePPSearch.js       # NEW - Research page
│   └── TechnologyApproval.js       # NEW - Admin tech approval
└── AdminSettings/
    └── PPConfiguration.js          # NEW - Default weights config
```

## Testing Strategy

### Unit Tests
- Past Performance model CRUD operations
- Technology extraction accuracy
- Vector embedding generation
- Search ranking algorithm correctness

### Integration Tests
- End-to-end PP upload and processing workflow
- Multi-document content unification
- Search API response formatting
- Technology approval workflow

### Performance Tests
- Vector search performance with 1000+ documents
- Concurrent user load testing (10 users)
- Document processing time validation (<30 seconds)
- Search response time validation (<3 seconds)

## Rollback Plan

### Database Rollback
- Migration scripts include DOWN operations
- Vector embeddings can be regenerated from stored text
- Technology taxonomy preserved in separate table

### Service Rollback
- New PP services are additive to existing system
- Existing document processing pipeline unchanged
- Search endpoints are new additions (no existing functionality modified)

### Data Recovery
- All uploaded documents stored in file system
- Metadata can be regenerated from documents
- User configurations stored separately from core data

## Success Criteria

### Functional Requirements Met
- ✅ 3 relevant PP suggestions per project search
- ✅ <3 second search response time
- ✅ Support for 1000+ past performance documents
- ✅ User-configurable ranking weights
- ✅ Self-growing technology taxonomy
- ✅ Multi-document PP processing
- ✅ Bullet-point explanation generation

### Technical Requirements Met
- ✅ Incremental document updates
- ✅ Historical version preservation
- ✅ Customer-based file organization
- ✅ 5-10 concurrent user support
- ✅ Word/PDF export capabilities
- ✅ Admin configuration interface

## Risk Mitigation

### Technical Risks
- **Vector Search Performance**: Pre-computed embeddings with optimized pgvector indexes
- **AI Processing Load**: Ollama queue management with async processing
- **Storage Growth**: Efficient chunking strategy with configurable retention

### Business Risks
- **User Adoption**: Intuitive interface with progressive disclosure
- **Search Accuracy**: User feedback loop for continuous improvement
- **Compliance**: Built-in audit trail and explanation generation

---

**Next Steps**: Database schema implementation and core model development. Ready for implementation on approval.