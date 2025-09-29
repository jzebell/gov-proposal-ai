const PPEmbedding = require('../models/PPEmbedding');
const Technology = require('../models/Technology');
const VectorEmbeddingService = require('./VectorEmbeddingService');
const PastPerformanceService = require('./PastPerformanceService');
const logger = require('../utils/logger');

/**
 * Past Performance Search Service
 * Handles complex search and matching operations with configurable ranking
 */
class PPSearchService {
    constructor() {
        this.vectorService = new VectorEmbeddingService();
        this.ppService = new PastPerformanceService();

        // Default search weights (user-configurable)
        this.defaultWeights = {
            technology: 0.40,
            domain: 0.30,
            contractSize: 0.20,
            customerType: 0.10,
            recency: 0.0
        };

        this.searchModes = ['project_context', 'free_text', 'research'];
    }

    /**
     * Perform project-context search using solicitation requirements
     * @param {Object} searchParams - Search parameters
     * @returns {Object} Search results with explanations
     */
    async projectContextSearch(searchParams) {
        const {
            projectId,
            searchWeights = this.defaultWeights,
            includeSubcontractor = false,
            limit = 3,
            showMoreCount = 0
        } = searchParams;

        try {
            logger.info(`Starting project-context search for project ${projectId}`);

            // Get project documents and solicitation requirements
            const projectContext = await this.getProjectContext(projectId);

            if (!projectContext.requirements) {
                throw new Error('No past performance requirements found in solicitation');
            }

            // Parse solicitation requirements
            const parsedRequirements = await this.parseSolicitationRequirements(
                projectContext.requirements
            );

            // Perform multi-criteria search
            const searchResults = await this.performMultiCriteriaSearch({
                requirements: parsedRequirements,
                weights: searchWeights,
                includeSubcontractor,
                limit: limit + showMoreCount,
                projectContext
            });

            // Generate explanations for each result
            const resultsWithExplanations = await this.generateSearchExplanations(
                searchResults,
                parsedRequirements,
                searchWeights
            );

            logger.info(`Project-context search completed: ${resultsWithExplanations.length} results`);

            return {
                searchType: 'project_context',
                projectId,
                requirements: parsedRequirements,
                weights: searchWeights,
                results: resultsWithExplanations,
                totalFound: searchResults.length,
                searchTime: Date.now()
            };
        } catch (error) {
            logger.error('Project-context search failed:', error);
            throw new Error(`Project-context search failed: ${error.message}`);
        }
    }

    /**
     * Perform free-text search within project context
     * @param {Object} searchParams - Search parameters
     * @returns {Object} Search results
     */
    async freeTextSearch(searchParams) {
        const {
            query,
            projectId,
            searchWeights = this.defaultWeights,
            filters = {},
            limit = 10
        } = searchParams;

        try {
            logger.info(`Starting free-text search: "${query}"`);

            // Combine semantic and keyword search
            const semanticResults = await this.vectorService.semanticSearch(query, {
                limit: limit * 2, // Get more for filtering
                ppFilters: this.buildPPFilters(filters, searchWeights)
            });

            const keywordResults = await this.ppService.searchByText(query, {
                limit: limit * 2
            });

            // Merge and rank results
            const mergedResults = await this.mergeSearchResults(
                semanticResults,
                keywordResults,
                searchWeights
            );

            // Apply additional filtering
            const filteredResults = await this.applySearchFilters(
                mergedResults,
                filters
            );

            // Generate explanations
            const resultsWithExplanations = await this.generateFreeTextExplanations(
                filteredResults.slice(0, limit),
                query,
                searchWeights
            );

            logger.info(`Free-text search completed: ${resultsWithExplanations.length} results`);

            return {
                searchType: 'free_text',
                query,
                projectId,
                weights: searchWeights,
                filters,
                results: resultsWithExplanations,
                totalFound: filteredResults.length,
                searchTime: Date.now()
            };
        } catch (error) {
            logger.error('Free-text search failed:', error);
            throw new Error(`Free-text search failed: ${error.message}`);
        }
    }

