/**
 * Document Type Management API Routes
 * Provides CRUD operations for dynamic document type configuration
 */

const express = require('express');
const DocumentType = require('../models/DocumentType');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');

const router = express.Router();
const documentTypeModel = new DocumentType();

/**
 * @route GET /api/document-types
 * @desc Get all document types with optional filtering
 * @access Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    is_active,
    include_system = 'true',
    search,
    limit,
    offset
  } = req.query;

  const filters = {
    is_active: is_active !== undefined ? is_active === 'true' : true,
    include_system: include_system === 'true',
    search: search || undefined,
    limit: limit ? parseInt(limit) : undefined,
    offset: offset ? parseInt(offset) : 0
  };

  const documentTypes = await documentTypeModel.listDocumentTypes(filters);

  res.json({
    success: true,
    data: documentTypes,
    total: documentTypes.length,
    filters: filters
  });
}));

/**
 * @route GET /api/document-types/structure
 * @desc Get document structure for frontend consumption
 * @access Public
 */
router.get('/structure', asyncHandler(async (req, res) => {
  const structure = await documentTypeModel.getDocumentStructure();

  res.json({
    success: true,
    data: structure
  });
}));

/**
 * @route GET /api/document-types/:id
 * @desc Get a specific document type by ID
 * @access Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const documentType = await documentTypeModel.getDocumentTypeById(id);

  if (!documentType) {
    return res.status(404).json({
      success: false,
      message: 'Document type not found'
    });
  }

  res.json({
    success: true,
    data: documentType
  });
}));

/**
 * @route GET /api/document-types/key/:key
 * @desc Get a specific document type by key
 * @access Public
 */
router.get('/key/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;

  const documentType = await documentTypeModel.getDocumentTypeByKey(key);

  if (!documentType) {
    return res.status(404).json({
      success: false,
      message: 'Document type not found'
    });
  }

  res.json({
    success: true,
    data: documentType
  });
}));

/**
 * @route POST /api/document-types
 * @desc Create a new document type
 * @access Admin
 */
router.post('/', sanitizeInput, asyncHandler(async (req, res) => {
  const {
    key,
    name,
    description,
    allowed_extensions,
    max_size_mb,
    subfolders,
    metadata
  } = req.body;

  // Basic validation
  if (!key || !name) {
    return res.status(400).json({
      success: false,
      message: 'Key and name are required'
    });
  }

  try {
    const createdBy = req.user?.email || 'admin';

    const documentType = await documentTypeModel.createDocumentType({
      key,
      name,
      description,
      allowed_extensions: allowed_extensions || [],
      max_size_mb: max_size_mb || 50,
      subfolders: subfolders || ['general'],
      metadata: metadata || {}
    }, createdBy);

    res.status(201).json({
      success: true,
      message: 'Document type created successfully',
      data: documentType
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    throw error;
  }
}));

/**
 * @route PUT /api/document-types/:id
 * @desc Update an existing document type
 * @access Admin
 */
router.put('/:id', sanitizeInput, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    allowed_extensions,
    max_size_mb,
    subfolders,
    is_active,
    metadata
  } = req.body;

  try {
    const updatedBy = req.user?.email || 'admin';

    const documentType = await documentTypeModel.updateDocumentType(id, {
      name,
      description,
      allowed_extensions,
      max_size_mb,
      subfolders,
      is_active,
      metadata
    }, updatedBy);

    if (!documentType) {
      return res.status(404).json({
        success: false,
        message: 'Document type not found'
      });
    }

    res.json({
      success: true,
      message: 'Document type updated successfully',
      data: documentType
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    throw error;
  }
}));

/**
 * @route DELETE /api/document-types/:id
 * @desc Delete a document type
 * @access Admin
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    await documentTypeModel.deleteDocumentType(id);

    res.json({
      success: true,
      message: 'Document type deleted successfully'
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.message.includes('Cannot delete')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    throw error;
  }
}));

/**
 * @route POST /api/document-types/validate
 * @desc Validate a file against a document type
 * @access Public
 */
router.post('/validate', sanitizeInput, asyncHandler(async (req, res) => {
  const {
    document_type_key,
    filename,
    file_size
  } = req.body;

  if (!document_type_key || !filename || file_size === undefined) {
    return res.status(400).json({
      success: false,
      message: 'document_type_key, filename, and file_size are required'
    });
  }

  try {
    const documentType = await documentTypeModel.validateFileType(
      document_type_key,
      filename,
      file_size
    );

    res.json({
      success: true,
      message: 'File validation successful',
      data: {
        valid: true,
        document_type: documentType
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      data: {
        valid: false,
        error: error.message
      }
    });
  }
}));

/**
 * @route POST /api/document-types/:id/subfolders
 * @desc Add a subfolder to a document type
 * @access Admin
 */
router.post('/:id/subfolders', sanitizeInput, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subfolder } = req.body;

  if (!subfolder || typeof subfolder !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Subfolder name is required and must be a string'
    });
  }

  // Validate subfolder name
  if (!/^[a-zA-Z0-9-_\s]+$/.test(subfolder)) {
    return res.status(400).json({
      success: false,
      message: 'Subfolder name can only contain letters, numbers, spaces, hyphens, and underscores'
    });
  }

  try {
    const documentType = await documentTypeModel.getDocumentTypeById(id);
    if (!documentType) {
      return res.status(404).json({
        success: false,
        message: 'Document type not found'
      });
    }

    // Add the subfolder if it doesn't exist
    const normalizedSubfolder = subfolder.trim().toLowerCase().replace(/\s+/g, '-');
    const currentSubfolders = documentType.subfolders || [];

    if (!currentSubfolders.includes(normalizedSubfolder)) {
      const updatedSubfolders = [...currentSubfolders, normalizedSubfolder];
      const updatedBy = req.user?.email || 'admin';

      const updatedDocumentType = await documentTypeModel.updateDocumentType(id, {
        subfolders: updatedSubfolders
      }, updatedBy);

      res.json({
        success: true,
        message: 'Subfolder added successfully',
        data: updatedDocumentType
      });
    } else {
      res.status(409).json({
        success: false,
        message: 'Subfolder already exists'
      });
    }
  } catch (error) {
    throw error;
  }
}));

/**
 * @route DELETE /api/document-types/:id/subfolders/:subfolder
 * @desc Remove a subfolder from a document type
 * @access Admin
 */
router.delete('/:id/subfolders/:subfolder', asyncHandler(async (req, res) => {
  const { id, subfolder } = req.params;

  // Prevent deletion of 'general' subfolder
  if (subfolder === 'general') {
    return res.status(409).json({
      success: false,
      message: 'Cannot delete the default "general" subfolder'
    });
  }

  try {
    const documentType = await documentTypeModel.getDocumentTypeById(id);
    if (!documentType) {
      return res.status(404).json({
        success: false,
        message: 'Document type not found'
      });
    }

    const currentSubfolders = documentType.subfolders || [];
    const updatedSubfolders = currentSubfolders.filter(sf => sf !== subfolder);

    if (updatedSubfolders.length === currentSubfolders.length) {
      return res.status(404).json({
        success: false,
        message: 'Subfolder not found'
      });
    }

    const updatedBy = req.user?.email || 'admin';

    const updatedDocumentType = await documentTypeModel.updateDocumentType(id, {
      subfolders: updatedSubfolders
    }, updatedBy);

    res.json({
      success: true,
      message: 'Subfolder removed successfully',
      data: updatedDocumentType
    });
  } catch (error) {
    throw error;
  }
}));

module.exports = router;