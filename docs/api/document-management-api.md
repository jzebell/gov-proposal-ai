# Document Management API Documentation

**Document**: document-management-api.md
**Last Updated**: 2025-09-26
**Version**: 2.1.1
**Status**: Production Ready

## Overview

The Document Management API provides comprehensive document processing, storage, and retrieval capabilities for government proposal development. This API supports multiple document formats, metadata extraction, content indexing, and real-time content serving.

## Base URL

```
http://localhost:3000/api/documents
```

## Authentication

All Document Management API endpoints require valid user authentication:

```javascript
headers: {
  'Authorization': 'Bearer <session-token>',
  'Content-Type': 'application/json' // or 'multipart/form-data' for uploads
}
```

## Endpoints

### Upload Documents

Upload single or multiple documents with automatic processing and metadata extraction.

#### Request

```http
POST /api/documents/upload
```

#### Request (Multipart Form Data)

```javascript
const formData = new FormData();
formData.append('projectTitle', 'DoD Cybersecurity Platform');
formData.append('documentType', 'RFP');
formData.append('subfolder', 'solicitations');
formData.append('file', fileObject1);
formData.append('file', fileObject2); // Multiple files supported

// Optional metadata
formData.append('metadata', JSON.stringify({
  priority: 'high',
  compliance: ['FAR 52.204-21'],
  tags: ['cybersecurity', 'requirements']
}));
```

#### Request Headers

```javascript
headers: {
  'Authorization': 'Bearer <session-token>',
  'Content-Type': 'multipart/form-data'
}
```

#### Response

```javascript
{
  "success": true,
  "data": {
    "uploadedFiles": [
      {
        "id": "doc_1695734832_abc123",
        "fileName": "RFP-CYBER-2025.pdf",
        "originalName": "RFP-CYBER-2025.pdf",
        "projectTitle": "DoD Cybersecurity Platform",
        "documentType": "RFP",
        "subfolder": "solicitations",
        "filePath": "/uploads/RFP/DoD_Cybersecurity_Platform/solicitations/RFP-CYBER-2025.pdf",
        "fileSize": 2547123,
        "mimeType": "application/pdf",
        "metadata": {
          "pages": 87,
          "wordCount": 23456,
          "extractedText": true,
          "compliance": ["FAR 52.204-21"],
          "priority": "high",
          "tags": ["cybersecurity", "requirements"],
          "processingTime": 4.2
        },
        "contentExtracted": true,
        "uploadedAt": "2025-09-26T10:30:00.000Z",
        "status": "processed"
      }
    ],
    "summary": {
      "totalFiles": 1,
      "successfulUploads": 1,
      "failedUploads": 0,
      "totalSize": 2547123,
      "processingTime": 4.2
    }
  },
  "requestId": "upload_1695734832_xyz789"
}
```

#### Upload Options

```javascript
// Request body options
{
  "projectTitle": "string",           // Required: Project name
  "documentType": "string",           // Required: Document type (RFP, RFI, etc.)
  "subfolder": "string",             // Optional: Organization subfolder
  "metadata": {                      // Optional: Additional metadata
    "priority": "high|medium|low",
    "compliance": ["string"],
    "tags": ["string"],
    "description": "string",
    "version": "string"
  },
  "options": {                       // Optional: Processing options
    "extractText": true,             // Extract text content (default: true)
    "generateThumbnail": false,      // Generate preview thumbnail
    "enableOCR": true,              // OCR for scanned documents
    "validateCompliance": false      // Compliance checking
  }
}
```

### Get Document Content

Retrieve the full text content of a document for display in reading pane or AI processing.

#### Request

```http
GET /api/documents/content/{documentType}/{projectTitle}/{documentName}
```

#### Path Parameters

- `documentType`: Type of document (RFP, RFI, SOW, etc.)
- `projectTitle`: URL-encoded project title
- `documentName`: URL-encoded document file name

#### Example

```http
GET /api/documents/content/RFP/DoD%20Cybersecurity%20Platform/RFP-CYBER-2025.pdf
```

#### Response

```javascript
// Content-Type: text/plain
"DEPARTMENT OF DEFENSE
REQUEST FOR PROPOSAL (RFP)

CYBERSECURITY PLATFORM IMPLEMENTATION

1. INTRODUCTION

The Department of Defense (DoD) seeks qualified contractors to implement a comprehensive cybersecurity platform that provides advanced threat detection, incident response, and compliance monitoring capabilities...

[Full document text content continues...]"
```

