# Document Context Feeding System - Technical Specification

## Overview
Implementation of AI document context feeding system (RAG) that allows AI models to use project documents as context for content generation. This system provides both strict RAG mode (documents only) and augmented mode (documents + general knowledge).

## Status: ✅ Phase 1 Complete
**Epic**: Document Context Integration
**Priority**: High
**Dependencies**: Document reading functionality (✅ Complete)
**Completed**: 2024-09-24
**Implementation Time**: ~4 hours

---

## Core Requirements

### Context Scope & Behavior
- **All Active Documents**: Automatically include all active documents in current project as context
- **Archived Documents**: Only included for document comparison tasks (future epic)
- **Project-Specific**: Context switches when user switches projects
- **Always Active**: Context feeding always enabled when documents are available

### RAG Modes
1. **No Hallucinations Mode** (Pure RAG):
   - Model can ONLY use document content + user prompt
   - Persona system prompt still visible to model
   - High strictness for factual-only responses
   - Citations required for all information

2. **Augmented Mode** (Default):
   - Documents serve as reference material for creative prompts
   - Model prioritizes document content over general knowledge
   - Uses context to inform writing based on prompt
   - Blend of document facts + creative generation

---

## User Experience Design

### Context Indication
- **Context Size Display**: Show "(X tokens)" next to "Project Documents" header
- **Admin Configurable**: Token/word/character count display option
- **Real-time Updates**: Updates as documents added/removed
- **Model Limit Warnings**: Alert when approaching context limits

### Loading States
- **Context Building**: Show "(*spinner* reloading context...)" after Project Documents header
- **Background Processing**: Context builds after 10-second delay when document operations complete
- **Cancellation Logic**: Cancel and restart if new document uploaded during build

### Error Handling
- **Graceful Degradation**: Partial context → Previous context → Error
- **User Notification**: Warning above generated content when fallback used
- **Document Status**: Show which documents failed to load and why
- **Retry Logic**: 3 attempts before graceful failure

---

## Technical Implementation

### Context Caching Strategy
- **Storage**: JSON blob in database per project
- **Triggers**: Rebuild after 10-second delay following document/metadata changes
- **Invalidation**: When documents added/removed/modified or project metadata changes
- **Background Processing**: Non-blocking context building with progress indication

### Document Processing Pipeline

#### 1. Document Prioritization
**Priority Order** (Admin Configurable):
- Active status > Archived status
- Document type hierarchy (Solicitations > References > Past Performance)
- Metadata matching (agency, technology, period of performance)
- Recency (newer versions beat older versions)
- File size considerations for context limits

#### 2. Content Extraction & Chunking
**Hybrid Approach**:
1. **Logical Section Split**: Break by document structure (headings, sections)
2. **Semantic Classification**: Identify section types (technology, project management, staffing, etc.)
3. **Chunk Generation**: Preserve logical sections, apply semantic rules within sections
4. **Metadata Preservation**: Include section headers and document info for citations

**Admin Configurable**:
- Section type keywords/patterns
- Chunk priority weighting
- Section importance hierarchy

#### 3. Context Assembly
**Size Management**:
- **Dynamic Limits**: 70% context, 20% generation, 10% safety buffer
- **Model-Specific**: Admin configurable token limits per model
- **Overflow Handling**: Context Manager modal for document selection
- **Auto-Suggestions**: Recommend model changes or document exclusions

---

## Database Schema Changes

### Context Cache Table
```sql
-- New table for context caching
CREATE TABLE project_contexts (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  context_data JSONB NOT NULL, -- Contains processed chunks and metadata
  token_count INTEGER NOT NULL,
  document_count INTEGER NOT NULL,
  build_timestamp TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'building', -- building, complete, failed
  error_message TEXT,
  UNIQUE(project_id)
);
```

### Metadata Enhancements
**Project Metadata**: Extended metadata JSON field
```json
{
  "agency": "Department of Defense",
  "technology_areas": ["AI/ML", "Cloud Computing"],
  "period_of_performance": "2024-2027",
  "contract_type": "CPFF",
  "priority_keywords": ["cybersecurity", "data analytics"]
}
```

**Document Metadata**: Enhanced for past performance library
```json
{
  "agency": "DoD",
  "technology_match": ["AI/ML"],
  "performance_period": "2020-2023",
  "contract_value": "$2.5M",
  "similarity_score": 0.85
}
```

