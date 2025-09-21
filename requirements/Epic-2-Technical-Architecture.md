# Epic 2: Technical Architecture & Implementation Plan

## System Architecture Overview

### Extended Service Architecture
```
Frontend Layer (React)
├── Search Interface Components
├── Document Management Components
├── Past Performance Components
└── Q&A Conversation Components

Backend Layer (Node.js/Express)
├── Document Processing Service
├── Search & Ranking Service
├── Past Performance Service
├── Q&A Service
└── Integration Service

Data Layer
├── PostgreSQL + pgvector (Primary)
├── File Storage (Local/Mounted)
└── Cache Layer (Redis - Future)

AI/ML Layer
├── Ollama (Local LLM)
├── Embedding Generation
├── Text Processing Pipeline
└── Search Ranking Algorithms
```

## Implementation Phases

### Phase 1: Past Performance Foundation (Week 1-2)

#### Database Schema Implementation
```sql
-- Execute schema extensions from Epic-2-Data-Models.md
-- Priority order:
1. solicitation_projects table
2. documents table with categories
3. past_performance table (enhanced)
4. document_chunks table
5. technology_categories and technologies tables
```

#### Backend Services
- **Document Upload Service:** Multi-format processing pipeline
- **Past Performance Service:** CRUD operations with validation
- **Search Service:** Vector similarity search with ranking
- **Technology Extraction Service:** AI-powered technology detection

#### Frontend Components
- **Upload Interface:** Drag-and-drop with progress tracking
- **Past Performance Library:** Grid/list views with filtering
- **Search Interface:** Unified search bar with result display
- **Comparison Tool:** Side-by-side PP comparison

### Phase 2: Solicitation Intelligence (Week 3-4)

#### Project Management System
- **Project Creation:** Solicitation project containers
- **Document Association:** Link documents to projects
- **Version Tracking:** Change detection and comparison
- **Metadata Management:** Project-level information storage

#### Q&A System Implementation
- **Query Processing:** Natural language understanding
- **Context Management:** Multi-document search and retrieval
- **Response Generation:** Citation-aware answer generation
- **Conversation Persistence:** Session and history management

#### Change Detection Engine
- **Text Comparison:** Document diff algorithms
- **Impact Analysis:** Requirement change assessment
- **Notification System:** Alert generation for significant changes
- **Visualization:** Change highlighting and summary generation

### Phase 3: Integration & Analytics (Week 5-6)

#### External Integration Framework
- **SharePoint Connector:** Authentication and document retrieval
- **Folder Monitoring:** File system change detection
- **API Framework:** Extensible integration architecture
- **Admin Interface:** Configuration and management tools

#### Learning & Analytics
- **Feedback Collection:** User interaction tracking
- **Performance Analytics:** Search and usage metrics
- **Technology Trending:** Dynamic technology detection and mapping
- **Recommendation Engine:** Improved matching based on usage patterns

## Technical Specifications

### Database Design Decisions

#### Vector Storage Strategy
```sql
-- Separate embedding spaces for different content types
CREATE INDEX idx_pp_project_embeddings ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WHERE chunk_type = 'pp_project';

CREATE INDEX idx_pp_capability_embeddings ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WHERE chunk_type = 'pp_capability';

CREATE INDEX idx_solicitation_embeddings ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WHERE chunk_type = 'document_section';
```

#### Performance Optimization
- **Partial Indexes:** Separate indexes for active vs archived content
- **Query Optimization:** Prepared statements for common search patterns
- **Connection Pooling:** Efficient database connection management
- **Caching Strategy:** Redis for frequently accessed metadata

### AI Model Integration

#### Embedding Generation Pipeline
```javascript
// Dual embedding strategy for past performance
const generatePPEmbeddings = async (pastPerformance) => {
  // Project-level embedding (full document)
  const projectEmbedding = await ollama.embed({
    model: 'text-embedding-ada-002',
    input: pastPerformance.fullText
  });

  // Capability-level embeddings (extracted sections)
  const capabilities = extractCapabilities(pastPerformance);
  const capabilityEmbeddings = await Promise.all(
    capabilities.map(cap => ollama.embed({
      model: 'text-embedding-ada-002',
      input: cap.text
    }))
  );

  return { projectEmbedding, capabilityEmbeddings };
};
```

#### Search Ranking Algorithm
```javascript
const calculateRelevanceScore = (query, pastPerformance, weights) => {
  const scores = {
    technology: calculateTechnologyMatch(query.technologies, pastPerformance.technologies),
    domain: calculateDomainMatch(query.domain, pastPerformance.domainAreas),
    contractSize: calculateSizeMatch(query.estimatedValue, pastPerformance.contractValue),
    customerType: calculateCustomerMatch(query.customerType, pastPerformance.customerType),
    semantic: calculateSemanticSimilarity(query.embedding, pastPerformance.embedding)
  };

  return (scores.technology * weights.technology) +
         (scores.domain * weights.domain) +
         (scores.contractSize * weights.contractSize) +
         (scores.customerType * weights.customerType) +
         (scores.semantic * weights.semantic);
};
```