#### Response Headers

```javascript
{
  "Content-Type": "text/plain; charset=utf-8",
  "Content-Length": "156789",
  "X-Document-ID": "doc_1695734832_abc123",
  "X-Document-Pages": "87",
  "X-Word-Count": "23456",
  "X-Last-Modified": "2025-09-26T10:30:00.000Z"
}
```

### List Project Documents

Retrieve list of documents for a specific project with metadata and organization.

#### Request

```http
GET /api/documents/list/{documentType}/{projectTitle}
```

#### Query Parameters

```http
GET /api/documents/list/RFP/DoD%20Cybersecurity%20Platform?subfolder=solicitations&sort=createdAt&order=desc&limit=50&offset=0
```

- `subfolder`: Filter by subfolder (optional)
- `sort`: Sort field (createdAt, fileName, fileSize, priority)
- `order`: Sort order (asc, desc)
- `limit`: Number of results (default: 50, max: 200)
- `offset`: Pagination offset

#### Response

```javascript
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc_1695734832_abc123",
        "fileName": "RFP-CYBER-2025.pdf",
        "projectTitle": "DoD Cybersecurity Platform",
        "documentType": "RFP",
        "subfolder": "solicitations",
        "fileSize": 2547123,
        "fileSizeFormatted": "2.5 MB",
        "mimeType": "application/pdf",
        "createdAt": "2025-09-26T10:30:00.000Z",
        "updatedAt": "2025-09-26T10:30:00.000Z",
        "metadata": {
          "pages": 87,
          "wordCount": 23456,
          "priority": "high",
          "tags": ["cybersecurity", "requirements"],
          "compliance": ["FAR 52.204-21"]
        },
        "status": "processed",
        "contentAvailable": true,
        "thumbnailUrl": "/api/documents/thumbnail/doc_1695734832_abc123"
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 50,
      "offset": 0,
      "hasNext": false,
      "hasPrevious": false
    },
    "summary": {
      "totalFiles": 15,
      "totalSize": 47329856,
      "documentTypes": {
        "RFP": 1,
        "SOW": 3,
        "PWS": 2,
        "attachments": 9
      }
    }
  }
}
```

### Get All Projects

Retrieve list of all projects with document counts and metadata.

#### Request

```http
GET /api/documents/projects
```

#### Query Parameters

```http
GET /api/documents/projects?documentType=RFP&sort=createdAt&order=desc&limit=20
```

- `documentType`: Filter by document type (optional)
- `sort`: Sort field (createdAt, title, documentCount)
- `order`: Sort order (asc, desc)
- `limit`: Number of results (default: 20, max: 100)

#### Response

```javascript
{
  "success": true,
  "data": {
    "projects": [
      {
        "title": "DoD Cybersecurity Platform",
        "documentType": "RFP",
        "documentCount": 15,
        "totalSize": 47329856,
        "createdAt": "2025-09-20T14:30:00.000Z",
        "lastModified": "2025-09-26T10:30:00.000Z",
        "metadata": {
          "dueDate": "2025-12-15T23:59:59.000Z",
          "status": "active",
          "priority": "high",
          "compliance": ["FAR", "DFARS"],
          "description": "Comprehensive cybersecurity platform for DoD operations"
        },
        "subfolders": [
          {
            "name": "solicitations",
            "documentCount": 1,
            "size": 2547123
          },
          {
            "name": "attachments",
            "documentCount": 9,
            "size": 12456789
          },
          {
            "name": "general",
            "documentCount": 5,
            "size": 32325944
          }
        ]
      }
    ],
    "summary": {
      "totalProjects": 3,
      "totalDocuments": 45,
      "totalSize": 156789432,
      "activeProjects": 2,
      "completedProjects": 1
    }
  }
}
```

### Get Document Metadata

Retrieve detailed metadata for a specific document.

#### Request

```http
GET /api/documents/{documentId}/metadata
```

#### Response

