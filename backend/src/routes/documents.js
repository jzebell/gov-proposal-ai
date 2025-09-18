const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.txt', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload document endpoint
router.post('/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const documentMetadata = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            uploadDate: new Date(),
            path: req.file.path
        };

        // TODO: Save metadata to database
        
        res.status(200).json({
            message: 'Document uploaded successfully',
            document: documentMetadata
        });
    } catch (error) {
        res.status(500).json({ error: 'Error uploading document' });
    }
});

// Parse document endpoint
router.post('/parse', async (req, res) => {
    try {
        const { documentId } = req.body;
        
        if (!documentId) {
            return res.status(400).json({ error: 'Document ID is required' });
        }

        // TODO: Implement document parsing logic
        // This would include PDF/Word text extraction

        res.status(200).json({
            message: 'Document parsed successfully',
            content: 'Parsed content will go here'
        });
    } catch (error) {
        res.status(500).json({ error: 'Error parsing document' });
    }
});

// List documents endpoint
router.get('/list', async (req, res) => {
    try {
        // TODO: Implement document listing from database
        const documents = [];

        res.status(200).json({
            documents
        });
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving documents' });
    }
});

module.exports = router;