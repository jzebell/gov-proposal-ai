# Epic 2: Past Performance Matching Requirements

## Functional Requirements

### F-PP-001: Document Upload & Processing
**Priority:** P0
**Description:** System shall process and index past performance documents for semantic search

#### Acceptance Criteria
- Support file formats: PDF, Word (.docx), Excel (.xlsx), plain text
- Handle documents 1-3 pages in length
- Extract text content with 95% accuracy
- Auto-detect document structure (narrative vs tabular)
- Process 10-12 initial past performance examples
- Validate extracted content before storage

#### Technical Specifications
- **File size limit:** 25MB per document
- **Processing time:** <30 seconds per document
- **Supported formats:** PDF 1.4+, DOCX, XLSX, TXT
- **Text extraction:** Use existing document parsing pipeline
- **Error handling:** Graceful degradation with manual review option

### F-PP-002: Dual-Level Chunking Strategy
**Priority:** P0
**Description:** Generate both project-level and capability-level chunks for flexible matching

#### Acceptance Criteria
- **Project-level chunks:** Entire past performance as single searchable unit
- **Capability-level chunks:** Extract specific technologies, methodologies, outcomes
- Maintain relationships between chunk levels
- Generate separate embeddings for each chunk type
- Enable querying at both granularity levels

#### Chunking Rules
- **Project chunks:** Full document (1 chunk per PP)
- **Capability chunks:** Technology mentions, approach descriptions, outcome sections
- **Minimum chunk size:** 50 words
- **Maximum chunk size:** 500 words
- **Overlap:** 25 words between adjacent capability chunks

### F-PP-003: Technology Extraction & Mapping
**Priority:** P1
**Description:** Automatically identify and categorize technologies mentioned in past performance

#### Acceptance Criteria
- Extract technology names with confidence scores
- Map to standardized technology taxonomy
- Handle aliases and abbreviations (Salesforce = SFDC)
- Categorize by type: Platform, Language, Framework, Tool
- Support manual review and correction
- Build dynamic technology database

#### Technology Categories
```
Platforms: Salesforce, Pega, Appian, ServiceNow, SharePoint
Languages: Java, Python, C#, JavaScript, SQL
Frameworks: React, Angular, .NET, Spring, Django
Tools: Jenkins, Docker, Kubernetes, Git, JIRA
Databases: PostgreSQL, Oracle, SQL Server, MongoDB
Cloud: AWS, Azure, GCP, Cloud Foundry
```

### F-PP-004: Semantic Search & Ranking
**Priority:** P0
**Description:** Provide relevant past performance matches based on solicitation requirements

#### Acceptance Criteria
- Return up to 3 primary matches per query
- Provide 3 additional "related" suggestions
- Include relevance scores (0.0-1.0)
- Support both exact and fuzzy matching
- Allow user-adjustable similarity thresholds
- Response time <3 seconds

#### Ranking Algorithm
```
Relevance Score = (Technology_Match * W1) +
                  (Domain_Match * W2) +
                  (Contract_Size_Match * W3) +
                  (Customer_Type_Match * W4)

Default Weights: W1=0.4, W2=0.3, W3=0.2, W4=0.1
User-configurable weights via interface
```

### F-PP-005: Advanced Filtering & Search
**Priority:** P1
**Description:** Enable sophisticated filtering of past performance results

#### Filter Categories
- **Contract Type:** Prime, Subcontractor, Joint Venture
- **Customer Type:** Federal, State, Local, Commercial
- **Work Type:** DME, O&M, Mixed (with percentage ranges)
- **Contract Value:** <$1M, $1M-$10M, $10M-$100M, >$100M
- **Time Period:** Last 1 year, 2 years, 5 years, All time
- **Technology Stack:** Multi-select from detected technologies
- **Domain Area:** Financial Services, Healthcare, Defense, Civilian, etc.

#### Search Interface
- **Quick Search:** Simple text input with auto-suggestions
- **Advanced Search:** Multi-criteria filtering with saved searches
- **Faceted Search:** Progressive refinement based on result metadata
- **Search History:** Recently used queries and filters

### F-PP-006: Comparison & Selection Tools
**Priority:** P1
**Description:** Help users compare and select optimal past performance examples

#### Comparison Matrix
| Criterion | PP Option 1 | PP Option 2 | PP Option 3 |
|-----------|-------------|-------------|-------------|
| Technology Match | 85% | 70% | 90% |
| Domain Relevance | 90% | 95% | 75% |
| Contract Size | Similar | Larger | Smaller |
| Recency | 2 years | 6 months | 3 years |
| Customer Type | Federal | Federal | State |

#### Selection Features
- Side-by-side comparison of up to 3 past performances
- Strength/weakness analysis per criterion
- Export comparison matrix to Word/PDF
- Save comparison sessions for later review
- Citation tracking for selected past performances

### F-PP-007: User Feedback & Learning
**Priority:** P1
**Description:** Collect user feedback to improve matching accuracy over time

#### Feedback Mechanisms
- **Thumbs Up/Down:** Quick relevance feedback
- **Detailed Feedback:** Required explanation for negative ratings
- **Selection Tracking:** Record which PPs were actually used
- **Relevance Scoring:** User rates relevance 1-5 stars
- **Miss Reporting:** Flag when relevant PP wasn't suggested

#### Learning Pipeline
- **Batch Processing:** Weekly analysis of feedback patterns
- **Weight Adjustment:** Modify ranking weights based on successful selections
- **Technology Mapping:** Improve synonym detection from user corrections
- **Query Expansion:** Learn effective search terms from user refinements

## Non-Functional Requirements

### NFR-PP-001: Performance
- **Search Response Time:** <3 seconds for semantic queries
- **Upload Processing:** <30 seconds per document
- **Concurrent Users:** Support 3 simultaneous users
- **Database Growth:** Handle 1000+ past performance documents

### NFR-PP-002: Accuracy
- **Text Extraction:** 95% accuracy from source documents
- **Technology Detection:** 90% precision, 85% recall
- **Relevance Ranking:** 80% user satisfaction with top 3 results

### NFR-PP-003: Usability
- **Upload Interface:** Drag-and-drop with progress indicators
- **Search Interface:** Response time indicators and result counts
- **Error Messages:** Clear, actionable feedback for processing failures
- **Mobile Responsiveness:** Basic functionality on tablet devices

## Integration Points

### Document Processing Pipeline
- Leverage existing PDF/Word parsing from Epic 1
- Extend text extraction for Excel files (tabular data)
- Integrate with document versioning system
- Connect to technology taxonomy management

### Database Integration
- Extend PostgreSQL schema with new tables
- Utilize existing pgvector setup for embeddings
- Implement proper foreign key relationships
- Add necessary indexes for performance

### AI Model Integration
- Use existing Ollama setup for embedding generation
- Implement chunking strategy compatible with model context limits
- Design prompt templates for technology extraction
- Plan for model switching based on task requirements

---

**Testing Strategy:**
- **Unit Tests:** Individual component functionality
- **Integration Tests:** End-to-end upload and search workflows
- **Performance Tests:** Load testing with concurrent searches
- **User Acceptance Tests:** Real-world scenarios with actual past performance documents