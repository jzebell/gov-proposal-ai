# AI Writing API Documentation

**Document**: ai-writing-api.md
**Last Updated**: 2025-09-26
**Version**: 2.1.1
**Status**: Production Ready

## Overview

The AI Writing API provides comprehensive AI-powered content generation capabilities for government proposal development. This API integrates directly with Ollama for local AI processing, supporting multiple models, persona-based writing, and document-aware generation.

## Base URL

```
http://localhost:3000/api/ai-writing
```

## Authentication

All AI Writing API endpoints require valid user authentication. Include session tokens in requests:

```javascript
headers: {
  'Authorization': 'Bearer <session-token>',
  'Content-Type': 'application/json'
}
```

## Endpoints

### Generate AI Content

Generate AI-powered content with advanced features including persona-based writing, model selection, and document context integration.

#### Request

```http
POST /api/ai-writing/generate
```

#### Request Body

```javascript
{
  "prompt": "Write an executive summary for the DoD cybersecurity platform proposal",
  "model": "qwen2.5:14b",                    // Optional: Ollama model ID
  "personaId": "proposal-manager",           // Optional: Writing persona
  "noHallucinations": true,                  // Optional: Document-only responses
  "temperature": 0.7,                        // Optional: Generation creativity (0.0-1.0)
  "maxTokens": 2000,                        // Optional: Maximum response length
  "projectContext": {                        // Optional: Project information
    "title": "DoD Cybersecurity Platform",
    "documentType": "RFP",
    "dueDate": "2025-12-15",
    "documents": [
      {
        "name": "RFP-2025-CYBER-001.pdf",
        "type": "solicitation",
        "relevance": 0.95
      }
    ]
  },
  "requirements": {                          // Optional: Specific requirements
    "sectionType": "executive-summary",
    "wordCount": 500,
    "format": "formal",
    "compliance": ["FAR 52.204-21", "DFARS 252.204-7012"]
  }
}
```

#### Response

```javascript
{
  "success": true,
  "data": {
    "content": "# Executive Summary\n\nOur cybersecurity platform proposal...",
    "metadata": {
      "model": "qwen2.5:14b",
      "persona": "proposal-manager",
      "generationTime": 12.4,
      "tokenCount": 1847,
      "citedDocuments": [
        {
          "document": "RFP-2025-CYBER-001.pdf",
          "citations": [
            {
              "page": 15,
              "section": "Technical Requirements",
              "text": "Zero-trust architecture implementation"
            }
          ]
        }
      ]
    },
    "performance": {
      "tokensPerSecond": 39.9,
      "promptTokens": 453,
      "completionTokens": 1847,
      "totalTokens": 2300
    }
  },
  "requestId": "gen_1695734832_abc123"
}
```

#### Error Response

```javascript
{
  "success": false,
  "message": "AI generation failed",
  "error": "MODEL_UNAVAILABLE",
  "details": {
    "requestedModel": "qwen2.5:14b",
    "availableModels": ["qwen2.5:7b", "llama2:13b"],
    "suggestion": "Use an available model or ensure Ollama is running"
  },
  "requestId": "gen_1695734832_abc123"
}
```

### Stream AI Generation

Generate AI content with real-time streaming for better user experience during long generations.

#### Request

```http
POST /api/ai-writing/stream
```

#### WebSocket Connection

```javascript
// Establish WebSocket connection
const ws = new WebSocket('ws://localhost:3000/api/ai-writing/stream');

// Send generation request
ws.send(JSON.stringify({
  "type": "generate",
  "data": {
    "prompt": "Write a technical approach section",
    "model": "qwen2.5:14b",
    "personaId": "technical-writer",
    "projectContext": { /* ... */ }
  }
}));

// Receive streaming responses
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);

  switch (response.type) {
    case 'token':
      // Append token to display
      appendToken(response.content);
      break;

    case 'progress':
      // Update progress indicator
      updateProgress(response.percentage);
      break;

    case 'complete':
      // Generation finished
      handleComplete(response.data);
      break;

    case 'error':
      // Handle error
      handleError(response.error);
      break;
  }
};
```

#### Streaming Response Format

