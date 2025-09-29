const Technology = require('../models/Technology');
const PPDocument = require('../models/PPDocument');
const logger = require('../utils/logger');

/**
 * Technology Extraction Service
 * Advanced technology detection with AI integration and self-growing taxonomy
 */
class TechnologyExtractionService {
    constructor() {
        this.confidenceThresholds = {
            'keyword_match': 0.6,
            'ai_extraction': 0.7,
            'manual_tag': 1.0
        };

        // Version patterns for different technologies
        this.versionPatterns = {
            'Java': [
                /java\s+(\d+)/gi,
                /jdk\s*(\d+(?:\.\d+)*)/gi,
                /openjdk\s*(\d+(?:\.\d+)*)/gi
            ],
            'React': [
                /react\s+v?(\d+(?:\.\d+)*)/gi,
                /react@(\d+(?:\.\d+)*)/gi
            ],
            'Python': [
                /python\s+(\d+(?:\.\d+)*)/gi,
                /python(\d)(?:\.\d+)*/gi
            ],
            'Node.js': [
                /node\.?js?\s+v?(\d+(?:\.\d+)*)/gi,
                /node\s+v?(\d+(?:\.\d+)*)/gi
            ],
            'Angular': [
                /angular\s+(\d+(?:\.\d+)*)/gi,
                /angular\s+v(\d+)/gi
            ]
        };

        // Context keywords that boost confidence
        this.contextKeywords = {
            technical: ['implementation', 'development', 'using', 'with', 'built', 'developed'],
            experience: ['experience', 'expertise', 'worked', 'utilized', 'employed'],
            framework: ['framework', 'platform', 'technology', 'stack', 'environment'],
            project: ['project', 'system', 'application', 'solution', 'software']
        };
    }

    /**
     * Extract all technologies from a document
     * @param {number} documentId - Document ID
     * @param {string} text - Document text content
     * @param {Object} options - Extraction options
     * @returns {Array} Extracted technologies with confidence scores
     */
    async extractFromDocument(documentId, text, options = {}) {
        const {
            useAI = false,
            minConfidence = 0.6,
            detectVersions = true,
            autoApprove = false
        } = options;

        try {
            const document = await PPDocument.findById(documentId);
            if (!document) {
                throw new Error('Document not found');
            }

            logger.info(`Starting technology extraction for document ${documentId}`);

            // Get all approved technologies for keyword matching
            const approvedTechnologies = await Technology.findAll({ approved: true });

            // Perform keyword-based extraction
            const keywordResults = await this.performKeywordExtraction(
                text,
                approvedTechnologies,
                { detectVersions, minConfidence }
            );

            // Perform AI-based extraction if enabled
            let aiResults = [];
            if (useAI) {
                aiResults = await this.performAIExtraction(text, options);
            }

            // Combine and deduplicate results
            const combinedResults = this.combineExtractionResults(keywordResults, aiResults);

            // Filter by confidence threshold
            const filteredResults = combinedResults.filter(result =>
                result.confidence >= minConfidence
            );

            // Associate technologies with the past performance
            const associations = [];
            for (const result of filteredResults) {
                try {
                    const association = await Technology.associateWithPP({
                        ppId: document.pp_id,
                        technologyId: result.technologyId,
                        versionSpecific: result.version,
                        confidenceScore: result.confidence,
                        contextSnippet: result.context,
                        documentSource: documentId,
                        detectionMethod: result.method
                    });

                    associations.push({
                        ...result,
                        associationId: association.id
                    });

                    logger.info(`Associated technology ${result.name} with PP ${document.pp_id} (confidence: ${result.confidence})`);
                } catch (error) {
                    logger.error(`Failed to associate technology ${result.name}:`, error);
                }
            }

            // Handle new technologies discovered by AI
            const newTechnologies = combinedResults.filter(result => result.isNew);
            if (newTechnologies.length > 0) {
                await this.handleNewTechnologies(newTechnologies, autoApprove);
            }

            logger.info(`Extracted ${associations.length} technologies from document ${documentId}`);

            return {
                documentId,
                extractedTechnologies: associations,
                newTechnologies: newTechnologies.length,
                processingMethod: useAI ? 'ai_enhanced' : 'keyword_only',
                totalMentions: combinedResults.reduce((sum, result) => sum + result.mentions, 0)
            };
        } catch (error) {
            logger.error(`Technology extraction failed for document ${documentId}:`, error);
            throw new Error(`Technology extraction failed: ${error.message}`);
        }
    }

