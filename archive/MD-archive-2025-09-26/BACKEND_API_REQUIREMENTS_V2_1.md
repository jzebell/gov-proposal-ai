# Backend API Requirements for v2.1 Enhancements

## Overview

The AI Writing Assistant v2.1 enhancements require several backend API endpoints to be implemented for full functionality. Currently, the frontend gracefully degrades when these APIs are unavailable.

## 🔗 Required API Endpoints

### 1. AI Models Endpoint

**Endpoint**: `GET /api/ai-writing/models`

**Purpose**: Return list of available AI models for user selection

**Expected Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "id": "qwen2.5:14b",
      "name": "Qwen 2.5 14B",
      "provider": "Ollama"
    },
    {
      "id": "llama3.1:8b",
      "name": "Llama 3.1 8B",
      "provider": "Ollama"
    }
  ]
}
```

**Current Frontend Behavior**:
- Calls endpoint on component mount
- Falls back to local models if API unavailable:
  ```javascript
  const fallbackModels = [
    { id: 'local-model-1', name: 'Local Model 1', provider: 'Local' },
    { id: 'local-model-2', name: 'Local Model 2', provider: 'Local' },
    { id: 'local-model-3', name: 'Local Model 3', provider: 'Local' }
  ];
  ```

### 2. Document Content Endpoint

**Endpoint**: `GET /api/documents/content/{documentType}/{projectTitle}/{documentName}`

**Purpose**: Return text content of specific document for reading pane display

**Parameters**:
- `documentType`: Type of document (e.g., "RFP", "SOW", "PWS", "RFI")
- `projectTitle`: Project title (URL encoded)
- `documentName`: Document filename (URL encoded)

**Expected Response Format**:
```json
{
  "success": true,
  "content": "Full text content of the document...",
  "metadata": {
    "filename": "example.pdf",
    "pages": 25,
    "size": 1024000,
    "lastModified": "2025-09-22T10:30:00Z"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Document not found",
  "error": "FILE_NOT_FOUND"
}
```

**Current Frontend Behavior**:
- Called when user clicks on document in document list
- Displays loading state while fetching
- Shows error message if document unavailable
- Currently logs "Document content API not available" if 404

### 3. Enhanced Generate Endpoint

**Endpoint**: `POST /api/ai-writing/generate`

**Purpose**: Generate AI content with enhanced parameters including model selection and hallucination control

**Request Format**:
```json
{
  "prompt": "Write an executive summary for this RFP response",
  "model": "qwen2.5:14b",
  "noHallucinations": true,
  "projectContext": {
    "title": "AI Writing Test Project",
    "documentType": "RFP",
    "documents": [
      {
        "name": "rfp_document.pdf",
        "type": "pdf",
        "size": 1024000
      }
    ]
  }
}
```

**Enhanced Parameters**:
- `model`: Selected AI model ID
- `noHallucinations`: Boolean flag for citation-only responses
- `projectContext`: Complete project information for context

**Expected Response Format**:
```json
{
  "success": true,
  "data": {
    "content": "Generated content here...",
    "model": "qwen2.5:14b",
    "tokens": 150,
    "citations": [
      {
        "source": "rfp_document.pdf",
        "page": 5,
        "text": "Referenced text from source"
      }
    ]
  }
}
```

## 🔄 Current API Integrations

### Document List (Existing)
**Endpoint**: `GET /api/documents/list/{documentType}/{projectTitle}`
- **Status**: Currently returns 404
- **Frontend Handling**: Graceful degradation with empty document list
- **Logging**: "Document list API not available yet, using empty document list"

### AI Health Check (Existing)
**Endpoint**: `GET /api/ai-writing/health`
- **Status**: May or may not be implemented
- **Purpose**: Check if AI services are available
- **Frontend Usage**: Displays AI status indicator

## 🛠️ Implementation Priorities

### High Priority
1. **AI Models Endpoint** - Required for model selection functionality
2. **Enhanced Generate Endpoint** - Core AI functionality with new parameters

### Medium Priority
3. **Document Content Endpoint** - Enhances user experience with reading pane
4. **Document List Endpoint** - Currently returning 404

### Low Priority
5. **AI Health Endpoint** - Nice-to-have for status indicators

## 📋 Frontend State Management

### New State Variables Added
```javascript
const [noHallucinations, setNoHallucinations] = useState(false);
const [selectedModel, setSelectedModel] = useState('');
const [availableModels, setAvailableModels] = useState([]);
const [selectedDocumentContent, setSelectedDocumentContent] = useState(null);
const [loadingDocumentContent, setLoadingDocumentContent] = useState(false);
```

### API Call Examples

**Loading Models**:
```javascript
const loadAvailableModels = async () => {
  try {
    const response = await fetch(`${apiUrl}/api/ai-writing/models`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setAvailableModels(data.data);
        setSelectedModel(data.data[0].id);
      }
    }
  } catch (error) {
    // Falls back to local models
    setAvailableModels(fallbackModels);
    setSelectedModel(fallbackModels[0].id);
  }
};
```

**Generating Content**:
```javascript
const generateContent = async () => {
  const response = await fetch(`${apiUrl}/api/ai-writing/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt,
      model: selectedModel,
      noHallucinations: noHallucinations,
      projectContext: selectedProject ? {
        title: selectedProject.title,
        documentType: selectedProject.documentType,
        documents: projectDocuments
      } : null
    })
  });
};
```

## 🔐 Security Considerations

### Local-Only Operation
- **No External APIs**: All model communication must remain local
- **Data Privacy**: No document content should leave local infrastructure
- **Model Verification**: Ensure only local Ollama models are accessible

### Input Validation
- **Document Names**: Validate and sanitize file names to prevent path traversal
- **Project Titles**: Validate project names for security
- **Model IDs**: Whitelist allowed model identifiers

## 🧪 Testing Requirements

### API Testing
1. **Model Endpoint**: Verify returns valid model list
2. **Content Endpoint**: Test with various document types and names
3. **Generate Endpoint**: Test with all parameter combinations
4. **Error Handling**: Verify proper error responses for invalid requests

### Integration Testing
1. **Frontend Graceful Degradation**: Ensure app works without APIs
2. **Error States**: Test all error scenarios
3. **Performance**: Verify reasonable response times for large documents

## 📝 Implementation Notes

### Ollama Integration
- Models endpoint should query Ollama for available models
- Generate endpoint should use selected model for inference
- Health endpoint should check Ollama service status

### Document Storage
- Content endpoint needs access to uploaded document storage
- Should support PDF text extraction
- Consider caching for frequently accessed documents

### Performance Considerations
- Document content endpoint may need caching for large files
- Generate endpoint should support streaming responses
- Consider rate limiting for AI generation requests

## 🚀 Deployment Checklist

### Before Deployment
- [ ] Implement AI models endpoint
- [ ] Enhance generate endpoint with new parameters
- [ ] Test with frontend integration
- [ ] Verify error handling

### Optional Enhancements
- [ ] Implement document content endpoint
- [ ] Add AI health monitoring
- [ ] Implement response caching
- [ ] Add detailed logging

The frontend v2.1 implementation is complete and production-ready. These backend APIs will enhance functionality but are not required for basic operation due to implemented fallback mechanisms.