# System Architecture Overview

**Document**: ARCHITECTURE.md
**Last Updated**: 2025-09-26
**Version**: 2.1.1
**Status**: Production Ready

## Executive Summary

Government Proposal AI is a production-ready, locally-deployed AI assistant for federal proposal development. The system transforms government procurement workflows through intelligent solicitation analysis, AI-powered writing assistance, compliance management, and advanced document processing.

## High-Level System Design

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Web UI │────│  Node.js API    │────│   Ollama LLM    │
│   (Frontend)    │    │   (Backend)     │    │   (AI Engine)   │
│  - Three-Panel  │    │ - AI Service    │    │ - Model Mgmt    │
│  - User Prefs   │    │ - Doc Service   │    │ - Inference     │
│  - Admin UI     │    │ - Auth Service  │    │ - Streaming     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────│  PostgreSQL +   │──────────────┘
                        │    pgvector     │
                        │   (Database)    │
                        │ - Documents     │
                        │ - Users         │
                        │ - ML Models     │
                        └─────────────────┘
```

## Major Components

### Frontend (React)
- **Three-Panel AI Writing Interface**: Resizable reading pane, writing interface, project info
- **User Preferences System**: 10 color palettes, 10 background patterns
- **Administrative Settings**: Document type management, system configuration
- **Project Management**: Real-time project display, sorting, due date management
- **Responsive Design**: Mobile-first approach with adaptive layouts

### Backend (Node.js/Express)
- **AIWritingService**: Ollama integration, persona-based writing, no-hallucinations mode
- **DocumentManagerService**: Multi-format processing, content extraction, metadata management
- **AuthService**: User authentication, session management, preferences persistence
- **ContextService**: Advanced context management with ML-powered relevance scoring
- **ComplianceService**: Requirement tracking, gap analysis, scoring system
- **MLRelevanceService**: Machine learning-powered document relevance and selection

### Database (PostgreSQL + pgvector)
- **Document Storage**: Projects, documents, metadata, versions
- **User Management**: Authentication, preferences, sessions
- **Vector Search**: Document embeddings for semantic search
- **ML Training Data**: User feedback, relevance scores, model training data

### AI Engine (Ollama)
- **Model Management**: Qwen 2.5 14B, dynamic model loading
- **Persona System**: Technical Writer, Proposal Manager, Compliance Specialist
- **Streaming Interface**: Real-time token generation via WebSocket
- **Performance**: 39.9 tokens/sec generation, 13s warm start

## Data Flow Architecture

### Document Processing Pipeline
1. **Upload** → Multi-format validation (PDF, DOCX, TXT)
2. **Extract** → Content extraction and metadata generation
3. **Index** → Vector embedding generation for search
4. **Store** → PostgreSQL with file system references
5. **Serve** → Real-time content delivery to frontend

### AI Generation Pipeline
1. **Context Building** → Project documents + user preferences
2. **Model Selection** → Dynamic Ollama model availability check
3. **Persona Application** → Specialized system prompts
4. **Generation** → Streaming AI response with citation tracking
5. **Validation** → No-hallucinations mode enforcement

### User Interaction Flow
1. **Authentication** → Session establishment and preference loading
2. **Project Selection** → Dynamic project and document loading
3. **Content Creation** → AI-assisted writing with real-time streaming
4. **Document Management** → Upload, organization, version control
5. **Compliance Tracking** → Automated requirement verification

## System Boundaries

### Core System
- **Frontend Application**: React SPA with advanced UI components
- **Backend API**: RESTful services with WebSocket streaming
- **Database Layer**: PostgreSQL with vector search capabilities
- **AI Integration**: Local Ollama deployment with model management

### External Integrations
- **File System**: Document storage and retrieval
- **Container Runtime**: Docker Compose orchestration
- **Local LLM**: Ollama with GPU acceleration
- **Browser APIs**: File upload, local storage, WebSocket

## Performance Characteristics

### Current Benchmarks
- **AI Response Time**: 8-15s for complex generation tasks
- **Document Upload**: <5s for files up to 50MB
- **Content Serving**: <2s for document content loading
- **API Response Time**: <500ms for standard endpoints
- **Concurrent Users**: Tested up to 10 simultaneous users

### Scalability Targets
- **User Capacity**: 1 (current) → 10+ (planned)
- **Document Storage**: 10,000+ documents supported
- **Vector Search**: Sub-second semantic search performance
- **AI Throughput**: 39.9 tokens/sec sustained generation

## Security Architecture

### Data Security
- **Local Deployment**: 100% on-premises data processing
- **Input Validation**: Comprehensive server-side validation
- **File Upload Security**: Type checking, size limits, malware scanning
- **SQL Injection Prevention**: Parameterized queries throughout

### Authentication & Authorization
- **Session Management**: Secure user session handling
- **User Preferences**: Encrypted preference storage
- **Role-Based Access**: Foundation for multi-user features
- **API Security**: Rate limiting and request validation

## Integration Patterns

### Microservices Architecture
- **Service Separation**: Clear boundaries between AI, Document, Auth services
- **API Gateway Pattern**: Centralized routing and validation
- **Event-Driven Communication**: WebSocket for real-time features
- **Database Per Service**: Logical separation with shared PostgreSQL

### AI Integration Pattern
- **Adapter Pattern**: Ollama integration with fallback capabilities
- **Strategy Pattern**: Multiple AI models and personas
- **Streaming Pattern**: Real-time response generation
- **Circuit Breaker**: AI service failure handling

## Technology Stack

### Core Technologies
- **Frontend**: React 18, WebSocket, CSS-in-JS
- **Backend**: Node.js 18, Express.js, WebSocket
- **Database**: PostgreSQL 15, pgvector extension
- **AI Engine**: Ollama, Qwen 2.5 14B model
- **Infrastructure**: Docker Compose, NGINX (planned)

### Development Tools
- **Package Management**: npm workspaces
- **Testing**: Jest, Supertest, Cypress (planned)
- **Linting**: ESLint, Prettier
- **Deployment**: Docker multi-stage builds

## Deployment Architecture

### Containerized Services
```
docker-compose.yml
├── frontend (React)     → Port 3001
├── backend (Node.js)    → Port 3000
├── database (PostgreSQL) → Port 5432
└── ollama (AI Engine)   → Port 11434
```

### Environment Configuration
- **Development**: Hot reload, debug logging, local file storage
- **Production**: Optimized builds, error logging, persistent volumes
- **Testing**: Isolated containers, test databases, mock services

## Future Architecture Considerations

### Scalability Enhancements
- **Load Balancing**: Multiple backend instances
- **Caching Layer**: Redis for session and document caching
- **Database Sharding**: Large-scale document storage
- **CDN Integration**: Static asset delivery optimization

### Enterprise Features
- **Multi-tenant Architecture**: User isolation and data segregation
- **Advanced Security**: OAuth2, SAML, enterprise SSO
- **Audit Logging**: Comprehensive action tracking
- **API Management**: Rate limiting, quota management, analytics

### AI Capabilities
- **Model Fine-tuning**: Custom model training pipeline
- **Multi-modal AI**: Image and document processing
- **Advanced RAG**: Semantic chunking, query rewriting
- **AI Orchestration**: Multi-agent workflows

## Architectural Decision Records

See `/docs/adr/` for detailed architectural decisions including:
- 2025-09-26: Documentation restructuring and architectural standards
- 2025-09-25: ML-powered intelligence integration (Phase 4.1)
- 2025-09-24: Full backend integration architecture (v2.1.1)
- 2025-09-22: Three-panel UI architecture and AI streaming

## Change Management

### Documentation Standards
- **Living Document**: Architecture updated with each major release
- **Version Control**: Git-tracked changes with clear commit messages
- **Review Process**: Architectural changes require documentation updates
- **Handoff Ready**: Complete context for future development teams

---

**Next Review**: After Phase 4.2 implementation or major architectural changes
**Contact**: Development team for questions or architectural discussions
**Related**: See `/docs/adr/` for specific architectural decisions