    /**
     * Perform keyword-based technology extraction
     * @param {string} text - Text to analyze
     * @param {Array} technologies - List of approved technologies
     * @param {Object} options - Extraction options
     * @returns {Array} Extraction results
     */
    async performKeywordExtraction(text, technologies, options = {}) {
        const { detectVersions = true, minConfidence = 0.6 } = options;
        const results = [];

        for (const tech of technologies) {
            const mentions = this.findTechnologyMentions(text, tech);

            if (mentions.length > 0) {
                const confidence = this.calculateConfidence(mentions, text, tech, 'keyword_match');

                if (confidence >= minConfidence) {
                    let version = null;

                    // Extract version information if requested
                    if (detectVersions) {
                        version = this.extractVersionInfo(text, tech.name);
                    }

                    results.push({
                        technologyId: tech.id,
                        name: tech.name,
                        category: tech.category,
                        confidence,
                        version,
                        mentions: mentions.length,
                        context: mentions[0].context,
                        method: 'keyword_match',
                        isNew: false
                    });
                }
            }
        }

        return results;
    }

    /**
     * Perform AI-based technology extraction (future integration with Ollama)
     * @param {string} text - Text to analyze
     * @param {Object} options - Extraction options
     * @returns {Array} AI extraction results
     */
    async performAIExtraction(text, options = {}) {
        // Placeholder for AI extraction using Ollama
        // This will be implemented in a future iteration
        logger.info('AI extraction requested but not yet implemented');

        // For now, return empty results
        // In the future, this would call Ollama with a prompt like:
        /*
        const prompt = `
        Analyze the following text and extract all technologies, programming languages,
        frameworks, databases, and tools mentioned. For each technology found:
        1. Provide the technology name
        2. Categorize it (platform, language, framework, tool, database, cloud, methodology)
        3. Extract version information if mentioned
        4. Provide a confidence score (0.0-1.0)
        5. Include the context where it was mentioned

        Text to analyze:
        ${text}

        Return the results in JSON format.
        `;

        const aiResponse = await this.callOllama(prompt);
        return this.parseAIResponse(aiResponse);
        */

        return [];
    }

    /**
     * Find technology mentions in text with context
     * @param {string} text - Text to search
     * @param {Object} technology - Technology object
     * @returns {Array} Mentions with context
     */
    findTechnologyMentions(text, technology) {
        const mentions = [];
        const searchTerms = [technology.name, ...(technology.aliases || [])];

        for (const term of searchTerms) {
            // Create regex patterns for different mention types
            const patterns = [
                new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi'), // Exact word match
                new RegExp(`${this.escapeRegex(term)}(?:\\s+\\d+(?:\\.\\d+)*)`, 'gi'), // With version
                new RegExp(`${this.escapeRegex(term)}[\\s-]+(framework|platform|technology)`, 'gi') // With descriptors
            ];

            for (const pattern of patterns) {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const start = Math.max(0, match.index - 100);
                    const end = Math.min(text.length, match.index + term.length + 100);
                    const context = text.substring(start, end).trim();

                    mentions.push({
                        term,
                        matchedText: match[0],
                        position: match.index,
                        context,
                        pattern: pattern.source
                    });
                }
            }
        }

        // Remove duplicates based on position
        const uniqueMentions = mentions.filter((mention, index, array) =>
            index === array.findIndex(m => Math.abs(m.position - mention.position) < 10)
        );