```javascript
{
  "success": true,
  "data": {
    "id": "doc_1695734832_abc123",
    "fileName": "RFP-CYBER-2025.pdf",
    "originalName": "RFP-CYBER-2025.pdf",
    "projectTitle": "DoD Cybersecurity Platform",
    "documentType": "RFP",
    "subfolder": "solicitations",
    "filePath": "/uploads/RFP/DoD_Cybersecurity_Platform/solicitations/RFP-CYBER-2025.pdf",
    "fileSize": 2547123,
    "mimeType": "application/pdf",
    "contentExtracted": true,
    "createdAt": "2025-09-26T10:30:00.000Z",
    "updatedAt": "2025-09-26T10:30:00.000Z",
    "uploadedBy": "user_12345",
    "metadata": {
      "pages": 87,
      "wordCount": 23456,
      "characterCount": 156789,
      "priority": "high",
      "tags": ["cybersecurity", "requirements", "dod"],
      "compliance": ["FAR 52.204-21", "DFARS 252.204-7012"],
      "extractionInfo": {
        "method": "pdf-parse",
        "confidence": 0.98,
        "processingTime": 4.2,
        "ocrUsed": false
      },
      "documentStructure": {
        "sections": 15,
        "tables": 8,
        "figures": 12,
        "appendices": 3
      }
    },
    "versions": [
      {
        "version": "1.0",
        "uploadedAt": "2025-09-26T10:30:00.000Z",
        "changes": "Initial upload"
      }
    ],
    "access": {
      "permissions": ["read", "write", "delete"],
      "lastAccessed": "2025-09-26T15:45:00.000Z",
      "accessCount": 12
    }
  }
}
```

### Delete Document

Remove a document and all associated metadata.

#### Request

```http
DELETE /api/documents/{documentId}
```

#### Response

```javascript
{
  "success": true,
  "data": {
    "deletedDocument": {
      "id": "doc_1695734832_abc123",
      "fileName": "RFP-CYBER-2025.pdf",
      "projectTitle": "DoD Cybersecurity Platform"
    },
    "filesRemoved": [
      "/uploads/RFP/DoD_Cybersecurity_Platform/solicitations/RFP-CYBER-2025.pdf",
      "/thumbnails/doc_1695734832_abc123.jpg"
    ],
    "freedSpace": 2547123
  },
  "message": "Document successfully deleted"
}
```

### Search Documents

Search across document content, metadata, and file names.

#### Request

```http
POST /api/documents/search
```

#### Request Body

```javascript
{
  "query": "cybersecurity zero trust architecture",
  "filters": {
    "documentType": ["RFP", "SOW"],
    "projectTitle": "DoD Cybersecurity Platform",
    "tags": ["cybersecurity"],
    "dateRange": {
      "start": "2025-09-01T00:00:00.000Z",
      "end": "2025-09-30T23:59:59.000Z"
    },
    "fileSize": {
      "min": 1000000,  // 1MB
      "max": 10000000  // 10MB
    }
  },
  "options": {
    "searchContent": true,     // Search within document text
    "searchMetadata": true,    // Search metadata fields
    "searchFileName": true,    // Search file names
    "highlightResults": true,  // Include highlighted snippets
    "limit": 20,
    "offset": 0
  }
}
```

#### Response

```javascript
{
  "success": true,
  "data": {
    "results": [
      {
        "document": {
          "id": "doc_1695734832_abc123",
          "fileName": "RFP-CYBER-2025.pdf",
          "projectTitle": "DoD Cybersecurity Platform",
          "documentType": "RFP"
        },
        "matches": [
          {
            "type": "content",
            "page": 15,
            "snippet": "Implementation of **zero trust architecture** for **cybersecurity** must include...",
            "confidence": 0.92
          },
          {
            "type": "metadata",
            "field": "tags",
            "value": "cybersecurity",
            "confidence": 1.0
          }
        ],
        "relevanceScore": 0.87
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0
    },
    "searchMetadata": {
      "query": "cybersecurity zero trust architecture",
      "executionTime": 0.156,
      "totalDocumentsSearched": 45
    }
  }
}
```

### Get Document Thumbnail

Retrieve a thumbnail image for document preview.

#### Request

```http
GET /api/documents/thumbnail/{documentId}
```

#### Query Parameters

- `size`: Thumbnail size (small, medium, large) - default: medium
- `page`: Page number for multi-page documents - default: 1

#### Response

```http
Content-Type: image/jpeg
Content-Length: 15432

[Binary image data]
```

## File Format Support

### Supported Formats

| Format | Extension | Text Extraction | Thumbnail | OCR Support |
|--------|-----------|----------------|-----------|-------------|
| PDF | `.pdf` | ✅ | ✅ | ✅ |
| Word Document | `.docx` | ✅ | ✅ | ❌ |
| Word 97-2003 | `.doc` | ✅ | ✅ | ❌ |
| Plain Text | `.txt` | ✅ | ❌ | ❌ |
| Rich Text | `.rtf` | ✅ | ❌ | ❌ |
| Excel | `.xlsx` | ✅ | ✅ | ❌ |
| PowerPoint | `.pptx` | ✅ | ✅ | ❌ |