    /**
     * Perform standalone research search (outside project context)
     * @param {Object} searchParams - Search parameters
     * @returns {Object} Research results
     */
    async researchSearch(searchParams) {
        const {
            query,
            returnSummaryOnly = true,
            limit = 5,
            filters = {}
        } = searchParams;

        try {
            logger.info(`Starting research search: "${query}"`);

            // Focus on high-level past performance matching
            const searchResults = await this.vectorService.semanticSearch(query, {
                chunkTypes: ['project_level'], // Only project-level for research
                limit: limit * 3,
                minSimilarity: 0.4,
                ppFilters: this.buildPPFilters(filters)
            });

            // Group by past performance and deduplicate
            const groupedResults = this.groupByPastPerformance(searchResults);

            // Get top results
            const topResults = Object.values(groupedResults)
                .sort((a, b) => b.maxSimilarity - a.maxSimilarity)
                .slice(0, limit);

            // Format for research display
            const researchResults = await Promise.all(
                topResults.map(async (group) => {
                    const ppDetails = await this.ppService.getById(group.ppId, {
                        includeDocuments: false,
                        includeTechnologies: true,
                        includeUnifiedContent: returnSummaryOnly
                    });

                    return {
                        ppId: group.ppId,
                        name: ppDetails.name,
                        customer: ppDetails.customer,
                        contractValue: ppDetails.contract_value,
                        role: ppDetails.role,
                        period: {
                            start: ppDetails.period_start,
                            end: ppDetails.period_end
                        },
                        summary: returnSummaryOnly ?
                            (ppDetails.unifiedContent?.generated_summary || 'No summary available') :
                            group.bestMatch.chunk_text.substring(0, 500) + '...',
                        relevanceScore: group.maxSimilarity,
                        explanation: [
                            `• ${Math.round(group.maxSimilarity * 100)}% semantic similarity to query`,
                            `• ${ppDetails.role} contractor role`,
                            `• $${ppDetails.contract_value?.toLocaleString() || 'N/A'} contract value`,
                            `• ${ppDetails.technologies?.length || 0} technologies identified`
                        ],
                        keyTechnologies: ppDetails.technologies
                            ?.slice(0, 5)
                            .map(t => t.technology_name) || []
                    };
                })
            );

            logger.info(`Research search completed: ${researchResults.length} results`);

            return {
                searchType: 'research',
                query,
                results: researchResults,
                totalFound: topResults.length,
                searchTime: Date.now()
            };
        } catch (error) {
            logger.error('Research search failed:', error);
            throw new Error(`Research search failed: ${error.message}`);
        }
    }

    /**
     * Get user's search configuration or system default
     * @param {number} userId - User ID
     * @returns {Object} Search configuration
     */
    async getSearchConfiguration(userId) {
        try {
            const { Pool } = require('pg');
            const pool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            });

            // Get user's default configuration
            let query = `
                SELECT * FROM search_configurations
                WHERE user_id = $1 AND is_default = true
                LIMIT 1
            `;

            let result = await pool.query(query, [userId]);

            // Fall back to system default if no user default
            if (result.rows.length === 0) {
                query = `
                    SELECT * FROM search_configurations
                    WHERE is_system_default = true
                    LIMIT 1
                `;
                result = await pool.query(query);
            }

            // Create default if none exists
            if (result.rows.length === 0) {
                const defaultConfig = {
                    config_name: 'Default Weights',
                    ...this.defaultWeights,
                    is_system_default: true
                };

                query = `
                    INSERT INTO search_configurations (
                        config_name, technology_weight, domain_weight,
                        contract_size_weight, customer_type_weight, recency_weight,
                        is_system_default
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `;

                const values = [
                    defaultConfig.config_name,
                    defaultConfig.technology,
                    defaultConfig.domain,
                    defaultConfig.contractSize,
                    defaultConfig.customerType,
                    defaultConfig.recency,
                    defaultConfig.is_system_default
                ];

                result = await pool.query(query, values);
            }

