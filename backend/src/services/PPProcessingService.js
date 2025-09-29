const fs = require('fs').promises;
const path = require('path');
const DocumentManagerService = require('./DocumentManagerService');
const PPDocument = require('../models/PPDocument');
const Technology = require('../models/Technology');
const logger = require('../utils/logger');

/**
 * Past Performance Processing Service
 * Handles document upload, content extraction, and processing pipeline
 */
class PPProcessingService {
    constructor() {
        this.documentManager = new DocumentManagerService();
        this.supportedTypes = ['pdf', 'docx', 'doc', 'txt', 'xlsx'];
        this.maxFileSize = 25 * 1024 * 1024; // 25MB
    }

    /**
     * Process uploaded documents for a past performance
     * @param {number} ppId - Past performance ID
     * @param {Array} files - Array of uploaded files
     * @param {Object} options - Processing options
     * @returns {Object} Processing results
     */
    async processUploadedDocuments(ppId, files, options = {}) {
        const {
            userId,
            validateOnly = false,
            weightFactors = {}
        } = options;

        const results = {
            success: [],
            errors: [],
            totalFiles: files.length,
            processedFiles: 0
        };

        try {
            // Validate all files first
            const validationResults = await this.validateFiles(files);

            if (validationResults.errors.length > 0 && !options.continueOnError) {
                return {
                    ...results,
                    errors: validationResults.errors,
                    validationFailed: true
                };
            }

            if (validateOnly) {
                return {
                    ...results,
                    validation: validationResults,
                    validated: true
                };
            }

            // Process each file
            for (const file of files) {
                try {
                    const processResult = await this.processSingleDocument(ppId, file, {
                        userId,
                        weightFactor: weightFactors[file.originalname] || this.getDefaultWeight(file)
                    });

                    results.success.push(processResult);
                    results.processedFiles++;

                    logger.info(`Successfully processed document: ${file.originalname} for PP ${ppId}`);
                } catch (error) {
                    const errorDetails = {
                        fileName: file.originalname,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    };

                    results.errors.push(errorDetails);
                    logger.error(`Failed to process document: ${file.originalname}`, error);
                }
            }

            // Generate unified content if we have successful documents
            if (results.success.length > 0) {
                try {
                    await this.generateUnifiedContent(ppId);
                    logger.info(`Generated unified content for PP ${ppId}`);
                } catch (error) {
                    logger.error(`Failed to generate unified content for PP ${ppId}:`, error);
                    results.errors.push({
                        stage: 'unified_content',
                        error: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            logger.error('Error in document processing pipeline:', error);
            throw new Error(`Document processing failed: ${error.message}`);
        }
    }

    /**
     * Process a single document
     * @param {number} ppId - Past performance ID
     * @param {Object} file - Uploaded file object
     * @param {Object} options - Processing options
     * @returns {Object} Processing result
     */
    async processSingleDocument(ppId, file, options = {}) {
        const { userId, weightFactor } = options;

        // Determine document type based on filename and content
        const documentType = this.determineDocumentType(file.originalname);

        // Save file to filesystem
        const filePath = await this.saveUploadedFile(ppId, file);

        // Create document record
        const documentRecord = await PPDocument.create({
            ppId,
            documentType,
            fileName: file.originalname,
            filePath,
            fileSize: file.size,
            weightFactor
        });

        // Queue for text extraction
        await this.queueForTextExtraction(documentRecord.id);

        return {
            documentId: documentRecord.id,
            fileName: file.originalname,
            documentType,
            filePath,
            fileSize: file.size,
            weightFactor,
            status: 'queued_for_processing'
        };
    }

    /**
     * Extract text content from a document
     * @param {number} documentId - Document ID
     * @returns {Object} Extraction result
     */
    async extractDocumentText(documentId) {
        try {
            const document = await PPDocument.findById(documentId);
            if (!document) {
                throw new Error('Document not found');
            }

            // Update status to processing
            await PPDocument.updateContent(documentId, {
                processingStatus: 'processing'
            });

            // Extract text using DocumentManagerService
            const extractedText = await this.documentManager.extractTextFromFile(document.file_path);

            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('No text content could be extracted from document');
            }

            // Update document with extracted content
            const updatedDocument = await PPDocument.updateContent(documentId, {
                contentText: extractedText,
                processingStatus: 'completed',
                processedAt: new Date()
            });

            logger.info(`Text extraction completed for document ${documentId}: ${extractedText.length} characters`);

            // Trigger technology extraction
            await this.extractTechnologies(documentId, extractedText);

            return {
                documentId,
                textLength: extractedText.length,
                wordCount: extractedText.split(/\s+/).length,
                processingTime: new Date() - new Date(document.uploaded_at)
            };
        } catch (error) {
            // Update status to error
            await PPDocument.updateContent(documentId, {
                processingStatus: 'error',
                errorMessage: error.message,
                processedAt: new Date()
            });

            logger.error(`Text extraction failed for document ${documentId}:`, error);
            throw error;
        }
    }

    /**
     * Extract technologies from document text
     * @param {number} documentId - Document ID
     * @param {string} text - Document text content
     * @returns {Array} Extracted technologies
     */
    async extractTechnologies(documentId, text) {
        try {
            const document = await PPDocument.findById(documentId);
            if (!document) {
                throw new Error('Document not found');
            }

            // Get all approved technologies for matching
            const allTechnologies = await Technology.findAll({ approved: true });

            const extractedTechnologies = [];

            // Simple keyword matching (will be enhanced with AI in later iteration)
            for (const tech of allTechnologies) {
                const mentions = this.findTechnologyMentions(text, tech);

                if (mentions.length > 0) {
                    // Calculate confidence based on mention frequency and context
                    const confidence = this.calculateTechnologyConfidence(mentions, text.length);

                    if (confidence >= tech.confidence_threshold) {
                        // Extract version if mentioned
                        const versionInfo = this.extractVersionInfo(text, tech.name);

                        // Associate technology with past performance
                        const association = await Technology.associateWithPP({
                            ppId: document.pp_id,
                            technologyId: tech.id,
                            versionSpecific: versionInfo,
                            confidenceScore: confidence,
                            contextSnippet: mentions[0].context,
                            documentSource: documentId,
                            detectionMethod: 'keyword_match'
                        });

                        extractedTechnologies.push({
                            technologyId: tech.id,
                            name: tech.name,
                            category: tech.category,
                            confidence,
                            versionInfo,
                            mentions: mentions.length,
                            associationId: association.id
                        });
                    }
                }
            }

            logger.info(`Extracted ${extractedTechnologies.length} technologies from document ${documentId}`);
            return extractedTechnologies;
        } catch (error) {
            logger.error(`Technology extraction failed for document ${documentId}:`, error);
            throw error;
        }
    }

    /**
     * Generate unified content from all documents in a past performance
     * @param {number} ppId - Past performance ID
     * @returns {Object} Unified content
     */
    async generateUnifiedContent(ppId) {
        try {
            // Get all completed documents for the PP
            const documents = await PPDocument.findByPPId(ppId);
            const completedDocs = documents.filter(doc =>
                doc.processing_status === 'completed' && doc.content_text
            );

            if (completedDocs.length === 0) {
                throw new Error('No completed documents found for unified content generation');
            }

            // Sort documents by weight factor (narrative first)
            completedDocs.sort((a, b) => b.weight_factor - a.weight_factor);

            // Separate narrative content
            const narrativeDoc = completedDocs.find(doc => doc.document_type === 'narrative');
            const narrativeText = narrativeDoc ? narrativeDoc.content_text : '';

            // Combine all document content with weights
            let unifiedText = '';
            let totalWords = 0;

            for (const doc of completedDocs) {
                const weight = doc.weight_factor || 1.0;
                const content = doc.content_text || '';

                // Add document header
                unifiedText += `\n\n=== ${doc.document_type.toUpperCase()}: ${doc.file_name} ===\n`;
                unifiedText += content;

                totalWords += content.split(/\s+/).length;
            }

            // Generate summary (placeholder for AI-generated summary)
            const summary = this.generateContentSummary(unifiedText, narrativeText);

            // Update or create unified content record
            const { Pool } = require('pg');
            const pool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            });

            const query = `
                INSERT INTO pp_unified_content (
                    pp_id, unified_text, narrative_text, generated_summary,
                    word_count, last_updated, version
                )
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 1)
                ON CONFLICT (pp_id)
                DO UPDATE SET
                    unified_text = EXCLUDED.unified_text,
                    narrative_text = EXCLUDED.narrative_text,
                    generated_summary = EXCLUDED.generated_summary,
                    word_count = EXCLUDED.word_count,
                    last_updated = CURRENT_TIMESTAMP,
                    version = pp_unified_content.version + 1
                RETURNING *
            `;

            const result = await pool.query(query, [
                ppId, unifiedText, narrativeText, summary, totalWords
            ]);

            logger.info(`Generated unified content for PP ${ppId}: ${totalWords} words, version ${result.rows[0].version}`);

            return {
                ppId,
                unifiedLength: unifiedText.length,
                wordCount: totalWords,
                documentsProcessed: completedDocs.length,
                version: result.rows[0].version,
                hasNarrative: !!narrativeText
            };
        } catch (error) {
            logger.error(`Failed to generate unified content for PP ${ppId}:`, error);
            throw error;
        }
    }

    /**
     * Validate uploaded files
     * @param {Array} files - Array of uploaded files
     * @returns {Object} Validation results
     */
    async validateFiles(files) {
        const errors = [];
        const warnings = [];

        for (const file of files) {
            // Check file size
            if (file.size > this.maxFileSize) {
                errors.push({
                    fileName: file.originalname,
                    error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum (25MB)`
                });
                continue;
            }

            // Check file type
            const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
            if (!this.supportedTypes.includes(fileExtension)) {
                errors.push({
                    fileName: file.originalname,
                    error: `File type '${fileExtension}' not supported. Supported types: ${this.supportedTypes.join(', ')}`
                });
                continue;
            }

            // Check for potentially problematic files
            if (file.size < 100) {
                warnings.push({
                    fileName: file.originalname,
                    warning: 'File appears to be very small and may be empty'
                });
            }
        }

        return { errors, warnings };
    }

    /**
     * Save uploaded file to filesystem
     * @param {number} ppId - Past performance ID
     * @param {Object} file - Uploaded file object
     * @returns {string} File path
     */
    async saveUploadedFile(ppId, file) {
        try {
            // Create directory structure: uploads/pp/{ppId}/
            const uploadDir = path.join(process.env.UPLOAD_PATH || './uploads', 'pp', ppId.toString());
            await fs.mkdir(uploadDir, { recursive: true });

            // Generate unique filename to prevent conflicts
            const timestamp = Date.now();
            const fileExtension = path.extname(file.originalname);
            const baseName = path.basename(file.originalname, fileExtension);
            const safeFileName = `${baseName}_${timestamp}${fileExtension}`;

            const filePath = path.join(uploadDir, safeFileName);

            // Write file data
            await fs.writeFile(filePath, file.buffer);

            return filePath;
        } catch (error) {
            logger.error(`Failed to save uploaded file ${file.originalname}:`, error);
            throw new Error(`File save failed: ${error.message}`);
        }
    }

    /**
     * Determine document type based on filename
     * @param {string} fileName - Original filename
     * @returns {string} Document type
     */
    determineDocumentType(fileName) {
        const lowerName = fileName.toLowerCase();

        if (lowerName.includes('narrative') || lowerName.includes('writeup')) {
            return 'narrative';
        }
        if (lowerName.includes('pws') || lowerName.includes('sow') || lowerName.includes('statement')) {
            return 'pws_sow';
        }
        if (lowerName.includes('qasp') || lowerName.includes('quality')) {
            return 'qasp';
        }
        if (lowerName.includes('cpars') || lowerName.includes('performance')) {
            return 'cpars';
        }
        if (lowerName.includes('government') || lowerName.includes('review') || lowerName.includes('eval')) {
            return 'govt_review';
        }
        if (lowerName.includes('contract') || lowerName.includes('history')) {
            return 'contract_history';
        }

        return 'other';
    }

    /**
     * Get default weight factor based on document type
     * @param {Object} file - File object
     * @returns {number} Weight factor
     */
    getDefaultWeight(file) {
        const documentType = this.determineDocumentType(file.originalname);

        const weights = {
            'narrative': 2.0,
            'pws_sow': 1.5,
            'qasp': 1.3,
            'cpars': 1.2,
            'govt_review': 1.1,
            'contract_history': 1.0,
            'other': 1.0
        };

        return weights[documentType] || 1.0;
    }

    /**
     * Queue document for text extraction
     * @param {number} documentId - Document ID
     */
    async queueForTextExtraction(documentId) {
        // For now, process immediately. In production, this would use a job queue
        setImmediate(async () => {
            try {
                await this.extractDocumentText(documentId);
            } catch (error) {
                logger.error(`Queued text extraction failed for document ${documentId}:`, error);
            }
        });
    }

    /**
     * Find technology mentions in text
     * @param {string} text - Text to search
     * @param {Object} technology - Technology object
     * @returns {Array} Array of mentions with context
     */
    findTechnologyMentions(text, technology) {
        const mentions = [];
        const searchTerms = [technology.name, ...(technology.aliases || [])];

        for (const term of searchTerms) {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            let match;

            while ((match = regex.exec(text)) !== null) {
                const start = Math.max(0, match.index - 50);
                const end = Math.min(text.length, match.index + term.length + 50);
                const context = text.substring(start, end);

                mentions.push({
                    term,
                    position: match.index,
                    context: context.trim()
                });
            }
        }

        return mentions;
    }

    /**
     * Calculate technology confidence score
     * @param {Array} mentions - Array of mentions
     * @param {number} textLength - Total text length
     * @returns {number} Confidence score (0.0 - 1.0)
     */
    calculateTechnologyConfidence(mentions, textLength) {
        const mentionCount = mentions.length;
        const frequency = mentionCount / (textLength / 1000); // mentions per 1000 characters

        // Base confidence from frequency
        let confidence = Math.min(0.5 + (frequency * 0.1), 0.9);

        // Boost for multiple mentions
        if (mentionCount > 1) {
            confidence += 0.1;
        }

        // Boost for technical context keywords
        const technicalKeywords = ['implementation', 'development', 'using', 'with', 'framework', 'platform', 'technology'];
        const contextText = mentions.map(m => m.context).join(' ').toLowerCase();

        for (const keyword of technicalKeywords) {
            if (contextText.includes(keyword)) {
                confidence += 0.05;
                break;
            }
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Extract version information for a technology
     * @param {string} text - Text to search
     * @param {string} technologyName - Technology name
     * @returns {string|null} Version information
     */
    extractVersionInfo(text, technologyName) {
        // Look for version patterns near technology mentions
        const versionPatterns = [
            new RegExp(`${technologyName}\\s+v?(\\d+\\.\\d+(?:\\.\\d+)?)`, 'gi'),
            new RegExp(`${technologyName}\\s+(\\d+)`, 'gi'),
            new RegExp(`${technologyName}\\s+([^\\s]+)`, 'gi')
        ];

        for (const pattern of versionPatterns) {
            const match = pattern.exec(text);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Generate content summary
     * @param {string} unifiedText - Unified text content
     * @param {string} narrativeText - Narrative text content
     * @returns {string} Generated summary
     */
    generateContentSummary(unifiedText, narrativeText) {
        // Simple extractive summary (will be enhanced with AI in later iteration)
        const primaryText = narrativeText || unifiedText;
        const sentences = primaryText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);

        // Take first few sentences as summary
        const summaryLength = Math.min(3, sentences.length);
        return sentences.slice(0, summaryLength).join('. ') + '.';
    }

    /**
     * Get processing statistics
     * @returns {Object} Processing statistics
     */
    async getProcessingStats() {
        try {
            const stats = await PPDocument.getProcessingStats();
            return {
                ...stats,
                supportedTypes: this.supportedTypes,
                maxFileSize: this.maxFileSize,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Failed to get processing stats:', error);
            throw error;
        }
    }
}

module.exports = PPProcessingService;