        return uniqueMentions;
    }

    /**
     * Calculate confidence score for technology detection
     * @param {Array} mentions - Array of mentions
     * @param {string} text - Full text
     * @param {Object} technology - Technology object
     * @param {string} method - Detection method
     * @returns {number} Confidence score (0.0-1.0)
     */
    calculateConfidence(mentions, text, technology, method) {
        const baseConfidence = this.confidenceThresholds[method] || 0.5;
        let confidence = baseConfidence;

        // Factor 1: Mention frequency
        const frequency = mentions.length / (text.length / 1000); // per 1000 chars
        confidence += Math.min(frequency * 0.1, 0.2);

        // Factor 2: Multiple mentions boost
        if (mentions.length > 1) {
            confidence += 0.1;
        }

        // Factor 3: Context analysis
        const contextText = mentions.map(m => m.context).join(' ').toLowerCase();
        let contextBoost = 0;

        for (const [category, keywords] of Object.entries(this.contextKeywords)) {
            const matchedKeywords = keywords.filter(keyword =>
                contextText.includes(keyword)
            );

            if (matchedKeywords.length > 0) {
                contextBoost += matchedKeywords.length * 0.02;
            }
        }

        confidence += Math.min(contextBoost, 0.15);

        // Factor 4: Technology category-specific adjustments
        switch (technology.category) {
            case 'language':
                confidence += 0.05; // Programming languages are usually explicit
                break;
            case 'framework':
                confidence += 0.03; // Frameworks are usually clearly mentioned
                break;
            case 'methodology':
                confidence -= 0.05; // Methodologies can be more ambiguous
                break;
        }

        // Factor 5: Version information presence
        const hasVersion = mentions.some(m =>
            /\d+(?:\.\d+)*/.test(m.matchedText) || /v\d+/.test(m.context)
        );
        if (hasVersion) {
            confidence += 0.1;
        }

        // Ensure confidence is within bounds
        return Math.min(Math.max(confidence, 0.0), 1.0);
    }

    /**
     * Extract version information for a technology
     * @param {string} text - Text to search
     * @param {string} technologyName - Technology name
     * @returns {string|null} Version information
     */
    extractVersionInfo(text, technologyName) {
        const patterns = this.versionPatterns[technologyName] || [
            new RegExp(`${this.escapeRegex(technologyName)}\\s+v?(\\d+(?:\\.\\d+)*)`, 'gi'),
            new RegExp(`${this.escapeRegex(technologyName)}\\s+(\\d+)(?!\\.)`, 'gi')
        ];

        for (const pattern of patterns) {
            const match = pattern.exec(text);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Combine results from different extraction methods
     * @param {Array} keywordResults - Keyword extraction results
     * @param {Array} aiResults - AI extraction results
     * @returns {Array} Combined and deduplicated results
     */
    combineExtractionResults(keywordResults, aiResults) {
        const combined = [...keywordResults];

        // Add AI results that don't conflict with keyword results
        for (const aiResult of aiResults) {
            const existing = combined.find(result =>
                result.name.toLowerCase() === aiResult.name.toLowerCase()
            );

            if (existing) {
                // Merge results, taking higher confidence
                if (aiResult.confidence > existing.confidence) {
                    existing.confidence = aiResult.confidence;
                    existing.method = 'ai_enhanced';
                }
            } else {
                combined.push(aiResult);
            }
        }

        // Sort by confidence descending
        return combined.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Handle newly discovered technologies
     * @param {Array} newTechnologies - Array of new technologies
     * @param {boolean} autoApprove - Whether to auto-approve technologies
     * @returns {Array} Created technology records
     */
    async handleNewTechnologies(newTechnologies, autoApprove = false) {
        const createdTechnologies = [];

        for (const tech of newTechnologies) {
            try {
                // Check if technology already exists
                const existing = await Technology.findByName(tech.name);
                if (existing) {
                    continue;
                }

                // Create new technology record
                const newTech = await Technology.create({
                    name: tech.name,
                    category: tech.category || 'other',
                    description: `Automatically detected technology: ${tech.name}`,
                    approved: autoApprove,
                    confidenceThreshold: 0.7
                });

                createdTechnologies.push(newTech);

                logger.info(`Created new technology: ${tech.name} (auto-approved: ${autoApprove})`);
            } catch (error) {
                logger.error(`Failed to create new technology ${tech.name}:`, error);
            }
        }

        return createdTechnologies;
    }

    /**
     * Bulk extract technologies from multiple documents
     * @param {Array} documentIds - Array of document IDs
     * @param {Object} options - Extraction options
     * @returns {Object} Bulk extraction results
     */
    async bulkExtractFromDocuments(documentIds, options = {}) {
        const results = {
            processed: 0,
            failed: 0,
            totalTechnologies: 0,
            errors: []
        };

        for (const documentId of documentIds) {
            try {
                const document = await PPDocument.findById(documentId);
                if (!document || !document.content_text) {
                    results.failed++;
                    continue;
                }

                const extractionResult = await this.extractFromDocument(
                    documentId,
                    document.content_text,
                    options
                );

                results.processed++;
                results.totalTechnologies += extractionResult.extractedTechnologies.length;

                logger.info(`Bulk extraction completed for document ${documentId}: ${extractionResult.extractedTechnologies.length} technologies`);
            } catch (error) {
                results.failed++;
                results.errors.push({
                    documentId,
                    error: error.message
                });

                logger.error(`Bulk extraction failed for document ${documentId}:`, error);
            }
        }

        return results;
    }

    /**
     * Regenerate technology associations for a past performance
     * @param {number} ppId - Past performance ID
     * @param {Object} options - Regeneration options
     * @returns {Object} Regeneration results
     */
    async regenerateTechnologies(ppId, options = {}) {
        try {
            const { Pool } = require('pg');
            const pool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            });

            // Remove existing technology associations
            await pool.query('DELETE FROM pp_technologies WHERE pp_id = $1', [ppId]);

            // Get all documents for the past performance
            const documents = await PPDocument.findByPPId(ppId);
            const processedDocs = documents.filter(doc =>
                doc.processing_status === 'completed' && doc.content_text
            );

            const results = {
                ppId,
                documentsProcessed: 0,
                totalTechnologies: 0,
                errors: []
            };

            // Extract technologies from each document
            for (const document of processedDocs) {
                try {
                    const extractionResult = await this.extractFromDocument(
                        document.id,
                        document.content_text,
                        options
                    );

                    results.documentsProcessed++;
                    results.totalTechnologies += extractionResult.extractedTechnologies.length;
                } catch (error) {
                    results.errors.push({
                        documentId: document.id,
                        error: error.message
                    });
                }
            }

            logger.info(`Regenerated technologies for PP ${ppId}: ${results.totalTechnologies} technologies from ${results.documentsProcessed} documents`);
            return results;
        } catch (error) {
            logger.error(`Failed to regenerate technologies for PP ${ppId}:`, error);
            throw new Error(`Technology regeneration failed: ${error.message}`);
        }
    }

    /**
     * Get extraction statistics
     * @returns {Object} Extraction statistics
     */
    async getExtractionStats() {
        try {
            const { Pool } = require('pg');
            const pool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            });

            const statsQuery = `
                SELECT
                    detection_method,
                    COUNT(*) as association_count,
                    AVG(confidence_score) as avg_confidence,
                    MIN(confidence_score) as min_confidence,
                    MAX(confidence_score) as max_confidence
                FROM pp_technologies
                GROUP BY detection_method
                ORDER BY association_count DESC
            `;

            const confidenceQuery = `
                SELECT
                    CASE
                        WHEN confidence_score >= 0.9 THEN 'High (0.9+)'
                        WHEN confidence_score >= 0.7 THEN 'Medium (0.7-0.9)'
                        WHEN confidence_score >= 0.5 THEN 'Low (0.5-0.7)'
                        ELSE 'Very Low (<0.5)'
                    END as confidence_range,
                    COUNT(*) as count
                FROM pp_technologies
                GROUP BY confidence_range
                ORDER BY MIN(confidence_score) DESC
            `;

            const [statsResult, confidenceResult] = await Promise.all([
                pool.query(statsQuery),
                pool.query(confidenceQuery)
            ]);

            return {
                byMethod: statsResult.rows,
                byConfidence: confidenceResult.rows,
                supportedMethods: Object.keys(this.confidenceThresholds),
                defaultThresholds: this.confidenceThresholds
            };
        } catch (error) {
            logger.error('Failed to get extraction statistics:', error);
            throw new Error(`Failed to get extraction statistics: ${error.message}`);
        }
    }

    /**
     * Escape special regex characters
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Validate extraction options
     * @param {Object} options - Options to validate
     * @returns {Object} Validated options
     */
    validateOptions(options) {
        const defaults = {
            useAI: false,
            minConfidence: 0.6,
            detectVersions: true,
            autoApprove: false
        };

        return {
            ...defaults,
            ...options,
            minConfidence: Math.max(0.0, Math.min(1.0, options.minConfidence || defaults.minConfidence))
        };
    }
}

module.exports = TechnologyExtractionService;