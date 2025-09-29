/**
 * Enhanced Document Management API Routes
 * Now supports organized folder structure for different document types
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const DocumentManagerService = require('../services/DocumentManagerService');
const AuthService = require('../services/AuthService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const documentManager = new DocumentManagerService();
const authService = new AuthService();

// Configure multer for file uploads with enhanced validation
const upload = multer({
  dest: path.join(__dirname, '../../../uploads/temp'),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (service will validate per type)
    files: 10
  },
  fileFilter: (req, file, cb) => {
    // Let the service handle detailed validation
    cb(null, true);
  }
});

/**
 * @route GET /api/documents/structure
 * @desc Get the complete folder structure and document types
 * @access Public
 */
router.get('/structure', asyncHandler(async (req, res) => {
  const structure = await documentManager.getDocumentStructure();

  res.json({
    success: true,
    data: structure
  });
}));

/**
 * @route POST /api/documents/upload
 * @desc Upload documents to organized folders
 * @access Public
 */
router.post('/upload', upload.array('files', 10), sanitizeInput, asyncHandler(async (req, res) => {
  const { documentType, subfolder, projectName, metadata } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files provided'
    });
  }

  if (!documentType) {
    return res.status(400).json({
      success: false,
      message: 'Document type is required'
    });
  }

  // Normalize document type to lowercase for backend compatibility
  const normalizedDocumentType = documentType.toLowerCase();

  logger.info(`Uploading ${files.length} files to ${normalizedDocumentType}/${subfolder || 'default'}`);

  try {
    const parsedMetadata = metadata ? JSON.parse(metadata) : {};

    const results = await documentManager.uploadDocuments(
      files,
      normalizedDocumentType,
      subfolder,
      projectName,
      parsedMetadata
    );

    // Clean up temp files
    await Promise.all(files.map(file =>
      fs.unlink(file.path).catch(err =>
        logger.warn(`Failed to delete temp file ${file.path}: ${err.message}`)
      )
    ));

    res.json({
      success: true,
      data: {
        uploadedFiles: results,
        totalFiles: results.length,
        documentType,
        subfolder: subfolder || 'default',
        projectName
      }
    });
  } catch (error) {
    // Clean up temp files on error
    await Promise.all(files.map(file =>
      fs.unlink(file.path).catch(() => {})
    ));

    throw error;
  }
}));

/**
 * @route GET /api/documents/list
 * @desc List documents in a specific folder
 * @access Public
 */
router.get('/list', asyncHandler(async (req, res) => {
  const { documentType, subfolder, projectName, page = 1, limit = 20, status } = req.query;

  // Document type is optional when projectName is provided (to get all documents for a project)
  if (!documentType && !projectName) {
    return res.status(400).json({
      success: false,
      message: 'Either document type or project name is required'
    });
  }

  // Normalize document type to lowercase for backend compatibility (null if not provided)
  const normalizedDocumentType = documentType ? documentType.toLowerCase() : null;

  logger.info(`Listing documents for ${normalizedDocumentType || 'all-types'}/${subfolder || 'default'}${projectName ? ` (project: ${projectName})` : ''}`);

  // Build filters object with status parameter
  const dbFilters = {
    category: normalizedDocumentType,
    projectName: projectName ? decodeURIComponent(projectName) : null,
    searchTerm: '',
    tags: [],
    dateFrom: null,
    dateTo: null,
    sortBy: 'uploadedAt',
    sortOrder: 'desc'
  };

  // Handle status filtering - status can be single value or array
  if (status) {
    const statusArray = Array.isArray(status) ? status : [status];
    dbFilters.status = statusArray;
  }

  logger.info(`Querying database for documents with filters:`, JSON.stringify(dbFilters));

  // Use database-based listing instead of filesystem-based
  const documents = await documentManager.documentModel.list(dbFilters, {
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });

  logger.info(`Found ${documents.documents.length} documents in database`);

  res.json({
    success: true,
    data: documents
  });
}));

/**
 * @route POST /api/documents/create-project
 * @desc Create a new project folder
 * @access Public
 */
