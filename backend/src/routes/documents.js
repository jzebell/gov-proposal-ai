/**
 * Enhanced Document Management API Routes
 * Now supports organized folder structure for different document types
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const DocumentManagerService = require('../services/DocumentManagerService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const documentManager = new DocumentManagerService();

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
  const structure = documentManager.getDocumentStructure();

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

  logger.info(`Uploading ${files.length} files to ${documentType}/${subfolder || 'default'}`);

  try {
    const parsedMetadata = metadata ? JSON.parse(metadata) : {};

    const results = await documentManager.uploadDocuments(
      files,
      documentType,
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
  const { documentType, subfolder, projectName, page = 1, limit = 20 } = req.query;

  if (!documentType) {
    return res.status(400).json({
      success: false,
      message: 'Document type is required'
    });
  }

  logger.info(`Listing documents for ${documentType}/${subfolder || 'default'}`);

  const documents = await documentManager.listDocuments(
    documentType,
    subfolder,
    projectName,
    parseInt(page),
    parseInt(limit)
  );

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
    projectName,
    documentType,
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
router.delete('/:fileId', asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  if (!fileId) {
    return res.status(400).json({
      success: false,
      message: 'File ID is required'
    });
  }

  logger.info(`Deleting document: ${fileId}`);

  const result = await documentManager.deleteDocument(fileId);

  res.json({
    success: true,
    data: {
      deleted: result,
      fileId
    }
  });
}));

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

module.exports = router;