            const config = result.rows[0];
            return {
                id: config.id,
                name: config.config_name,
                weights: {
                    technology: config.technology_weight,
                    domain: config.domain_weight,
                    contractSize: config.contract_size_weight,
                    customerType: config.customer_type_weight,
                    recency: config.recency_weight
                },
                isDefault: config.is_default,
                isSystemDefault: config.is_system_default
            };
        } catch (error) {
            logger.error('Failed to get search configuration:', error);
            return {
                id: null,
                name: 'Fallback Default',
                weights: this.defaultWeights,
                isDefault: false,
                isSystemDefault: false
            };
        }
    }

    /**
     * Save user's search configuration
     * @param {number} userId - User ID
     * @param {Object} configData - Configuration data
     * @returns {Object} Saved configuration
     */
    async saveSearchConfiguration(userId, configData) {
        const {
            configName,
            weights,
            isDefault = false
        } = configData;

        try {
            // Validate weights sum to 1.0
            const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
            if (Math.abs(total - 1.0) > 0.001) {
                throw new Error('Search weights must sum to 1.0');
            }

            const { Pool } = require('pg');
            const pool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            });

            // If setting as default, clear other defaults for this user
            if (isDefault) {
                await pool.query(
                    'UPDATE search_configurations SET is_default = false WHERE user_id = $1',
                    [userId]
                );
            }

            const query = `
                INSERT INTO search_configurations (
                    user_id, config_name, technology_weight, domain_weight,
                    contract_size_weight, customer_type_weight, recency_weight,
                    is_default
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            const values = [
                userId,
                configName,
                weights.technology,
                weights.domain,
                weights.contractSize,
                weights.customerType,
                weights.recency || 0,
                isDefault
            ];

            const result = await pool.query(query, values);

            logger.info(`Saved search configuration for user ${userId}: ${configName}`);

            return result.rows[0];
        } catch (error) {
            logger.error('Failed to save search configuration:', error);
            throw new Error(`Failed to save search configuration: ${error.message}`);
        }
    }

    /**
     * Parse solicitation past performance requirements
     * @param {string} requirementsText - Raw requirements text
     * @returns {Object} Parsed requirements
     */
    async parseSolicitationRequirements(requirementsText) {
        try {
            // Extract structured requirements (this would be enhanced with AI parsing)
            const requirements = {
                technologies: this.extractTechnologyRequirements(requirementsText),
                experience: this.extractExperienceRequirements(requirementsText),
                contractValues: this.extractContractValueRequirements(requirementsText),
                timeframes: this.extractTimeframeRequirements(requirementsText),
                customerTypes: this.extractCustomerTypeRequirements(requirementsText),
                domains: this.extractDomainRequirements(requirementsText),
                rawText: requirementsText
            };

            logger.info(`Parsed solicitation requirements: ${requirements.technologies.length} technologies, ${requirements.experience.length} experience items`);

            return requirements;
        } catch (error) {
            logger.error('Failed to parse solicitation requirements:', error);
            throw new Error(`Requirements parsing failed: ${error.message}`);
        }
    }

    /**
     * Extract technology requirements from text
     * @param {string} text - Requirements text
     * @returns {Array} Technology requirements
     */
    extractTechnologyRequirements(text) {
        const technologies = [];
        const lowerText = text.toLowerCase();

        // Get all approved technologies and check for mentions
        Technology.findAll({ approved: true }).then(allTechs => {
            for (const tech of allTechs) {
                if (lowerText.includes(tech.name.toLowerCase())) {
                    // Extract version requirements if present
                    const versionMatch = text.match(
                        new RegExp(`${tech.name}\\s+v?(\\d+(?:\\.\\d+)*)`, 'gi')
                    );

                    technologies.push({
                        name: tech.name,
                        category: tech.category,
                        version: versionMatch ? versionMatch[1] : null,
                        required: this.isRequired(text, tech.name)
                    });
                }
            }
        });

        return technologies;
    }

    /**
     * Extract experience requirements
     * @param {string} text - Requirements text
     * @returns {Array} Experience requirements
     */
    extractExperienceRequirements(text) {
        const experience = [];

        // Look for experience patterns
        const patterns = [
            /(\d+)\s+years?\s+of\s+experience/gi,
            /minimum\s+of\s+(\d+)\s+years?/gi,
            /at\s+least\s+(\d+)\s+years?/gi
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                experience.push({
                    years: parseInt(match[1]),
                    context: this.extractContext(text, match.index, 100),
                    type: 'general'
                });
            }
        }

        return experience;
    }

    /**
     * Extract contract value requirements
     * @param {string} text - Requirements text
     * @returns {Array} Contract value requirements
     */
    extractContractValueRequirements(text) {
        const values = [];

        const patterns = [
            /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|M)/gi,
            /\$(\d+(?:,\d{3})*)/gi,
            /(\d+)\s*million\s*dollars?/gi
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                let amount = match[1].replace(/,/g, '');

                if (text.substring(match.index, match.index + 50).toLowerCase().includes('million')) {
                    amount = parseFloat(amount) * 1000000;
                } else {
                    amount = parseFloat(amount);
                }

                values.push({
                    amount,
                    context: this.extractContext(text, match.index, 100),
                    type: this.isMinimum(text, match.index) ? 'minimum' : 'similar'
                });
            }
        }

        return values;
    }

    /**
     * Extract timeframe requirements
     * @param {string} text - Requirements text
     * @returns {Array} Timeframe requirements
     */
    extractTimeframeRequirements(text) {
        const timeframes = [];

        const patterns = [
            /within\s+(?:the\s+)?last\s+(\d+)\s+(years?|months?)/gi,
            /(?:past|previous)\s+(\d+)\s+(years?|months?)/gi,
            /recent\s+(\d+)\s+(years?|months?)/gi
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const value = parseInt(match[1]);
                const unit = match[2].toLowerCase();

                timeframes.push({
                    value,
                    unit: unit.startsWith('year') ? 'years' : 'months',
                    context: this.extractContext(text, match.index, 100)
                });
            }
        }

        return timeframes;
    }

    /**
     * Extract customer type requirements
     * @param {string} text - Requirements text
     * @returns {Array} Customer type requirements
     */
    extractCustomerTypeRequirements(text) {
        const customerTypes = [];
        const lowerText = text.toLowerCase();

        const types = {
            'federal': ['federal', 'government', 'agency', 'dod', 'defense'],
            'state': ['state', 'municipal', 'local government'],
            'commercial': ['commercial', 'private sector', 'industry']
        };

        for (const [type, keywords] of Object.entries(types)) {
            const matches = keywords.filter(keyword => lowerText.includes(keyword));
            if (matches.length > 0) {
                customerTypes.push({
                    type,
                    keywords: matches,
                    required: this.isRequired(text, matches[0])
                });
            }
        }

        return customerTypes;
    }

    /**
     * Extract domain requirements
     * @param {string} text - Requirements text
     * @returns {Array} Domain requirements
     */
    extractDomainRequirements(text) {
        const domains = [];
        const lowerText = text.toLowerCase();

        const domainKeywords = {
            'healthcare': ['healthcare', 'medical', 'hospital', 'patient'],
            'financial': ['financial', 'banking', 'finance', 'payment'],
            'defense': ['defense', 'military', 'security', 'classified'],
            'education': ['education', 'school', 'university', 'student']
        };

        for (const [domain, keywords] of Object.entries(domainKeywords)) {
            const matches = keywords.filter(keyword => lowerText.includes(keyword));
            if (matches.length > 0) {
                domains.push({
                    domain,
                    keywords: matches,
                    confidence: matches.length / keywords.length
                });
            }
        }

        return domains;
    }

    // Helper methods

    async getProjectContext(projectId) {
        // Get project documents and extract solicitation requirements
        const { Pool } = require('pg');
        const pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        const query = `
            SELECT p.*, d.content
            FROM projects p
            LEFT JOIN documents d ON p.id = d.project_id
            WHERE p.id = $1
        `;

        const result = await pool.query(query, [projectId]);

        if (result.rows.length === 0) {
            throw new Error('Project not found');
        }

        // Extract PP requirements from solicitation documents
        const projectDocs = result.rows;
        const solicitationDoc = projectDocs.find(doc =>
            doc.content && doc.content.toLowerCase().includes('past performance')
        );

        return {
            project: result.rows[0],
            requirements: solicitationDoc?.content || null,
            documents: projectDocs
        };
    }

    buildPPFilters(filters, weights = {}) {
        const ppFilters = {};

        if (filters.customer) ppFilters.customer = filters.customer;
        if (filters.role) ppFilters.role = filters.role;
        if (filters.minContractValue) ppFilters.minContractValue = filters.minContractValue;
        if (filters.maxContractValue) ppFilters.maxContractValue = filters.maxContractValue;
        if (filters.minPeriodEnd) ppFilters.minPeriodEnd = filters.minPeriodEnd;

        return ppFilters;
    }

    async performMultiCriteriaSearch(params) {
        // Placeholder for multi-criteria search implementation
        // This would combine semantic search with requirement matching
        return [];
    }

    async generateSearchExplanations(results, requirements, weights) {
        // Generate explanations for why each result was selected
        return results.map(result => ({
            ...result,
            explanation: this.generateExplanation(result, requirements, weights)
        }));
    }

    generateExplanation(result, requirements, weights) {
        const explanation = [];

        // Add explanation points based on matching criteria
        if (weights.technology > 0.3) {
            explanation.push('• Strong technology stack alignment');
        }

        explanation.push(`• ${Math.round(result.similarity_score * 100)}% semantic similarity`);
        explanation.push(`• ${result.role} contractor experience`);

        return explanation;
    }

    async mergeSearchResults(semanticResults, keywordResults, weights) {
        // Combine and deduplicate results from different search methods
        const merged = new Map();

        // Add semantic results
        for (const result of semanticResults) {
            const key = result.pp_id;
            merged.set(key, {
                ...result,
                search_methods: ['semantic'],
                combined_score: result.similarity_score * 0.7
            });
        }

        // Add keyword results
        for (const result of keywordResults) {
            const key = result.id;
            if (merged.has(key)) {
                const existing = merged.get(key);
                existing.search_methods.push('keyword');
                existing.combined_score += result.relevance_score * 0.3;
            } else {
                merged.set(key, {
                    ...result,
                    pp_id: result.id,
                    search_methods: ['keyword'],
                    combined_score: result.relevance_score * 0.5
                });
            }
        }

        return Array.from(merged.values()).sort((a, b) => b.combined_score - a.combined_score);
    }

    async applySearchFilters(results, filters) {
        // Apply additional filtering logic
        return results; // Placeholder
    }

    async generateFreeTextExplanations(results, query, weights) {
        return results.map(result => ({
            ...result,
            explanation: [
                `• Matches query: "${query}"`,
                `• Combined search score: ${Math.round(result.combined_score * 100)}%`,
                `• Search methods: ${result.search_methods.join(', ')}`
            ]
        }));
    }

    groupByPastPerformance(results) {
        const grouped = {};

        for (const result of results) {
            const ppId = result.pp_id;

            if (!grouped[ppId]) {
                grouped[ppId] = {
                    ppId,
                    chunks: [],
                    maxSimilarity: 0,
                    bestMatch: null
                };
            }

            grouped[ppId].chunks.push(result);

            if (result.similarity_score > grouped[ppId].maxSimilarity) {
                grouped[ppId].maxSimilarity = result.similarity_score;
                grouped[ppId].bestMatch = result;
            }
        }

        return grouped;
    }

    extractContext(text, position, length) {
        const start = Math.max(0, position - length);
        const end = Math.min(text.length, position + length);
        return text.substring(start, end).trim();
    }

    isRequired(text, term) {
        const context = text.toLowerCase();
        const requiredKeywords = ['required', 'must', 'shall', 'mandatory'];
        const termIndex = context.indexOf(term.toLowerCase());

        if (termIndex === -1) return false;

        const surrounding = context.substring(
            Math.max(0, termIndex - 100),
            Math.min(context.length, termIndex + 100)
        );

        return requiredKeywords.some(keyword => surrounding.includes(keyword));
    }

    isMinimum(text, position) {
        const context = text.substring(
            Math.max(0, position - 50),
            Math.min(text.length, position + 50)
        ).toLowerCase();

        return context.includes('minimum') || context.includes('at least');
    }
}

module.exports = PPSearchService;