router.post('/create-project', sanitizeInput, asyncHandler(async (req, res) => {
  const { projectName, documentType, description, metadata } = req.body;

  if (!projectName || !documentType) {
    return res.status(400).json({
      success: false,
      message: 'Project name and document type are required'
    });
  }

  logger.info(`Creating project folder: ${projectName} in ${documentType}`);

  const result = await documentManager.createProjectFolder(
    documentType,
    projectName,
    description,
    metadata || {}
  );

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route GET /api/documents/projects
 * @desc List all project folders
 * @access Public
 */
router.get('/projects', asyncHandler(async (req, res) => {
  const { documentType } = req.query;

  const projects = await documentManager.listProjects(documentType);

  res.json({
    success: true,
    data: projects
  });
}));

/**
 * @route GET /api/documents/download/:fileId
 * @desc Download a specific document
 * @access Public
 */
router.get('/download/:fileId', asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  if (!fileId) {
    return res.status(400).json({
      success: false,
      message: 'File ID is required'
    });
  }

  const fileInfo = await documentManager.getFileById(fileId);

  if (!fileInfo) {
    return res.status(404).json({
      success: false,
      message: 'File not found'
    });
  }

  // Set appropriate headers for download
  res.set({
    'Content-Type': fileInfo.mimeType || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${fileInfo.originalName}"`,
    'Content-Length': fileInfo.size
  });

  // Stream the file
  const fileStream = await documentManager.getFileStream(fileId);
  fileStream.pipe(res);
}));

/**
 * @route DELETE /api/documents/:fileId
 * @desc Delete a specific document
 * @access Public
 */
// DISABLED: Conflicting route - use DELETE /:id instead
// router.delete('/:fileId', asyncHandler(async (req, res) => {
//   const { fileId } = req.params;

//   if (!fileId) {
//     return res.status(400).json({
//       success: false,
//       message: 'File ID is required'
//     });
//   }

//   logger.info(`Deleting document: ${fileId}`);

//   const result = await documentManager.deleteDocument(fileId);

//   res.json({
//     success: true,
//     data: {
//       deleted: result,
//       fileId
//     }
//   });
// }));

/**
 * @route POST /api/documents/search
 * @desc Search documents across all folders
 * @access Public
 */
router.post('/search', sanitizeInput, asyncHandler(async (req, res) => {
  const { query, documentType, subfolder, projectName, dateRange, fileTypes } = req.body;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters'
    });
  }

  logger.info(`Searching documents for: "${query}"`);

  const searchFilters = {
    documentType,
    subfolder,
    projectName,
    dateRange,
    fileTypes
  };

  const results = await documentManager.searchDocuments(query, searchFilters);

  res.json({
    success: true,
    data: results
  });
}));

/**
 * @route GET /api/documents/:fileId/metadata
 * @desc Get metadata for a specific document
 * @access Public
 */
router.get('/:fileId/metadata', asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  const metadata = await documentManager.getDocumentMetadata(fileId);

  if (!metadata) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  res.json({
    success: true,
    data: metadata
  });
}));

/**
 * @route PUT /api/documents/:fileId/metadata
 * @desc Update metadata for a specific document
 * @access Public
 */
router.put('/:fileId/metadata', sanitizeInput, asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const { metadata } = req.body;

  if (!metadata || typeof metadata !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Valid metadata object is required'
    });
  }

  logger.info(`Updating metadata for document: ${fileId}`);

  const result = await documentManager.updateDocumentMetadata(fileId, metadata);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/documents/bulk-move
 * @desc Move multiple documents to a different folder
 * @access Public
 */
router.post('/bulk-move', sanitizeInput, asyncHandler(async (req, res) => {
  const { fileIds, targetDocumentType, targetSubfolder, targetProject } = req.body;

  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'File IDs array is required'
    });
  }

  if (!targetDocumentType) {
    return res.status(400).json({
      success: false,
      message: 'Target document type is required'
    });
  }

  logger.info(`Moving ${fileIds.length} documents to ${targetDocumentType}/${targetSubfolder || 'default'}`);

  const results = await documentManager.bulkMoveDocuments(
    fileIds,
    targetDocumentType,
    targetSubfolder,
    targetProject
  );

  res.json({
    success: true,
    data: {
      movedFiles: results.successful,
      failedFiles: results.failed,
      totalProcessed: fileIds.length
    }
  });
}));

/**
 * @route GET /api/documents/statistics
 * @desc Get document storage statistics
 * @access Public
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  const stats = await documentManager.getStorageStatistics();

  res.json({
    success: true,
    data: stats
  });
}));

/**
 * @route GET /api/documents/content/:documentType/:projectTitle/:documentName
 * @desc Get text content of a specific document for reading pane (v2.1 feature)
 * @access Public
 */
