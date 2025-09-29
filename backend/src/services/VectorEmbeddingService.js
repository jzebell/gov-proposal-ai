const PPEmbedding = require('../models/PPEmbedding');
const PPDocument = require('../models/PPDocument');
const Technology = require('../models/Technology');
const logger = require('../utils/logger');

/**
 * Vector Embedding Service
 * Handles document chunking, embedding generation, and vector search operations
 */
class VectorEmbeddingService {
    constructor() {
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
        this.maxChunkSize = 512; // Maximum tokens per chunk
        this.overlapSize = 50; // Overlap between chunks
        this.embeddingDimension = 1536; // Standard embedding dimension
    }

    /**
     * Generate embeddings for all documents in a past performance
     * @param {number} ppId - Past performance ID
     * @param {Object} options - Generation options
     * @returns {Object} Generation results
     */
    async generateEmbeddingsForPP(ppId, options = {}) {
        const {
            regenerate = false,
            chunkTypes = ['project_level', 'capability_level', 'outcome_level']
        } = options;

        try {
            // Get all completed documents for the PP
            const documents = await PPDocument.findByPPId(ppId);
            const completedDocs = documents.filter(doc =>
                doc.processing_status === 'completed' && doc.content_text
            );

            if (completedDocs.length === 0) {
                throw new Error('No completed documents found for embedding generation');
            }

            // Remove existing embeddings if regenerating
            if (regenerate) {
                await PPEmbedding.deleteByPPId(ppId);
                logger.info(`Removed existing embeddings for PP ${ppId}`);
            }

            // Get unified content
            const { Pool } = require('pg');
            const pool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            });

            const unifiedQuery = 'SELECT * FROM pp_unified_content WHERE pp_id = $1';
            const unifiedResult = await pool.query(unifiedQuery, [ppId]);
            const unifiedContent = unifiedResult.rows[0];

            if (!unifiedContent) {
                throw new Error('No unified content found for past performance');
            }

            const results = {
                ppId,
                totalEmbeddings: 0,
                chunkTypes: {},
                processingTime: Date.now()
            };

            // Generate different types of embeddings
            for (const chunkType of chunkTypes) {
                try {
                    const embeddings = await this.generateChunkTypeEmbeddings(
                        ppId,
                        unifiedContent,
                        chunkType,
                        completedDocs
                    );

                    results.chunkTypes[chunkType] = embeddings.length;
                    results.totalEmbeddings += embeddings.length;

                    logger.info(`Generated ${embeddings.length} ${chunkType} embeddings for PP ${ppId}`);
                } catch (error) {
                    logger.error(`Failed to generate ${chunkType} embeddings for PP ${ppId}:`, error);
                    results.chunkTypes[chunkType] = { error: error.message };
                }
            }

            results.processingTime = Date.now() - results.processingTime;

