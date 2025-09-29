/**
 * Past Performance API Routes
 * RESTful endpoints for past performance management
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const PastPerformanceService = require('../services/PastPerformanceService');
const { validatePastPerformance, validateSearch } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();
const pastPerformanceService = new PastPerformanceService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || 'uploads/past_performance');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, and text files are allowed.'));
    }
  }
});

/**
 * @route POST /api/past-performance
 * @desc Create new past performance record
 * @access Private
 */
router.post('/', validatePastPerformance, asyncHandler(async (req, res) => {
  const options = {
    generateEmbeddings: req.body.generateEmbeddings !== false,
    extractTechnologies: req.body.extractTechnologies !== false
  };

  const result = await pastPerformanceService.createPastPerformance(req.body, options);

  logger.info(`Created past performance: ${result.pastPerformance.id}`, {
    projectName: result.pastPerformance.projectName,
    customer: result.pastPerformance.customer,
    userId: req.user?.id
  });

  res.status(201).json({
    success: true,
    data: result.pastPerformance,
    processing: result.processingResults,
    message: 'Past performance created successfully'
  });
}));

/**
 * @route POST /api/past-performance/upload
 * @desc Upload and process past performance document
 * @access Private
 */
router.post('/upload', upload.single('document'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No document file provided'
    });
  }

  // Extract metadata from form data
  const metadata = {
    projectName: req.body.projectName,
    customer: req.body.customer,
    documentCategory: 'past_performance',
    originalFilename: req.file.originalname,
    filePath: req.file.path,
    fileSize: req.file.size
  };

  // This would trigger document processing pipeline
  // For now, return upload confirmation
  logger.info(`Past performance document uploaded: ${req.file.originalname}`, {
    fileSize: req.file.size,
    userId: req.user?.id
  });

  res.status(201).json({
    success: true,
    data: {
      uploadId: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    },
    message: 'Document uploaded successfully. Processing will begin shortly.'
  });
}));

/**
 * @route GET /api/past-performance
 * @desc Get all past performance records with filtering
 * @access Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const filters = {
    customer: req.query.customer,
    customerType: req.query.customerType,
    contractType: req.query.contractType,
    workType: req.query.workType,
    minValue: req.query.minValue ? parseFloat(req.query.minValue) : undefined,
    maxValue: req.query.maxValue ? parseFloat(req.query.maxValue) : undefined,
    technologies: req.query.technologies ? req.query.technologies.split(',') : undefined,
    domains: req.query.domains ? req.query.domains.split(',') : undefined,
    search: req.query.search,
    startDateAfter: req.query.startDateAfter,
    endDateBefore: req.query.endDateBefore
  };

  // Remove undefined values
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });

  const pagination = {
    limit: parseInt(req.query.limit) || 20,
    offset: parseInt(req.query.offset) || 0
  };

  const result = await pastPerformanceService.pastPerformanceModel.getAll(filters, pagination);

  res.json({
    success: true,
    data: result.records,
    pagination: result.pagination,
    filters: filters
  });
}));

/**
 * @route GET /api/past-performance/search
 * @desc Advanced search with semantic capabilities
 * @access Private
 */
router.get('/search', asyncHandler(async (req, res) => {
  const searchParams = {
    query: req.query.q,
    filters: {
      customer: req.query.customer,
      customerType: req.query.customerType,
      contractType: req.query.contractType,
      workType: req.query.workType,
      minValue: req.query.minValue ? parseFloat(req.query.minValue) : undefined,
      maxValue: req.query.maxValue ? parseFloat(req.query.maxValue) : undefined
    },
    requiredTechnologies: req.query.technologies ? req.query.technologies.split(',') : [],
    domainAreas: req.query.domains ? req.query.domains.split(',') : [],
    pagination: {
      limit: parseInt(req.query.limit) || 10,
      offset: parseInt(req.query.offset) || 0
    },
    searchType: req.query.searchType || 'hybrid',
    weights: {
      technology: parseFloat(req.query.techWeight) || 0.4,
      domain: parseFloat(req.query.domainWeight) || 0.3,
      customer: parseFloat(req.query.customerWeight) || 0.2,
      semantic: parseFloat(req.query.semanticWeight) || 0.1
    }
  };

  const result = await pastPerformanceService.searchPastPerformance(searchParams);

  logger.info(`Past performance search executed`, {
    query: searchParams.query,
    resultsCount: result.results.length,
    searchType: searchParams.searchType,
    userId: req.user?.id
  });

  res.json({
    success: true,
    data: result.results,
    grouped: result.groupedResults,
    metadata: result.searchMetadata
  });
}));

/**
 * @route GET /api/past-performance/:id
 * @desc Get specific past performance record
 * @access Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const options = {
    includeChunks: req.query.includeChunks === 'true',
    includeSimilar: req.query.includeSimilar === 'true'
  };

  const pastPerformance = await pastPerformanceService.getPastPerformance(req.params.id, options);

  if (!pastPerformance) {
    return res.status(404).json({
      success: false,
      message: 'Past performance record not found'
    });
  }

  res.json({
    success: true,
    data: pastPerformance
  });
}));

/**
 * @route PUT /api/past-performance/:id
 * @desc Update past performance record
 * @access Private
 */
