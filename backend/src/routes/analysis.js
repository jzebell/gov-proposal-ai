const express = require('express');
const multer = require('multer');
const documentParser = require('../utils/documentParser');
const RequirementExtractor = require('../services/requirementExtractor');
const createError = require('http-errors');
const path = require('path');

const router = express.Router();

// Configure multer for file upload
const upload = multer({
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept PDF and Word documents (and text files for testing)
        if (file.mimetype === 'application/pdf' || 
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimetype === 'text/plain') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
        }
    }
});

// POST endpoint for solicitation analysis
router.post('/solicitation', upload.single('document'), async (req, res, next) => {
    try {
        // Validate file upload
        if (!req.file) {
            throw createError(400, 'No document uploaded');
        }

        // Parse document to extract text
        const fileExtension = path.extname(req.file.originalname).slice(1); // Get file extension without dot
        const extractedText = await documentParser.parseDocument(req.file.buffer, fileExtension, req.file.originalname);
        
        if (!extractedText) {
            throw createError(422, 'Failed to extract text from document');
        }

        // Extract requirements using AI service
        const extractor = new RequirementExtractor('http://ollama:11434');
        extractor.setModel('qwen2.5:14b-instruct-q4_0');
        const requirements = await extractor.extractRequirements(extractedText);

        if (!requirements) {
            throw createError(500, 'Failed to analyze requirements');
        }

        // Return structured requirements data
        res.json({
            success: true,
            data: {
                requirements,
                metadata: {
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    analyzedAt: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;