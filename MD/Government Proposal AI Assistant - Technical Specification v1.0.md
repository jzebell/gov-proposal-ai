# Government Proposal AI Assistant - Technical Specification v1.0

## Executive Summary

A locally-deployed, AI-powered assistant for government proposal development that accelerates blue team solutioning and pink team writing while maintaining strict data security. The system leverages local LLMs with RAG capabilities to provide real-time framework recommendations, section drafting, and compliance verification.

## System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Web UI │────│  Node.js API    │────│   Ollama LLM    │
│   (Frontend)    │    │   (Backend)     │    │   (AI Engine)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────│  PostgreSQL +   │──────────────┘
                        │    pgvector     │
                        │   (Database)    │
                        └─────────────────┘
```

### Component Details

#### Frontend (React)
- **Real-time Interface:** WebSocket connections for streaming responses
- **Document Viewer:** PDF/Word document display with annotation
- **Section Editor:** Rich text editing with compliance highlighting
- **Dashboard:** Analytics, compliance status, and project overview
- **Responsive Design:** Optimized for desktop workflow

#### Backend (Node.js)
- **API Gateway:** RESTful endpoints for CRUD operations
- **WebSocket Server:** Real-time streaming for AI responses
- **Document Processor:** PDF/Word parsing and text extraction
- **RAG Engine:** Vector search and similarity matching
- **Compliance Engine:** Requirement extraction and verification
- **Model Router:** Dynamic LLM selection based on task requirements

#### Database (PostgreSQL + pgvector)
- **Structured Data:** Proposals, sections, frameworks, users
- **Vector Storage:** Document embeddings for semantic search
- **Audit Trail:** Change tracking and version history
- **Performance:** Optimized indexes and query patterns

#### AI Engine (Ollama)
- **Model Management:** Dynamic loading of 7B/14B parameter models
- **Streaming Interface:** Token-by-token response generation
- **Context Management:** Conversation history and document context
- **Fine-tuning Support:** Local model training capabilities

## Data Models

### Core Entities

#### Solicitation
```sql
CREATE TABLE solicitations (
    id UUID PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    agency VARCHAR(100),
    solicitation_number VARCHAR(50),
    due_date TIMESTAMP,
    document_path TEXT,
    parsed_content JSONB,
    requirements JSONB,
    conflicts JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Framework
```sql
CREATE TABLE frameworks (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    methodology TEXT,
    template_content TEXT,
    metadata JSONB,
    version INTEGER DEFAULT 1,
    parent_id UUID REFERENCES frameworks(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Proposal Section
```sql
CREATE TABLE proposal_sections (
    id UUID PRIMARY KEY,
    solicitation_id UUID REFERENCES solicitations(id),
    section_type VARCHAR(50),
    title VARCHAR(200),
    content TEXT,
    ai_confidence FLOAT,
    compliance_score FLOAT,
    human_reviewed BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Past Performance
```sql
CREATE TABLE past_performance (
    id UUID PRIMARY KEY,
    project_name VARCHAR(200),
    customer VARCHAR(100),
    contract_value DECIMAL,
    start_date DATE,
    end_date DATE,
    technologies JSONB,
    summary TEXT,
    metrics JSONB,
    lessons_learned TEXT,
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## API Specification

### Core Endpoints

#### Solicitation Analysis
```javascript
POST /api/solicitations/analyze
Content-Type: multipart/form-data

Request:
- file: PDF/Word document
- options: { extractRequirements: true, suggestFramework: true }

Response:
{
  "solicitation": {
    "id": "uuid",
    "title": "string",
    "requirements": [...],
    "conflicts": [...],
    "suggestedFramework": "string"
  }
}
```

#### Section Generation
```javascript
POST /api/sections/generate
Content-Type: application/json

Request:
{
  "solicitationId": "uuid",
  "sectionType": "technical_approach",
  "context": "string",
  "modelSize": "14B",
  "streaming": true
}

WebSocket Stream:
{
  "type": "token",
  "content": "string",
  "metadata": { "confidence": 0.85 }
}
```

#### Past Performance Search
```javascript
GET /api/past-performance/search
Query Parameters:
- query: string
- technologies: string[]
- dateRange: { start: date, end: date }
- limit: number

Response:
{
  "results": [
    {
      "id": "uuid",
      "relevanceScore": 0.92,
      "project": { ... },
      "matchedCriteria": [...]
    }
  ]
}
```

## Performance Requirements

### Response Time Targets
- **Document Analysis:** < 2 minutes for 50-page solicitation
- **Section Generation:** < 30 seconds for 3-4 paragraphs
- **Past Performance Search:** < 3 seconds for semantic queries
- **Compliance Check:** < 10 seconds for section analysis

### Resource Utilization
- **GPU Memory:** 75% maximum utilization (12GB of 16GB)
- **System RAM:** 60% maximum utilization (77GB of 128GB)
- **CPU Usage:** 80% average during AI operations
- **Storage I/O:** Optimized for SSD performance characteristics

### Scalability Targets
- **Concurrent Users:** 1 (initial), 10 (future)
- **Document Storage:** 10,000 documents
- **Vector Embeddings:** 1M+ chunks with sub-second search
- **Session Management:** 24-hour persistent sessions

## Security & Compliance

### Data Security
- **Local Storage:** All data remains on local hardware
- **Encryption:** AES-256 encryption for data at rest
- **Network Security:** HTTPS with self-signed certificates
- **Access Control:** Basic authentication, future RBAC support

### Audit & Compliance
- **Change Tracking:** Full audit trail for all modifications
- **Version Control:** Document and framework versioning
- **Backup Strategy:** Automated daily backups with retention
- **Data Integrity:** Checksums and validation for critical data

## Development Environment

### Containerization
```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: ./backend
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/propai
      - OLLAMA_URL=http://ollama:11434
    depends_on: [db, ollama]
    
  frontend:
    build: ./frontend
    ports: ["3001:3001"]
    environment:
      - REACT_APP_API_URL=http://localhost:3000
    
  db:
    image: pgvector/pgvector:pg15
    environment:
      - POSTGRES_DB=propai
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes: ["postgres_data:/var/lib/postgresql/data"]
    
  ollama:
    image: ollama/ollama:latest
    volumes: ["ollama_data:/root/.ollama"]
    ports: ["11434:11434"]
```

### CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with: { node-version: '18' }
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
      - name: Run integration tests
        run: npm run test:integration
      - name: Generate coverage report
        run: npm run test:coverage
      - name: Docker build and test
        run: docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### Testing Strategy
- **Unit Tests:** Jest for backend logic, React Testing Library for frontend
- **Integration Tests:** API endpoint testing with test database
- **E2E Tests:** Cypress for full workflow testing
- **Performance Tests:** Load testing for AI response times
- **Security Tests:** OWASP ZAP scanning, dependency vulnerability checks

## Deployment & Operations

### Local Deployment
```bash
# Quick start commands
git clone <repository>
cd gov-proposal-ai
docker-compose up -d
npm run setup:models  # Download and configure LLMs
npm run migrate:db    # Initialize database schema
npm run seed:demo     # Load sample data
```

### Monitoring & Observability
- **Application Monitoring:** Custom metrics for AI operations
- **Performance Monitoring:** Response time and resource usage tracking
- **Error Tracking:** Structured logging with error aggregation
- **Health Checks:** Automated system health verification

### Backup & Recovery
- **Database Backups:** Automated daily PostgreSQL dumps
- **Document Storage:** File system snapshots and replication
- **Model Backups:** LLM model and fine-tuning data preservation
- **Configuration Management:** Infrastructure as code versioning

## Migration & Scaling

### Single-User to Multi-User
- **Authentication System:** JWT-based authentication with RBAC
- **Session Management:** Redis for distributed session storage
- **Database Scaling:** Read replicas and connection pooling
- **Load Balancing:** Nginx reverse proxy for multiple instances

### Hardware Scaling Path
- **Current Configuration:** RTX 5060 Ti (16GB) → RTX 5090 (32GB)
- **Memory Expansion:** 128GB → 256GB for larger model support
- **Storage Scaling:** Additional NVMe drives for document growth
- **Compute Scaling:** Additional GPU cards for parallel processing

---

**Version:** 1.0  
**Document Owner:** System Architect  
**Last Updated:** September 17, 2025  
**Next Review:** October 1, 2025  
**Classification:** Internal Development Use