### File Size Limits

- **Maximum file size**: 50 MB per file
- **Maximum total upload**: 200 MB per request
- **Maximum files per upload**: 20 files

### Processing Capabilities

- **Text Extraction**: Automatic text extraction for content indexing
- **OCR Processing**: Optical Character Recognition for scanned PDFs
- **Metadata Extraction**: Document properties, creation date, author
- **Thumbnail Generation**: Preview images for supported formats
- **Content Analysis**: Word count, page count, structure analysis

## Error Handling

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `FILE_TOO_LARGE` | File exceeds size limit | Reduce file size or split into multiple files |
| `UNSUPPORTED_FORMAT` | File format not supported | Convert to supported format |
| `DUPLICATE_FILE` | File already exists in project | Use different name or update existing |
| `EXTRACTION_FAILED` | Text extraction failed | Check file integrity or try different format |
| `INSUFFICIENT_STORAGE` | Not enough disk space | Clear storage or contact administrator |
| `PROCESSING_TIMEOUT` | Document processing took too long | Try with smaller file or contact support |
| `DOCUMENT_NOT_FOUND` | Requested document doesn't exist | Verify document ID and permissions |
| `ACCESS_DENIED` | User lacks permission for operation | Check user permissions |

### Error Response Format

```javascript
{
  "success": false,
  "message": "File size exceeds maximum limit",
  "error": "FILE_TOO_LARGE",
  "details": {
    "fileName": "large-document.pdf",
    "fileSize": 52428800,
    "maxSize": 52428800,
    "suggestion": "Compress file or split into smaller documents"
  },
  "requestId": "upload_1695734832_error"
}
```

## Usage Examples

### Single File Upload

```javascript
async function uploadDocument(file, projectTitle, documentType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectTitle', projectTitle);
  formData.append('documentType', documentType);

  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    },
    body: formData
  });

  return await response.json();
}
```

### Multiple File Upload with Metadata

```javascript
async function uploadMultipleDocuments(files, metadata) {
  const formData = new FormData();

  files.forEach(file => {
    formData.append('file', file);
  });

  formData.append('projectTitle', metadata.projectTitle);
  formData.append('documentType', metadata.documentType);
  formData.append('subfolder', metadata.subfolder);
  formData.append('metadata', JSON.stringify({
    priority: metadata.priority,
    tags: metadata.tags,
    compliance: metadata.compliance
  }));

  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    },
    body: formData
  });

  return await response.json();
}
```

### Load Document Content

```javascript
async function loadDocumentContent(documentType, projectTitle, documentName) {
  const encodedProject = encodeURIComponent(projectTitle);
  const encodedDocument = encodeURIComponent(documentName);

  const response = await fetch(
    `/api/documents/content/${documentType}/${encodedProject}/${encodedDocument}`,
    {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    }
  );

  if (response.ok) {
    return await response.text();
  } else {
    throw new Error(`Failed to load document: ${response.statusText}`);
  }
}
```

### Search Documents

```javascript
async function searchDocuments(query, filters = {}) {
  const response = await fetch('/api/documents/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: query,
      filters: filters,
      options: {
        searchContent: true,
        searchMetadata: true,
        highlightResults: true,
        limit: 20
      }
    })
  });

  return await response.json();
}
```

## Performance Considerations

### Upload Optimization

1. **Batch Processing**: Upload multiple files in single request
2. **Compression**: Use compressed formats when possible
3. **Progress Tracking**: Monitor upload progress for large files
4. **Chunked Upload**: For files >10MB, consider chunked upload

### Content Serving

1. **Caching**: Document content cached for 1 hour
2. **Streaming**: Large documents served with streaming
3. **Compression**: Text content served with gzip compression
4. **CDN Ready**: Static file serving optimized for CDN

### Search Performance

1. **Indexing**: Full-text search index maintained automatically
2. **Filters**: Use filters to narrow search scope
3. **Pagination**: Always use pagination for large result sets
4. **Query Optimization**: Specific queries perform better than broad searches

---

**Related Documentation**:
- [AI Writing API](./ai-writing-api.md)
- [Authentication API](./authentication-api.md)
- [System Architecture](../ARCHITECTURE.md)

**Contact**: Development team for API questions or feature requests
**Version History**: See [CHANGELOG.md](../../CHANGELOG.md) for API changes