```javascript
// Token response
{
  "type": "token",
  "content": "cybersecurity",
  "timestamp": "2025-09-26T10:30:15.123Z"
}

// Progress response
{
  "type": "progress",
  "percentage": 45,
  "estimatedTimeRemaining": 8.2
}

// Completion response
{
  "type": "complete",
  "data": {
    "content": "Complete generated text...",
    "metadata": { /* ... */ },
    "performance": { /* ... */ }
  }
}

// Error response
{
  "type": "error",
  "error": "GENERATION_FAILED",
  "message": "AI model encountered an error",
  "details": { /* ... */ }
}
```

### Get Available Models

Retrieve list of available AI models from the Ollama instance.

#### Request

```http
GET /api/ai-writing/models
```

#### Response

```javascript
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "qwen2.5:14b",
        "name": "Qwen 2.5 14B",
        "description": "Advanced reasoning and code generation",
        "size": "8.4GB",
        "parameters": "14B",
        "capabilities": [
          "text-generation",
          "code-generation",
          "technical-writing"
        ],
        "performance": {
          "tokensPerSecond": 39.9,
          "memoryUsage": "8.2GB",
          "warmupTime": 13.2
        },
        "status": "available"
      },
      {
        "id": "qwen2.5:7b",
        "name": "Qwen 2.5 7B",
        "description": "Balanced performance and efficiency",
        "size": "4.1GB",
        "parameters": "7B",
        "capabilities": [
          "text-generation",
          "technical-writing"
        ],
        "performance": {
          "tokensPerSecond": 52.3,
          "memoryUsage": "4.8GB",
          "warmupTime": 8.7
        },
        "status": "available"
      }
    ],
    "default": "qwen2.5:14b",
    "ollamaStatus": "running"
  }
}
```

### Get Available Personas

Retrieve list of available writing personas for specialized content generation.

#### Request

```http
GET /api/ai-writing/personas
```

#### Response

```javascript
{
  "success": true,
  "data": {
    "personas": [
      {
        "id": "technical-writer",
        "name": "Technical Writer",
        "description": "Clear, concise technical documentation with structured approach",
        "icon": "📝",
        "specializations": [
          "technical-specifications",
          "user-documentation",
          "system-architecture"
        ],
        "systemPrompt": "You are a skilled technical writer...",
        "characteristics": {
          "tone": "professional",
          "complexity": "technical",
          "structure": "highly-organized"
        }
      },
      {
        "id": "proposal-manager",
        "name": "Proposal Manager",
        "description": "Strategic proposal development with government contracting expertise",
        "icon": "📊",
        "specializations": [
          "executive-summaries",
          "cost-proposals",
          "compliance-sections"
        ],
        "systemPrompt": "You are an experienced proposal manager...",
        "characteristics": {
          "tone": "persuasive",
          "complexity": "business-strategic",
          "structure": "results-oriented"
        }
      },
      {
        "id": "compliance-specialist",
        "name": "Compliance Specialist",
        "description": "Regulatory compliance and requirement adherence focus",
        "icon": "✅",
        "specializations": [
          "compliance-matrices",
          "regulatory-analysis",
          "audit-responses"
        ],
        "systemPrompt": "You are a compliance specialist...",
        "characteristics": {
          "tone": "authoritative",
          "complexity": "regulatory",
          "structure": "requirement-based"
        }
      }
    ],
    "default": "proposal-manager"
  }
}
```

### Health Check

Monitor AI service health and performance metrics.

#### Request

```http
GET /api/ai-writing/health
```

#### Response

```javascript
{
  "success": true,
  "data": {
    "status": "healthy",
    "ollama": {
      "status": "running",
      "version": "0.1.32",
      "modelsLoaded": 2,
      "memoryUsage": "12.4GB",
      "uptime": "2d 14h 32m"
    },
    "performance": {
      "averageResponseTime": 11.8,
      "requestsPerMinute": 3.2,
      "successRate": 98.7,
      "errorRate": 1.3
    },
    "resources": {
      "cpuUsage": 45.2,
      "memoryUsage": 76.8,
      "gpuUsage": 82.1,
      "diskSpace": 67.3
    },
    "lastCheck": "2025-09-26T10:30:00.000Z"
  }
}
```

## Request/Response Patterns

### Standard Success Response

```javascript
{
  "success": true,
  "data": { /* response data */ },
  "metadata": {
    "timestamp": "2025-09-26T10:30:00.000Z",
    "requestId": "unique-request-id",
    "version": "2.1.1"
  }
}
```

### Standard Error Response

```javascript
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "details": {
    /* Additional error context */
  },
  "requestId": "unique-request-id"
}
```

## Error Codes