            logger.info(`Completed embedding generation for PP ${ppId}: ${results.totalEmbeddings} total embeddings in ${results.processingTime}ms`);
            return results;
        } catch (error) {
            logger.error(`Embedding generation failed for PP ${ppId}:`, error);
            throw new Error(`Embedding generation failed: ${error.message}`);
        }
    }

    /**
     * Generate embeddings for a specific chunk type
     * @param {number} ppId - Past performance ID
     * @param {Object} unifiedContent - Unified content object
     * @param {string} chunkType - Type of chunks to generate
     * @param {Array} documents - Source documents
     * @returns {Array} Generated embeddings
     */
    async generateChunkTypeEmbeddings(ppId, unifiedContent, chunkType, documents) {
        let chunks = [];

        switch (chunkType) {
            case 'project_level':
                chunks = await this.createProjectLevelChunks(unifiedContent, documents);
                break;
            case 'capability_level':
                chunks = await this.createCapabilityLevelChunks(unifiedContent, documents);
                break;
            case 'outcome_level':
                chunks = await this.createOutcomeLevelChunks(unifiedContent, documents);
                break;
            case 'technology_level':
                chunks = await this.createTechnologyLevelChunks(ppId, unifiedContent);
                break;
            default:
                throw new Error(`Unknown chunk type: ${chunkType}`);
        }

        // Generate embeddings for all chunks
        const embeddings = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            try {
                const embedding = await this.generateEmbedding(chunk.text);

                const embeddingRecord = await PPEmbedding.create({
                    ppId,
                    chunkType,
                    chunkText: chunk.text,
                    chunkSummary: chunk.summary,
                    embedding,
                    chunkMetadata: chunk.metadata,
                    chunkOrder: i,
                    tokenCount: this.estimateTokenCount(chunk.text)
                });

                embeddings.push(embeddingRecord);
            } catch (error) {
                logger.error(`Failed to create embedding for chunk ${i} of type ${chunkType}:`, error);
            }
        }

        return embeddings;
    }

    /**
     * Create project-level chunks (entire past performance as single units)
     * @param {Object} unifiedContent - Unified content
     * @param {Array} documents - Source documents
     * @returns {Array} Project-level chunks
     */
    async createProjectLevelChunks(unifiedContent, documents) {
        const chunks = [];

        // Full unified content as one chunk
        chunks.push({
            text: unifiedContent.unified_text,
            summary: unifiedContent.generated_summary || 'Complete past performance overview',
            metadata: {
                type: 'full_content',
                word_count: unifiedContent.word_count,
                document_count: documents.length,
                has_narrative: !!unifiedContent.narrative_text
            }
        });

        // Narrative-only chunk if available
        if (unifiedContent.narrative_text) {
            chunks.push({
                text: unifiedContent.narrative_text,
                summary: 'Past performance narrative content',
                metadata: {
                    type: 'narrative_only',
                    word_count: unifiedContent.narrative_text.split(/\s+/).length,
                    source: 'narrative_document'
                }
            });
        }

        return chunks;
    }

    /**
     * Create capability-level chunks (technology and methodology focused)
     * @param {Object} unifiedContent - Unified content
     * @param {Array} documents - Source documents
     * @returns {Array} Capability-level chunks
     */
    async createCapabilityLevelChunks(unifiedContent, documents) {
        const chunks = [];
        const text = unifiedContent.unified_text;

        // Split text into semantic sections
        const sections = this.splitIntoSemanticSections(text);

        for (const section of sections) {
            // Further split large sections into smaller chunks
            const subChunks = this.splitTextIntoChunks(section.content, this.maxChunkSize);

            for (let i = 0; i < subChunks.length; i++) {
                const chunkText = subChunks[i];

                // Analyze chunk for capabilities
                const capabilities = this.analyzeCapabilities(chunkText);

                if (capabilities.length > 0) {
                    chunks.push({
                        text: chunkText,
                        summary: `Capability section: ${capabilities.slice(0, 3).join(', ')}`,
                        metadata: {
                            type: 'capability',
                            section: section.type,
                            capabilities,
                            chunk_index: i,
                            total_chunks: subChunks.length
                        }
                    });
                }
            }
        }

        return chunks;
    }

    /**
     * Create outcome-level chunks (metrics and results focused)
     * @param {Object} unifiedContent - Unified content
     * @param {Array} documents - Source documents
     * @returns {Array} Outcome-level chunks
     */
    async createOutcomeLevelChunks(unifiedContent, documents) {
        const chunks = [];
        const text = unifiedContent.unified_text;

        // Find outcome-related sections
        const outcomeKeywords = [
            'result', 'outcome', 'achievement', 'success', 'delivered', 'completed',
            'performance', 'metric', 'kpi', 'improved', 'reduced', 'increased',
            'saved', 'cost', 'schedule', 'quality', 'satisfaction'
        ];

        const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);

        let currentChunk = '';
        let outcomeCount = 0;

        for (const sentence of sentences) {
            const lowerSentence = sentence.toLowerCase();
            const hasOutcomeKeyword = outcomeKeywords.some(keyword =>
                lowerSentence.includes(keyword)
            );

            if (hasOutcomeKeyword) {
                currentChunk += sentence + '. ';
                outcomeCount++;

                // Create chunk when we have enough outcome content
                if (outcomeCount >= 3 || currentChunk.length > this.maxChunkSize * 4) {
                    const outcomes = this.extractOutcomes(currentChunk);

                    if (outcomes.length > 0) {
                        chunks.push({
                            text: currentChunk.trim(),
                            summary: `Outcomes and results: ${outcomes.slice(0, 2).join(', ')}`,
                            metadata: {
                                type: 'outcomes',
                                outcome_count: outcomes.length,
                                outcomes: outcomes.slice(0, 5) // Limit metadata size
                            }
                        });
                    }

                    currentChunk = '';
                    outcomeCount = 0;
                }
            }
        }

        // Add remaining content if significant
        if (currentChunk.length > 100) {
            const outcomes = this.extractOutcomes(currentChunk);
            chunks.push({
                text: currentChunk.trim(),
                summary: `Additional outcomes: ${outcomes.slice(0, 2).join(', ')}`,
                metadata: {
                    type: 'outcomes',
                    outcome_count: outcomes.length,
                    outcomes: outcomes.slice(0, 5)
                }
            });
        }

        return chunks;
    }

    /**
     * Create technology-level chunks (technology-specific content)
     * @param {number} ppId - Past performance ID
     * @param {Object} unifiedContent - Unified content
     * @returns {Array} Technology-level chunks
     */
    async createTechnologyLevelChunks(ppId, unifiedContent) {
        const chunks = [];

        // Get technologies associated with this PP
        const technologies = await Technology.getPPTechnologies(ppId, { minConfidence: 0.6 });

        if (technologies.length === 0) {
            return chunks;
        }

        const text = unifiedContent.unified_text;

        // Create chunks focused on each technology
        for (const tech of technologies) {
            const techContent = this.extractTechnologyContent(text, tech);

            if (techContent.length > 50) {
                chunks.push({
                    text: techContent,
                    summary: `Technology usage: ${tech.technology_name}${tech.version_specific ? ` v${tech.version_specific}` : ''}`,
                    metadata: {
                        type: 'technology',
                        technology_id: tech.technology_id,
                        technology_name: tech.technology_name,
                        category: tech.category,
                        version: tech.version_specific,
                        confidence: tech.confidence_score
                    }
                });
            }
        }

        return chunks;
    }

    /**
     * Generate embedding vector using Ollama
     * @param {string} text - Text to embed
     * @returns {Array} Embedding vector
     */
    async generateEmbedding(text) {
        try {
            // For now, return a mock embedding
            // In production, this would call Ollama's embedding API

            // Mock embedding generation (replace with actual Ollama call)
            const mockEmbedding = Array.from({ length: this.embeddingDimension }, () =>
                (Math.random() - 0.5) * 2
            );

            // Normalize the vector
            const magnitude = Math.sqrt(mockEmbedding.reduce((sum, val) => sum + val * val, 0));
            return mockEmbedding.map(val => val / magnitude);

            // TODO: Replace with actual Ollama call:
            /*
            const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.embeddingModel,
                    prompt: text
                })
            });

            const data = await response.json();
            return data.embedding;
            */
        } catch (error) {
            logger.error('Failed to generate embedding:', error);
            throw new Error(`Embedding generation failed: ${error.message}`);
        }
    }

    /**
     * Perform semantic search using vector similarity
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Array} Search results with similarity scores
     */
    async semanticSearch(query, options = {}) {
        const {
            chunkTypes = ['project_level', 'capability_level'],
            limit = 10,
            minSimilarity = 0.3,
            ppFilters = {}
        } = options;

        try {
            // Generate embedding for the query
            const queryEmbedding = await this.generateEmbedding(query);

            // Perform vector search
            const results = await PPEmbedding.semanticSearch(queryEmbedding, {
                chunkTypes,
                limit,
                minSimilarity,
                ppFilters
            });

            // Enhance results with additional context
            const enhancedResults = await this.enhanceSearchResults(results, query);

            logger.info(`Semantic search completed: ${results.length} results for query "${query}"`);
            return enhancedResults;
        } catch (error) {
            logger.error('Semantic search failed:', error);
            throw new Error(`Semantic search failed: ${error.message}`);
        }
    }

    /**
     * Split text into semantic sections
     * @param {string} text - Text to split
     * @returns {Array} Semantic sections
     */
    splitIntoSemanticSections(text) {
        const sections = [];

        // Look for document type headers
        const headerPattern = /=== (\w+): ([^=]+) ===/g;
        let lastIndex = 0;
        let match;

        while ((match = headerPattern.exec(text)) !== null) {
            // Add previous section if exists
            if (lastIndex < match.index) {
                const content = text.substring(lastIndex, match.index).trim();
                if (content.length > 100) {
                    sections.push({
                        type: 'general',
                        content
                    });
                }
            }

            // Find the next header or end of text
            const nextMatch = headerPattern.exec(text);
            const endIndex = nextMatch ? nextMatch.index : text.length;
            headerPattern.lastIndex = match.index; // Reset for next iteration

            const sectionContent = text.substring(match.index, endIndex).trim();
            if (sectionContent.length > 100) {
                sections.push({
                    type: match[1].toLowerCase(),
                    title: match[2].trim(),
                    content: sectionContent
                });
            }

            lastIndex = endIndex;
        }

        // Add remaining content
        if (lastIndex < text.length) {
            const content = text.substring(lastIndex).trim();
            if (content.length > 100) {
                sections.push({
                    type: 'general',
                    content
                });
            }
        }

        // If no sections found, split by paragraphs
        if (sections.length === 0) {
            const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 100);
            paragraphs.forEach((paragraph, index) => {
                sections.push({
                    type: 'paragraph',
                    content: paragraph.trim(),
                    index
                });
            });
        }

        return sections;
    }

    /**
     * Split text into chunks with overlap
     * @param {string} text - Text to split
     * @param {number} maxTokens - Maximum tokens per chunk
     * @returns {Array} Text chunks
     */
    splitTextIntoChunks(text, maxTokens) {
        const words = text.split(/\s+/);
        const chunks = [];
        let currentChunk = [];

        for (let i = 0; i < words.length; i++) {
            currentChunk.push(words[i]);

            // Estimate tokens (roughly 1.3 words per token)
            if (currentChunk.length >= maxTokens * 0.7) {
                chunks.push(currentChunk.join(' '));

                // Start new chunk with overlap
                const overlapStart = Math.max(0, currentChunk.length - this.overlapSize);
                currentChunk = currentChunk.slice(overlapStart);
            }
        }

        // Add remaining chunk
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join(' '));
        }

        return chunks;
    }

    /**
     * Analyze text for capabilities
     * @param {string} text - Text to analyze
     * @returns {Array} Detected capabilities
     */
    analyzeCapabilities(text) {
        const capabilities = [];
        const lowerText = text.toLowerCase();

        const capabilityPatterns = {
            'software_development': ['develop', 'build', 'create', 'implement', 'code', 'program'],
            'system_integration': ['integrate', 'connect', 'interface', 'api', 'system'],
            'database_management': ['database', 'sql', 'data', 'storage', 'query'],
            'cloud_services': ['cloud', 'aws', 'azure', 'gcp', 'saas', 'paas'],
            'security': ['security', 'authentication', 'authorization', 'encryption', 'compliance'],
            'testing': ['test', 'testing', 'qa', 'quality', 'validation', 'verification'],
            'project_management': ['manage', 'project', 'agile', 'scrum', 'delivery', 'timeline']
        };

        for (const [capability, keywords] of Object.entries(capabilityPatterns)) {
            const matches = keywords.filter(keyword => lowerText.includes(keyword));
            if (matches.length >= 2) {
                capabilities.push(capability);
            }
        }

        return capabilities;
    }

    /**
     * Extract outcomes from text
     * @param {string} text - Text to analyze
     * @returns {Array} Extracted outcomes
     */
    extractOutcomes(text) {
        const outcomes = [];

        // Look for quantified outcomes
        const quantifiedPatterns = [
            /(\d+)%\s+(improvement|increase|reduction|decrease)/gi,
            /(saved|reduced|increased|improved)\s+.*?(\$[\d,]+)/gi,
            /(delivered|completed)\s+.*?(on\s+time|ahead\s+of\s+schedule)/gi,
            /(\d+)\s+(days|weeks|months)\s+(early|ahead|saved)/gi
        ];

        for (const pattern of quantifiedPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                outcomes.push(match[0].trim());
            }
        }

        return outcomes;
    }

    /**
     * Extract technology-specific content
     * @param {string} text - Full text
     * @param {Object} technology - Technology object
     * @returns {string} Technology-specific content
     */
    extractTechnologyContent(text, technology) {
        const techName = technology.technology_name;
        const sentences = text.split(/[.!?]+/).map(s => s.trim());

        let relevantContent = '';

        for (const sentence of sentences) {
            if (sentence.toLowerCase().includes(techName.toLowerCase())) {
                // Include surrounding context (previous and next sentence)
                const index = sentences.indexOf(sentence);
                const start = Math.max(0, index - 1);
                const end = Math.min(sentences.length, index + 2);

                relevantContent += sentences.slice(start, end).join('. ') + '. ';
            }
        }

        return relevantContent.trim();
    }

    /**
     * Enhance search results with additional context
     * @param {Array} results - Raw search results
     * @param {string} query - Original query
     * @returns {Array} Enhanced search results
     */
    async enhanceSearchResults(results, query) {
        const enhanced = [];

        for (const result of results) {
            // Add explanation for why this result is relevant
            const explanation = this.generateRelevanceExplanation(result, query);

            // Add related technologies if available
            const relatedTechs = await this.getRelatedTechnologies(result.pp_id);

            enhanced.push({
                ...result,
                relevance_explanation: explanation,
                related_technologies: relatedTechs.slice(0, 5) // Limit to top 5
            });
        }

        return enhanced;
    }

    /**
     * Generate relevance explanation
     * @param {Object} result - Search result
     * @param {string} query - Search query
     * @returns {Array} Explanation points
     */
    generateRelevanceExplanation(result, query) {
        const explanation = [];
        const queryWords = query.toLowerCase().split(/\s+/);
        const resultText = result.chunk_text.toLowerCase();

        // Check for direct keyword matches
        const matchedWords = queryWords.filter(word => resultText.includes(word));
        if (matchedWords.length > 0) {
            explanation.push(`Matches keywords: ${matchedWords.join(', ')}`);
        }

        // Check chunk type relevance
        switch (result.chunk_type) {
            case 'project_level':
                explanation.push('Comprehensive project overview');
                break;
            case 'capability_level':
                explanation.push('Technical capabilities and methodologies');
                break;
            case 'outcome_level':
                explanation.push('Project outcomes and results');
                break;
            case 'technology_level':
                explanation.push('Technology-specific implementation details');
                break;
        }

        // Add similarity score context
        if (result.similarity_score > 0.8) {
            explanation.push('High semantic similarity to query');
        } else if (result.similarity_score > 0.6) {
            explanation.push('Good semantic similarity to query');
        }

        return explanation;
    }

    /**
     * Get related technologies for a past performance
     * @param {number} ppId - Past performance ID
     * @returns {Array} Related technologies
     */
    async getRelatedTechnologies(ppId) {
        try {
            return await Technology.getPPTechnologies(ppId, { minConfidence: 0.5 });
        } catch (error) {
            logger.error(`Failed to get related technologies for PP ${ppId}:`, error);
            return [];
        }
    }

    /**
     * Estimate token count for text
     * @param {string} text - Text to count
     * @returns {number} Estimated token count
     */
    estimateTokenCount(text) {
        // Rough estimation: 1 token ≈ 0.75 words
        const wordCount = text.split(/\s+/).length;
        return Math.ceil(wordCount / 0.75);
    }

    /**
     * Get embedding service statistics
     * @returns {Object} Service statistics
     */
    async getStatistics() {
        try {
            const embeddingStats = await PPEmbedding.getStatistics();

            return {
                ...embeddingStats,
                configuration: {
                    embedding_model: this.embeddingModel,
                    max_chunk_size: this.maxChunkSize,
                    overlap_size: this.overlapSize,
                    embedding_dimension: this.embeddingDimension
                }
            };
        } catch (error) {
            logger.error('Failed to get embedding service statistics:', error);
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }
}

module.exports = VectorEmbeddingService;