router.get('/content/:documentType/:projectTitle/:documentName', asyncHandler(async (req, res) => {
  const { documentType, projectTitle, documentName } = req.params;

  if (!documentType || !projectTitle || !documentName) {
    return res.status(400).json({
      success: false,
      message: 'Document type, project title, and document name are required'
    });
  }

  logger.info(`Getting content for document: ${documentName} in ${projectTitle}/${documentType}`);

  try {
    // Extract real document content using DocumentManagerService
    const documentContent = await documentManager.getDocumentContent(
      documentType,
      projectTitle,
      documentName
    );

    res.json({
      success: true,
      data: {
        content: documentContent.content,
        contentType: 'text/plain',
        filename: documentName,
        size: documentContent.content ? documentContent.content.length : 0,
        pages: documentContent.content ? documentContent.content.split('\n').length : 0,
        lastModified: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`Error getting document content: ${error.message}`);
    res.status(404).json({
      success: false,
      message: 'Document not found',
      error: 'FILE_NOT_FOUND'
    });
  }
}));

/**
 * @route GET /api/documents/health
 * @desc Check document service health
 * @access Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = await documentManager.checkHealth();

  res.json({
    success: true,
    data: health
  });
}));

/**
 * @route PUT /api/documents/:id/archive
 * @desc Archive a document
 * @access Project Owner/Admin
 */
router.put('/:id/archive', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const documentId = parseInt(id, 10);

  // Get current user and check permissions
  const currentUser = await authService.getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    // Get document to check project ownership
    const document = await documentManager.documentModel.getById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    const hasPermission = await authService.hasPermission(
      currentUser.id,
      'document.archive',
      'document',
      document.projectName
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    const archivedDocument = await documentManager.documentModel.archive(documentId, currentUser.username);
    if (!archivedDocument) {
      return res.status(400).json({
        success: false,
        message: 'Document could not be archived'
      });
    }

    res.json({
      success: true,
      data: archivedDocument,
      message: 'Document archived successfully'
    });

  } catch (error) {
    logger.error(`Error archiving document: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to archive document'
    });
  }
}));

/**
 * @route PUT /api/documents/:id/unarchive
 * @desc Unarchive a document
 * @access Project Owner/Admin
 */
router.put('/:id/unarchive', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const documentId = parseInt(id, 10);

  const currentUser = await authService.getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const document = await documentManager.documentModel.getById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const hasPermission = await authService.hasPermission(
      currentUser.id,
      'document.archive',
      'document',
      document.projectName
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    const unarchivedDocument = await documentManager.documentModel.unarchive(documentId, currentUser.username);
    if (!unarchivedDocument) {
      return res.status(400).json({
        success: false,
        message: 'Document could not be unarchived'
      });
    }

    res.json({
      success: true,
      data: unarchivedDocument,
      message: 'Document unarchived successfully'
    });

  } catch (error) {
    logger.error(`Error unarchiving document: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to unarchive document'
    });
  }
}));

/**
 * @route DELETE /api/documents/:id
 * @desc Soft delete a document
 * @access Project Owner/Admin
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const documentId = parseInt(id, 10);

  const currentUser = await authService.getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const document = await documentManager.documentModel.getById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const hasPermission = await authService.hasPermission(
      currentUser.id,
      'document.delete',
      'document',
      document.projectName
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    const deletedDocument = await documentManager.documentModel.softDelete(documentId, currentUser.username);
    if (!deletedDocument) {
      return res.status(400).json({
        success: false,
        message: 'Document could not be deleted'
      });
    }

    res.json({
      success: true,
      data: deletedDocument,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    logger.error(`Error deleting document: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
}));

/**
 * @route POST /api/documents/bulk-action
 * @desc Perform bulk action on multiple documents
 * @access Project Owner/Admin
 */
router.post('/bulk-action', asyncHandler(async (req, res) => {
  const { documentIds, action } = req.body;

  if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Document IDs are required'
    });
  }

  if (!['archive', 'unarchive', 'delete'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid action. Must be archive, unarchive, or delete'
    });
  }

  const currentUser = await authService.getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const results = [];
    const errors = [];

    for (const id of documentIds) {
      try {
        const document = await documentManager.documentModel.getById(documentId);
        if (!document) {
          errors.push({ id, error: 'Document not found' });
          continue;
        }

        const hasPermission = await authService.hasPermission(
          currentUser.id,
          `document.${action}`,
          'document',
          document.projectName
        );

        if (!hasPermission) {
          errors.push({ id, error: 'Permission denied' });
          continue;
        }

        let result;
        switch (action) {
          case 'archive':
            result = await documentManager.documentModel.archive(documentId, currentUser.username);
            break;
          case 'unarchive':
            result = await documentManager.documentModel.unarchive(documentId, currentUser.username);
            break;
          case 'delete':
            result = await documentManager.documentModel.softDelete(id, currentUser.username);
            break;
        }

        if (result) {
          results.push(result);
        } else {
          errors.push({ id, error: `Failed to ${action} document` });
        }

      } catch (error) {
        errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        processed: results,
        errors: errors,
        total: documentIds.length,
        successful: results.length,
        failed: errors.length
      },
      message: `Bulk ${action} completed. ${results.length} successful, ${errors.length} failed.`
    });

  } catch (error) {
    logger.error(`Error performing bulk action: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action'
    });
  }
}));

module.exports = router;