### Document Processing Pipeline

#### Multi-format Processing
```javascript
const processDocument = async (file, projectId, category) => {
  // 1. File validation and storage
  const validation = await validateFile(file);
  if (!validation.isValid) throw new Error(validation.error);

  // 2. Text extraction based on format
  const textContent = await extractText(file);

  // 3. Document categorization and metadata
  const metadata = await extractMetadata(textContent, category);

  // 4. Chunking strategy based on document type
  const chunks = await createChunks(textContent, category);

  // 5. Technology and entity extraction
  const technologies = await extractTechnologies(textContent);

  // 6. Embedding generation
  const embeddings = await generateEmbeddings(chunks);

  // 7. Database storage
  return await storeDocument({
    projectId, file, textContent, metadata,
    chunks, technologies, embeddings
  });
};
```

#### Change Detection Algorithm
```javascript
const detectChanges = async (originalDoc, newDoc) => {
  // Text-level comparison
  const textDiff = diffWords(originalDoc.content, newDoc.content);

  // Semantic section mapping
  const sectionMapping = await mapSections(
    originalDoc.sections,
    newDoc.sections
  );

  // Requirement extraction and comparison
  const reqChanges = await compareRequirements(
    originalDoc.requirements,
    newDoc.requirements
  );

  // Impact assessment
  const impact = await assessImpact(textDiff, sectionMapping, reqChanges);

  return {
    textChanges: textDiff,
    sectionChanges: sectionMapping,
    requirementChanges: reqChanges,
    impactAssessment: impact
  };
};
```

## API Design

### RESTful Endpoints

#### Past Performance Management
```javascript
// Past Performance Operations
POST   /api/past-performance          // Upload new PP
GET    /api/past-performance          // List with filtering
GET    /api/past-performance/:id      // Get specific PP
PUT    /api/past-performance/:id      // Update PP
DELETE /api/past-performance/:id      // Delete PP

// Search Operations
POST   /api/search/past-performance   // Semantic search
POST   /api/search/compare            // Compare multiple PPs
POST   /api/search/feedback           // Submit search feedback
```

#### Solicitation Project Management
```javascript
// Project Operations
POST   /api/projects                  // Create project
GET    /api/projects                  // List projects
GET    /api/projects/:id              // Get project details
PUT    /api/projects/:id              // Update project
DELETE /api/projects/:id              // Delete project

// Document Operations
POST   /api/projects/:id/documents    // Upload document
GET    /api/projects/:id/documents    // List project documents
PUT    /api/documents/:id             // Update document metadata
POST   /api/documents/:id/compare     // Compare versions
```

#### Q&A System
```javascript
// Query Operations
POST   /api/projects/:id/query        // Ask question
GET    /api/projects/:id/conversations // Get conversation history
POST   /api/conversations/:id/feedback // Provide feedback
```

### WebSocket Integration

#### Real-time Processing Updates
```javascript
// Document processing status
socket.on('document:processing', (status) => {
  updateProgressBar(status.progress);
  displayCurrentStep(status.step);
});

// Search result streaming
socket.on('search:results', (results) => {
  appendSearchResults(results);
  updateRelevanceScores(results.relevanceScores);
});

// Q&A response streaming
socket.on('qa:response', (chunk) => {
  appendResponseChunk(chunk.content);
  updateCitations(chunk.sources);
});
```

## Security & Performance

### Security Considerations
- **Input Validation:** Comprehensive file and query validation
- **SQL Injection Prevention:** Parameterized queries and ORM usage
- **File Upload Security:** Virus scanning and content type validation
- **Access Control:** Role-based permissions for admin functions
- **Data Encryption:** AES-256 for sensitive data at rest

### Performance Optimization
- **Database Indexing:** Optimized indexes for search patterns
- **Caching Strategy:** Redis for frequently accessed data
- **Async Processing:** Background jobs for heavy operations
- **Connection Pooling:** Efficient database connection management
- **CDN Integration:** Static asset optimization (future)

### Monitoring & Observability
- **Performance Metrics:** Response times, throughput, error rates
- **Business Metrics:** Search success rates, user satisfaction
- **System Health:** Resource utilization, service availability
- **User Analytics:** Feature usage, workflow patterns

---

**Development Environment Setup:**
1. **Database Migration:** Execute Epic 2 schema changes
2. **Service Dependencies:** Update Docker Compose for new services
3. **Environment Variables:** Add configuration for new features
4. **Testing Framework:** Unit and integration test setup
5. **Documentation:** API documentation and developer guides