---

## Admin Configuration System

### Context Management Settings
**Location**: New "Context Management" section in Global Settings

#### Document Priority Rules
- **Document Type Hierarchy**: Drag-and-drop ordering interface
- **Metadata Weight Sliders**: Agency match, technology match, recency, etc.
- **Section Classification**: Configure keywords for section type identification
- **Chunk Priority**: Weight different section types (exec summary, requirements, etc.)

#### Model & Performance Settings
- **Token Limits**: Configurable per model with fallback defaults
- **Context Percentages**: Adjustable 70/20/10 split
- **Display Preferences**: Token/word/character count selection
- **RAG Strictness**: Slider for "No Hallucinations" mode enforcement

#### Error Handling
- **Retry Attempts**: Configurable retry count (default: 3)
- **Fallback Behavior**: Partial/previous/error priority
- **Warning Thresholds**: When to alert users about context size

---

## Citation System

### Citation Format
**Detailed Format**: `[Source: filename, section/page]`
- **Hyperlinks**: Click to open document in reading pane
- **Fallback**: If not linkable, open document in pane
- **Smart Detection**: Use document structure to determine sections

### Implementation Notes
- Preserve document structure during chunking for accurate citations
- Track chunk source metadata for precise referencing
- 80/20 rule: Focus on common formats (PDF, DOCX), basic support for TXT

---

## Future Roadmap Integration

### Template-Based Generation (Future Epic)
- **Document Structure Preservation**: Maintain headers, bullets, formatting
- **Section-Based Prompts**: "Fill this section with draft content"
- **Bullet Point Expansion**: AI completes work from bullet ideas

### Past Performance Library
- **Separate Repository**: Link to external past performance database
- **For Now**: Create internal past performance document library
- **Metadata Rich**: Enhanced filtering and matching capabilities

### ML-Based Enhancements
- **Semantic Section Classification**: Replace keyword matching
- **Document Similarity**: Better version detection and prioritization
- **Content Quality Scoring**: Prioritize higher-quality source material

---

## Implementation Phases

### Phase 1: Core Context System ✅ COMPLETED
- [x] Context caching infrastructure
- [x] Document processing pipeline with text extraction
- [x] Priority rules (active > archived, document type hierarchy, metadata scoring, recency)
- [x] Context size display UI with real-time updates
- [x] Error handling and graceful fallbacks
- [x] RAG mode integration (pure RAG + augmented modes)

### Phase 2: Admin Configuration 🟡 IN PROGRESS
- [x] Phase 2 technical specification and documentation
- [ ] Admin settings interface
- [ ] Configurable priority rules
- [ ] Model token limit management
- [ ] RAG strictness controls

### Phase 3: Advanced Features
- [ ] Context overflow management modal
- [ ] Enhanced citation system with hyperlinking
- [ ] Semantic section classification (keyword-based)
- [ ] Performance monitoring and analytics

### Phase 4: Future Enhancements
- [ ] ML-based section classification
- [ ] Past performance library integration
- [ ] Template-based content generation
- [ ] Advanced document comparison features

---

## Success Criteria

### Functional Requirements
- ✅ All active project documents automatically included in AI context
- ✅ RAG mode works with citations and document-only responses
- ✅ Augmented mode blends documents with creative generation
- ✅ Context persists across sessions, rebuilds when documents change
- ✅ Graceful handling of context size limits and extraction errors

### Performance Requirements
- Context building completes within 30 seconds for typical projects (50-100 documents)
- Context switching between projects < 5 seconds
- No blocking of user interface during context operations
- Memory usage remains reasonable for large document sets

### User Experience Requirements
- Clear indication of context status and size
- Transparent error messaging when documents fail to process
- Intuitive admin controls for tweaking context behavior
- Seamless integration with existing AI writing workflow

---

## Technical Notes

### Dependencies
- Existing document extraction system (PDF, DOCX, TXT support)
- AIWritingService integration
- Database schema updates
- Admin settings infrastructure

### Risks & Mitigations
- **Large Context Sizes**: Implement chunking and prioritization
- **Processing Time**: Background building with progress indication
- **Memory Usage**: Efficient storage and retrieval patterns
- **Model Limits**: Dynamic sizing and overflow management

---

**Last Updated**: 2024-09-24
**Next Review**: After Phase 1 implementation
**Document Owner**: AI Writing System Epic