### Generation Errors

| Code | Description | Resolution |
|------|-------------|------------|
| `MODEL_UNAVAILABLE` | Requested AI model not available | Use different model or check Ollama |
| `GENERATION_FAILED` | AI generation process failed | Retry request or check system resources |
| `CONTEXT_TOO_LARGE` | Input context exceeds model limits | Reduce document context or use smaller model |
| `INVALID_PERSONA` | Requested persona not found | Use valid persona ID from `/personas` endpoint |
| `RATE_LIMIT_EXCEEDED` | Too many requests in time window | Wait before retrying |

### System Errors

| Code | Description | Resolution |
|------|-------------|------------|
| `OLLAMA_OFFLINE` | Ollama service not accessible | Start Ollama service |
| `INSUFFICIENT_MEMORY` | Not enough GPU/RAM for model | Free resources or use smaller model |
| `NETWORK_ERROR` | Communication with Ollama failed | Check network connectivity |
| `SERVICE_UNAVAILABLE` | AI Writing service temporarily down | Wait and retry |

## Usage Examples

### Basic Content Generation

```javascript
// Simple AI generation
const response = await fetch('/api/ai-writing/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + sessionToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "Write a brief project overview for a cloud migration proposal"
  })
});

const result = await response.json();
console.log(result.data.content);
```

### Advanced Generation with Context

```javascript
// Advanced generation with full context
const response = await fetch('/api/ai-writing/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + sessionToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "Create an executive summary addressing the key requirements",
    model: "qwen2.5:14b",
    personaId: "proposal-manager",
    noHallucinations: true,
    projectContext: {
      title: "Enterprise Cloud Migration",
      documentType: "RFP",
      documents: [
        { name: "RFP-CLOUD-2025.pdf", type: "solicitation" },
        { name: "technical-requirements.docx", type: "requirements" }
      ]
    },
    requirements: {
      sectionType: "executive-summary",
      wordCount: 750,
      format: "formal"
    }
  })
});

const result = await response.json();
if (result.success) {
  console.log('Generated content:', result.data.content);
  console.log('Cited documents:', result.data.metadata.citedDocuments);
} else {
  console.error('Generation failed:', result.message);
}
```

### Real-time Streaming

```javascript
// WebSocket streaming for real-time generation
const ws = new WebSocket('ws://localhost:3000/api/ai-writing/stream');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'generate',
    data: {
      prompt: "Write a technical approach section for cybersecurity implementation",
      model: "qwen2.5:14b",
      personaId: "technical-writer"
    }
  }));
};

let generatedContent = '';

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);

  if (response.type === 'token') {
    generatedContent += response.content;
    updateDisplay(generatedContent);
  } else if (response.type === 'complete') {
    console.log('Generation complete:', response.data);
    ws.close();
  }
};
```

## Performance Considerations

### Optimization Guidelines

1. **Model Selection**: Use appropriate model size for task complexity
   - `qwen2.5:7b` for simple content (faster, less memory)
   - `qwen2.5:14b` for complex technical content (slower, more accurate)

2. **Context Management**: Optimize document context size
   - Include only relevant documents in `projectContext`
   - Use `noHallucinations: true` only when document citations are required

3. **Streaming**: Use streaming for long generations (>500 words)
   - Provides better user experience
   - Allows for early termination if needed

4. **Caching**: Leverage response caching for repeated requests
   - Similar prompts with same context may return cached results
   - Cache TTL: 1 hour for generation results

### Rate Limiting

- **Authenticated Users**: 60 requests per minute
- **Generation Endpoint**: 10 concurrent generations per user
- **Streaming**: 5 concurrent WebSocket connections per user
- **Model Loading**: 1 model change per minute

## Security Considerations

### Input Validation

- All prompts are sanitized for malicious content
- Document paths are validated against user permissions
- Model and persona IDs are validated against available options

### Data Privacy

- All processing occurs locally (no external API calls)
- Generated content is not logged in plain text
- User context is encrypted in transit and at rest

### Access Control

- All endpoints require valid user authentication
- Users can only access their own project documents
- Admin personas require elevated permissions

---

**Related Documentation**:
- [Document Management API](./document-management-api.md)
- [Authentication API](./authentication-api.md)
- [System Architecture](../ARCHITECTURE.md)

**Contact**: Development team for API questions or feature requests
**Version History**: See [CHANGELOG.md](../../CHANGELOG.md) for API changes