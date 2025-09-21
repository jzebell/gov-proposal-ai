# Epic 2: Past Performance Matching & RAG System - Overview

## Project Scope

Epic 2 transforms the Government Proposal AI Assistant into a comprehensive **Proposal Intelligence Platform** with three integrated modules:

1. **Past Performance Matcher** - Semantic search and relevance scoring for project history
2. **Solicitation Analyst** - NotebookLM-style Q&A with change tracking
3. **Document Repository** - Versioned storage with integration capabilities

## Business Objectives

### Primary Goals
- **Accelerate past performance selection** from hours to minutes
- **Provide instant answers** to proposal writer questions about solicitations
- **Track solicitation changes** and assess impact on proposal strategy
- **Create centralized knowledge base** for all proposal-related documents

### Success Metrics
- **Past Performance Matching:** 3 relevant suggestions per requirement in <3 seconds
- **Q&A Response Time:** <5 seconds for solicitation queries
- **Change Detection:** Automatic highlighting of amendments within 2 hours
- **User Adoption:** 75% of writers prefer system over manual search

## Technical Architecture

### Core Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Past Perf      │    │  Solicitation   │    │  Document       │
│  Matcher        │────│  Analyst        │────│  Repository     │
│  (Semantic)     │    │  (Q&A/RAG)      │    │  (Versioning)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Unified Search │
                    │  Interface      │
                    └─────────────────┘
```

### Implementation Phases

#### Phase 1: Past Performance Foundation (Week 1-2)
- **Data Model:** Extend PostgreSQL schema for PP, projects, and documents
- **Ingestion Pipeline:** Upload, parse, and chunk 10-12 initial PP examples
- **Semantic Search:** Vector embeddings with pgvector and relevance scoring
- **Basic UI:** Upload interface with auto-categorization

#### Phase 2: Solicitation Intelligence (Week 3-4)
- **Project Structure:** Multi-document solicitation management
- **Q&A System:** NotebookLM-style query interface with citations
- **Change Detection:** Version comparison and impact analysis
- **Advanced Search:** Unified interface with document type filtering

#### Phase 3: Integration & Analytics (Week 5-6)
- **SharePoint Stubs:** Authentication and URL configuration framework
- **User Feedback:** Thumbs up/down with learning pipeline
- **Technology Analytics:** Dynamic technology tables and trend analysis
- **Admin Interface:** Super user controls for categories and integrations

## Key Technical Decisions

### Chunking Strategy
- **Past Performance:** Dual-level (project-wide + capability-specific chunks)
- **Solicitations:** Section-level chunking for precise Q&A responses
- **Vector Storage:** Separate embedding spaces for different document types

### Search & Matching
- **Relevance Scoring:** User-configurable weights (technology, domain, contract size)
- **Fuzzy Matching:** Adjustable similarity thresholds with user control
- **Multi-document Queries:** Last-in-best-response with source differentiation

### Data Organization
- **Solicitation Projects:** Container for base doc + amendments + Q&As + attachments
- **Document Categories:** Extensible taxonomy with super user management
- **Technology Mapping:** Dynamic extraction with trend analysis capabilities

## Integration Requirements

### External Systems (Phase 3)
- **SharePoint:** Read-only access with user authentication
- **Network Folders:** File system monitoring for new documents
- **Future Integrations:** Extensible architecture for additional repositories

### Security & Access
- **Admin Interface:** Protected super user area for system configuration
- **Authentication:** Planned integration with enterprise identity systems
- **Data Residency:** All processing remains local with no external API calls

## User Experience Design

### Unified Search Interface
- **Radio Button Selection:** Past Performance vs Solicitation content
- **Progressive Disclosure:** Basic search → Advanced filters → Analytics
- **Context Preservation:** Search history and refinement capabilities

### Feedback & Learning
- **Batch Learning:** User selections improve relevance over time
- **Explanation Interface:** Hidden on-screen access to matching rationale
- **Continuous Improvement:** Feedback loops for system enhancement

---

**Next Documents:**
- [Data Models & Schema Design](./Epic-2-Data-Models.md)
- [Past Performance Requirements](./Epic-2-Past-Performance.md)
- [Solicitation Analysis Requirements](./Epic-2-Solicitation-Analysis.md)
- [UI/UX Requirements](./Epic-2-Interface-Design.md)