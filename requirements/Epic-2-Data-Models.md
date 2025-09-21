# Epic 2: Data Models & Schema Design

## Core Entity Relationships

```sql
-- Solicitation Projects (container for all project documents)
solicitation_projects
├── solicitation_documents (base RFP, amendments, Q&As)
├── past_performance (reusable across projects)
├── project_documents (research, ATOs, references)
└── technology_mappings (dynamic categorization)
```

## Database Schema Extensions

### Solicitation Projects
```sql
CREATE TABLE solicitation_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    agency VARCHAR(100),
    solicitation_number VARCHAR(50),
    project_type VARCHAR(50), -- 'Federal', 'State', 'Local'
    status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Submitted', 'Won', 'Lost'
    due_date TIMESTAMP,
    estimated_value DECIMAL,
    pursuit_decision VARCHAR(20), -- 'Pursuing', 'No-Bid', 'Pending'
    metadata JSONB, -- flexible project-specific data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Document Repository
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitation_project_id UUID REFERENCES solicitation_projects(id),
    title VARCHAR(200) NOT NULL,
    original_filename VARCHAR(255),
    file_path TEXT,
    file_size BIGINT,
    document_category VARCHAR(50), -- 'solicitation', 'amendment', 'qa', 'past_performance', 'research', 'ato', 'reference'
    document_type VARCHAR(20), -- 'pdf', 'docx', 'xlsx', 'txt'
    version VARCHAR(10) DEFAULT '1.0',
    is_latest_version BOOLEAN DEFAULT true,
    upload_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'sharepoint', 'folder_sync'
    processing_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'error'
    extracted_text TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient document retrieval
CREATE INDEX idx_documents_project_category ON documents(solicitation_project_id, document_category);
CREATE INDEX idx_documents_latest_version ON documents(is_latest_version, document_category);
```

### Enhanced Past Performance
```sql
CREATE TABLE past_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name VARCHAR(200) NOT NULL,
    customer VARCHAR(100),
    customer_type VARCHAR(50), -- 'Federal', 'State', 'Local', 'Commercial'
    contract_number VARCHAR(100),
    contract_value DECIMAL,
    contract_type VARCHAR(50), -- 'Prime', 'Sub', 'Joint Venture'
    start_date DATE,
    end_date DATE,
    work_type VARCHAR(20), -- 'DME', 'O&M', 'Mixed'
    dme_percentage INTEGER, -- 0-100
    summary TEXT,
    technical_approach TEXT,
    technologies_used JSONB, -- array of technology tags
    domain_areas JSONB, -- array of domain/business areas
    key_personnel JSONB, -- array of {name, role} when relevant
    performance_metrics JSONB,
    lessons_learned TEXT,
    challenges_overcome TEXT,
    relevance_tags JSONB, -- user-defined relevance categories
    embedding vector(1536), -- OpenAI embedding dimension
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for vector search and filtering
CREATE INDEX idx_past_performance_embedding ON past_performance USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_past_performance_customer ON past_performance(customer, customer_type);
CREATE INDEX idx_past_performance_technologies ON past_performance USING gin(technologies_used);
```

### Document Chunks & Embeddings
```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    past_performance_id UUID REFERENCES past_performance(id) ON DELETE CASCADE,
    chunk_type VARCHAR(50), -- 'document_section', 'pp_project', 'pp_capability'
    chunk_index INTEGER, -- order within document
    content TEXT NOT NULL,
    section_title VARCHAR(200),
    page_number INTEGER,
    metadata JSONB,
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Constraint: chunk belongs to either document or past performance, not both
ALTER TABLE document_chunks ADD CONSTRAINT check_chunk_parent
    CHECK ((document_id IS NOT NULL) <> (past_performance_id IS NOT NULL));

CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_chunks_document ON document_chunks(document_id, chunk_type);
```

### Technology & Domain Mapping
```sql
CREATE TABLE technology_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    parent_category_id INTEGER REFERENCES technology_categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(100), -- user who created/last modified
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE technologies (
    id SERIAL PRIMARY KEY,
    technology_name VARCHAR(100) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES technology_categories(id),
    aliases JSONB, -- alternative names, abbreviations
    vendor VARCHAR(100), -- Microsoft, Salesforce, etc.
    technology_type VARCHAR(50), -- 'platform', 'language', 'framework', 'tool'
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0, -- tracks mentions across documents
    created_at TIMESTAMP DEFAULT NOW()
);

-- Many-to-many relationship for document-technology associations
CREATE TABLE document_technologies (
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    technology_id INTEGER REFERENCES technologies(id),
    confidence_score FLOAT, -- AI extraction confidence
    mention_count INTEGER DEFAULT 1,
    PRIMARY KEY (document_id, technology_id)
);
```

### User Feedback & Learning
```sql
CREATE TABLE search_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_query TEXT,
    search_type VARCHAR(50), -- 'past_performance', 'solicitation_qa', 'unified'
    result_document_id UUID REFERENCES documents(id),
    result_pp_id UUID REFERENCES past_performance(id),
    feedback_type VARCHAR(20), -- 'thumbs_up', 'thumbs_down', 'selected'
    feedback_reason TEXT, -- user explanation for negative feedback
    relevance_score FLOAT, -- user's relevance assessment
    search_context JSONB, -- filters, weights used in search
    user_id VARCHAR(100), -- future user identification
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE query_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitation_project_id UUID REFERENCES solicitation_projects(id),
    query_text TEXT NOT NULL,
    response_text TEXT,
    source_chunks JSONB, -- array of chunk IDs used in response
    confidence_score FLOAT,
    user_rating INTEGER, -- 1-5 stars
    user_feedback TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Data Processing Workflows

### Document Ingestion Pipeline
1. **Upload** → File validation and storage
2. **Parse** → Text extraction (PDF/Word/Excel)
3. **Chunk** → Section/paragraph-level segmentation
4. **Analyze** → Technology extraction and categorization
5. **Embed** → Vector generation for semantic search
6. **Index** → Database storage with metadata

### Past Performance Processing
1. **Dual Chunking:**
   - **Project-level:** Entire PP as single searchable unit
   - **Capability-level:** Extract specific technologies, approaches, outcomes
2. **Technology Mapping:** Auto-detect and map to standardized taxonomy
3. **Domain Classification:** Business area categorization
4. **Embedding Generation:** Separate vectors for different chunk types

### Version Management
- **Automatic versioning** for document updates
- **Change detection** between versions
- **Impact analysis** on existing embeddings and references

---

**Implementation Notes:**
- All embeddings use OpenAI text-embedding-ada-002 (1536 dimensions)
- Vector indexes use IVFFlat for balance of speed and accuracy
- JSONB fields provide flexibility for evolving metadata requirements
- Constraints ensure data integrity across complex relationships