router.put('/:id', validatePastPerformance, asyncHandler(async (req, res) => {
  const options = {
    regenerateEmbeddings: req.body.regenerateEmbeddings === true,
    reextractTechnologies: req.body.reextractTechnologies === true
  };

  const updatedPP = await pastPerformanceService.updatePastPerformance(
    req.params.id,
    req.body,
    options
  );

  if (!updatedPP) {
    return res.status(404).json({
      success: false,
      message: 'Past performance record not found'
    });
  }

  logger.info(`Updated past performance: ${req.params.id}`, {
    projectName: updatedPP.projectName,
    userId: req.user?.id
  });

  res.json({
    success: true,
    data: updatedPP,
    message: 'Past performance updated successfully'
  });
}));

/**
 * @route DELETE /api/past-performance/:id
 * @desc Delete past performance record
 * @access Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const deleted = await pastPerformanceService.deletePastPerformance(req.params.id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Past performance record not found'
    });
  }

  logger.info(`Deleted past performance: ${req.params.id}`, {
    userId: req.user?.id
  });

  res.json({
    success: true,
    message: 'Past performance deleted successfully'
  });
}));

/**
 * @route GET /api/past-performance/:id/similar
 * @desc Get similar past performance records
 * @access Private
 */
router.get('/:id/similar', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const pastPerformance = await pastPerformanceService.getPastPerformance(req.params.id);

  if (!pastPerformance) {
    return res.status(404).json({
      success: false,
      message: 'Past performance record not found'
    });
  }

  // Find similar records using the service's similarity algorithm
  const similarPP = await pastPerformanceService.findSimilarPastPerformance(req.params.id, limit);

  res.json({
    success: true,
    data: similarPP,
    basedOn: {
      id: pastPerformance.id,
      projectName: pastPerformance.projectName
    }
  });
}));

/**
 * @route POST /api/past-performance/:id/feedback
 * @desc Submit feedback for past performance search result
 * @access Private
 */
router.post('/:id/feedback', asyncHandler(async (req, res) => {
  const { feedbackType, relevanceScore, reason, searchContext } = req.body;

  if (!['thumbs_up', 'thumbs_down', 'selected'].includes(feedbackType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid feedback type'
    });
  }

  // Store feedback for learning (would integrate with SearchFeedbackService)
  const feedback = {
    pastPerformanceId: req.params.id,
    feedbackType,
    relevanceScore,
    reason,
    searchContext,
    userId: req.user?.id,
    timestamp: new Date()
  };

  logger.info(`Past performance feedback received`, feedback);

  res.json({
    success: true,
    message: 'Feedback recorded successfully'
  });
}));

/**
 * @route GET /api/past-performance/analytics/overview
 * @desc Get comprehensive analytics for past performance
 * @access Private
 */
router.get('/analytics/overview', asyncHandler(async (req, res) => {
  const analytics = await pastPerformanceService.getAnalytics();

  res.json({
    success: true,
    data: analytics
  });
}));

/**
 * @route GET /api/past-performance/analytics/technologies
 * @desc Get technology usage analytics
 * @access Private
 */
router.get('/analytics/technologies', asyncHandler(async (req, res) => {
  const technologyService = new (require('../services/TechnologyExtractionService'))();
  const analytics = await technologyService.getUsageStatistics();

  res.json({
    success: true,
    data: analytics
  });
}));

/**
 * @route POST /api/past-performance/bulk-import
 * @desc Bulk import past performance records
 * @access Private
 */
router.post('/bulk-import', upload.single('csvFile'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No CSV file provided'
    });
  }

  // This would implement CSV parsing and bulk import
  // For now, return placeholder response

  logger.info(`Bulk import initiated: ${req.file.originalname}`, {
    fileSize: req.file.size,
    userId: req.user?.id
  });

  res.json({
    success: true,
    message: 'Bulk import initiated. Processing will begin shortly.',
    data: {
      importId: Date.now().toString(),
      filename: req.file.originalname,
      status: 'processing'
    }
  });
}));

/**
 * @route GET /api/past-performance/export
 * @desc Export past performance data
 * @access Private
 */
router.get('/export', asyncHandler(async (req, res) => {
  const format = req.query.format || 'json';
  const filters = {
    customer: req.query.customer,
    customerType: req.query.customerType,
    contractType: req.query.contractType
  };

  // Remove undefined filters
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });

  const result = await pastPerformanceService.pastPerformanceModel.getAll(filters, { limit: 1000, offset: 0 });

  if (format === 'csv') {
    // Would implement CSV export
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=past_performance.csv');
    res.send('CSV export not yet implemented');
  } else {
    res.json({
      success: true,
      data: result.records,
      exportMetadata: {
        format,
        filters,
        totalRecords: result.records.length,
        exportedAt: new Date().toISOString()
      }
    });
  }
}));

module.exports = router;