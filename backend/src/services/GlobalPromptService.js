/**
 * Global Prompt Configuration Service
 * Manages 4-layer prompt hierarchy: Global Rules → Persona → Context → User Prompt
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

class GlobalPromptService {
    constructor(pool = null) {
        this.pool = pool || new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'govai',
            user: process.env.DB_USER || 'govaiuser',
            password: process.env.DB_PASSWORD || 'devpass123'
        });

        // Cache for frequently accessed rules
        this.ruleCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Initialize global prompt configuration tables
     */
    async initializeTables() {
        const client = await this.pool.connect();
        try {
            // Global rules table (Layer 1)
            await client.query(`
                CREATE TABLE IF NOT EXISTS global_prompt_rules (
                    id SERIAL PRIMARY KEY,
                    rule_name VARCHAR(100) NOT NULL UNIQUE,
                    rule_type VARCHAR(50) NOT NULL, -- 'positive_directive', 'negative_constraint', 'contextual_behavior'
                    category VARCHAR(50) NOT NULL, -- 'tone', 'compliance', 'accuracy', 'formatting', 'security'
                    rule_content TEXT NOT NULL,
                    priority INTEGER DEFAULT 100, -- Lower numbers = higher priority
                    is_active BOOLEAN DEFAULT true,
                    applies_to_personas TEXT[] DEFAULT '{}', -- Empty array means applies to all
                    applies_to_contexts TEXT[] DEFAULT '{}', -- Empty array means applies to all
                    conditions JSONB DEFAULT '{}', -- Conditional application rules
                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by INTEGER REFERENCES users(id),
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    version INTEGER DEFAULT 1
                );
            `);

            // Context guidance table (Layer 3)
            await client.query(`
                CREATE TABLE IF NOT EXISTS context_guidance (
                    id SERIAL PRIMARY KEY,
                    context_name VARCHAR(100) NOT NULL UNIQUE,
                    context_type VARCHAR(50) NOT NULL, -- 'document_section', 'task_type', 'domain_specific'
                    guidance_content TEXT NOT NULL,
                    section_types TEXT[] DEFAULT '{}', -- Which document sections this applies to
                    document_types TEXT[] DEFAULT '{}', -- Which document types this applies to
                    priority INTEGER DEFAULT 100,
                    is_active BOOLEAN DEFAULT true,
                    prerequisites JSONB DEFAULT '{}', -- What conditions must be met
                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by INTEGER REFERENCES users(id),
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Prompt templates for common scenarios
            await client.query(`
                CREATE TABLE IF NOT EXISTS prompt_templates (
                    id SERIAL PRIMARY KEY,
                    template_name VARCHAR(100) NOT NULL UNIQUE,
                    template_type VARCHAR(50) NOT NULL, -- 'section_generation', 'content_improvement', 'analysis'
                    base_prompt TEXT NOT NULL,
                    variable_placeholders TEXT[] DEFAULT '{}', -- {user_input}, {context}, {requirements}
                    applicable_sections TEXT[] DEFAULT '{}',
                    applicable_personas TEXT[] DEFAULT '{}',
                    usage_count INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT true,
                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Rule conflict resolution table
            await client.query(`
                CREATE TABLE IF NOT EXISTS rule_conflicts (
                    id SERIAL PRIMARY KEY,
                    rule_a_id INTEGER REFERENCES global_prompt_rules(id),
                    rule_b_id INTEGER REFERENCES global_prompt_rules(id),
                    conflict_type VARCHAR(50) NOT NULL, -- 'contradictory', 'redundant', 'overlapping'
                    resolution VARCHAR(50) NOT NULL, -- 'priority_based', 'context_specific', 'merge', 'disable_one'
                    resolution_data JSONB DEFAULT '{}',
                    is_resolved BOOLEAN DEFAULT false,
                    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP,
                    resolved_by INTEGER REFERENCES users(id)
                );
            `);

            // Prompt performance metrics
            await client.query(`
                CREATE TABLE IF NOT EXISTS prompt_performance_metrics (
                    id SERIAL PRIMARY KEY,
                    rule_id INTEGER REFERENCES global_prompt_rules(id),
                    persona_id INTEGER, -- Reference to personas table
                    context_id INTEGER REFERENCES context_guidance(id),
                    usage_count INTEGER DEFAULT 0,
                    success_rate DECIMAL(5,2) DEFAULT 0.00,
                    avg_generation_time_ms INTEGER DEFAULT 0,
                    user_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
                    last_used TIMESTAMP,
                    performance_period DATE DEFAULT CURRENT_DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Create indexes for performance
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_global_rules_active_priority
                ON global_prompt_rules(is_active, priority);
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_global_rules_category_type
                ON global_prompt_rules(category, rule_type);
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_context_guidance_active
                ON context_guidance(is_active, context_type);
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_prompt_templates_active_type
                ON prompt_templates(is_active, template_type);
            `);

            logger.info('Global prompt configuration tables initialized successfully');

            // Insert default global rules
            await this.insertDefaultRules(client);

        } catch (error) {
            logger.error('Error initializing global prompt tables:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Insert default global prompt rules
     */
    async insertDefaultRules(client) {
        const defaultRules = [
            {
                rule_name: 'professional_tone',
                rule_type: 'positive_directive',
                category: 'tone',
                rule_content: 'Maintain a professional, authoritative tone appropriate for government proposal writing. Use clear, concise language that demonstrates expertise and confidence.',
                priority: 10
            },
            {
                rule_name: 'no_speculation',
                rule_type: 'negative_constraint',
                category: 'accuracy',
                rule_content: 'Never include speculative statements, unverified claims, or unsupported assumptions. All statements must be factual and evidence-based.',
                priority: 5
            },
            {
                rule_name: 'compliance_focus',
                rule_type: 'positive_directive',
                category: 'compliance',
                rule_content: 'Always address compliance requirements explicitly. Reference relevant regulations, standards, and evaluation criteria when applicable.',
                priority: 15
            },
            {
                rule_name: 'no_informal_language',
                rule_type: 'negative_constraint',
                category: 'tone',
                rule_content: 'Avoid informal language, colloquialisms, contractions, or casual expressions. Maintain formal business writing standards.',
                priority: 20
            },
            {
                rule_name: 'evidence_based_claims',
                rule_type: 'positive_directive',
                category: 'accuracy',
                rule_content: 'Support all claims with evidence, examples, or references to past performance. Quantify benefits and outcomes where possible.',
                priority: 12
            },
            {
                rule_name: 'contextual_adaptation',
                rule_type: 'contextual_behavior',
                category: 'formatting',
                rule_content: 'Adapt writing complexity and technical depth based on the document section and target audience. Executive summaries should be high-level, technical sections should be detailed.',
                priority: 25
            }
        ];

        for (const rule of defaultRules) {
            try {
                await client.query(`
                    INSERT INTO global_prompt_rules (rule_name, rule_type, category, rule_content, priority, created_by)
                    VALUES ($1, $2, $3, $4, $5, 1)
                    ON CONFLICT (rule_name) DO NOTHING
                `, [rule.rule_name, rule.rule_type, rule.category, rule.rule_content, rule.priority]);
            } catch (error) {
                logger.warn(`Failed to insert default rule ${rule.rule_name}:`, error.message);
            }
        }

        // Insert default context guidance
        const defaultContextGuidance = [
            {
                context_name: 'executive_summary',
                context_type: 'document_section',
                guidance_content: 'Focus on high-level strategic messaging. Emphasize value proposition, key benefits, and competitive advantages. Keep technical details minimal.',
                section_types: ['executive-summary', 'executive_summary']
            },
            {
                context_name: 'technical_approach',
                context_type: 'document_section',
                guidance_content: 'Provide detailed technical specifications, methodologies, and implementation plans. Include architecture diagrams concepts, risk mitigation strategies, and quality assurance measures.',
                section_types: ['technical-approach', 'technical_approach']
            },
            {
                context_name: 'past_performance',
                context_type: 'document_section',
                guidance_content: 'Demonstrate relevant experience with specific examples, quantifiable outcomes, and lessons learned. Include client references and project metrics.',
                section_types: ['past-performance', 'past_performance']
            }
        ];

        for (const guidance of defaultContextGuidance) {
            try {
                await client.query(`
                    INSERT INTO context_guidance (context_name, context_type, guidance_content, section_types, created_by)
                    VALUES ($1, $2, $3, $4, 1)
                    ON CONFLICT (context_name) DO NOTHING
                `, [guidance.context_name, guidance.context_type, guidance.guidance_content, guidance.section_types]);
            } catch (error) {
                logger.warn(`Failed to insert default context guidance ${guidance.context_name}:`, error.message);
            }
        }

        logger.info('Default global prompt rules and context guidance inserted');
    }

    /**
     * Build complete prompt using 4-layer hierarchy
     */
    async buildLayeredPrompt(userPrompt, options = {}) {
        const {
            personaId = null,
            sectionType = null,
            documentType = null,
            contextOverrides = {}
        } = options;

        try {
            // Layer 1: Get applicable global rules
            const globalRules = await this.getApplicableGlobalRules({
                personaId,
                sectionType,
                contextOverrides
            });

            // Layer 2: Get persona (handled by PersonasService integration)
            let personaPrompt = '';
            if (personaId) {
                // This will be integrated with existing PersonasService
                personaPrompt = await this.getPersonaPrompt(personaId);
            }

            // Layer 3: Get context guidance
            const contextGuidance = await this.getContextGuidance({
                sectionType,
                documentType
            });

            // Layer 4: User prompt (as provided)

            // Combine all layers into final prompt
            const finalPrompt = this.assembleFinalPrompt({
                globalRules,
                personaPrompt,
                contextGuidance,
                userPrompt,
                options
            });

            // Log usage for analytics
            await this.logPromptUsage({
                globalRules,
                personaId,
                contextGuidance,
                success: true
            });

            return finalPrompt;

        } catch (error) {
            logger.error('Error building layered prompt:', error);
            throw error;
        }
    }

    /**
     * Get applicable global rules based on context
     */
    async getApplicableGlobalRules(context = {}) {
        const cacheKey = JSON.stringify({
            type: 'global_rules',
            context: context
        });

        // Check cache first
        const cached = this.ruleCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }

        const client = await this.pool.connect();
        try {
            let query = `
                SELECT * FROM global_prompt_rules
                WHERE is_active = true
            `;
            let queryParams = [];
            let paramCount = 0;

            // Filter by persona if specified
            if (context.personaId) {
                paramCount++;
                query += ` AND (applies_to_personas = '{}' OR $${paramCount} = ANY(applies_to_personas))`;
                queryParams.push(context.personaId.toString());
            }

            // Filter by section type if specified
            if (context.sectionType) {
                paramCount++;
                query += ` AND (applies_to_contexts = '{}' OR $${paramCount} = ANY(applies_to_contexts))`;
                queryParams.push(context.sectionType);
            }

            query += ' ORDER BY priority ASC, created_at ASC';

            const result = await client.query(query, queryParams);
            const rules = result.rows;

            // Cache the result
            this.ruleCache.set(cacheKey, {
                data: rules,
                timestamp: Date.now()
            });

            return rules;

        } finally {
            client.release();
        }
    }

    /**
     * Get context guidance for specific context
     */
    async getContextGuidance(context = {}) {
        const cacheKey = JSON.stringify({
            type: 'context_guidance',
            context: context
        });

        const cached = this.ruleCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }

        const client = await this.pool.connect();
        try {
            let query = `
                SELECT * FROM context_guidance
                WHERE is_active = true
            `;
            let queryParams = [];
            let paramCount = 0;

            if (context.sectionType) {
                paramCount++;
                query += ` AND $${paramCount} = ANY(section_types)`;
                queryParams.push(context.sectionType);
            }

            if (context.documentType) {
                paramCount++;
                query += ` AND (document_types = '{}' OR $${paramCount} = ANY(document_types))`;
                queryParams.push(context.documentType);
            }

            query += ' ORDER BY priority ASC';

            const result = await client.query(query, queryParams);
            const guidance = result.rows;

            this.ruleCache.set(cacheKey, {
                data: guidance,
                timestamp: Date.now()
            });

            return guidance;

        } finally {
            client.release();
        }
    }

    /**
     * Get persona prompt (integration point with PersonasService)
     */
    async getPersonaPrompt(personaId) {
        // This will integrate with the existing PersonasService
        // For now, return empty string as placeholder
        try {
            const PersonasService = require('./PersonasService');
            const personasService = new PersonasService();
            const persona = await personasService.getPersonaById(personaId);
            return persona ? persona.system_prompt : '';
        } catch (error) {
            logger.warn('Could not load persona prompt:', error.message);
            return '';
        }
    }

    /**
     * Assemble final prompt from all layers
     */
    assembleFinalPrompt({ globalRules, personaPrompt, contextGuidance, userPrompt, options }) {
        let finalPrompt = '';

        // Start with global rules (Layer 1)
        if (globalRules && globalRules.length > 0) {
            const rulesByType = {
                positive_directive: [],
                negative_constraint: [],
                contextual_behavior: []
            };

            globalRules.forEach(rule => {
                rulesByType[rule.rule_type].push(rule.rule_content);
            });

            finalPrompt += 'GLOBAL WRITING GUIDELINES:\n\n';

            if (rulesByType.positive_directive.length > 0) {
                finalPrompt += 'POSITIVE DIRECTIVES:\n';
                rulesByType.positive_directive.forEach((rule, index) => {
                    finalPrompt += `${index + 1}. ${rule}\n`;
                });
                finalPrompt += '\n';
            }

            if (rulesByType.negative_constraint.length > 0) {
                finalPrompt += 'CONSTRAINTS:\n';
                rulesByType.negative_constraint.forEach((rule, index) => {
                    finalPrompt += `${index + 1}. ${rule}\n`;
                });
                finalPrompt += '\n';
            }

            if (rulesByType.contextual_behavior.length > 0) {
                finalPrompt += 'CONTEXTUAL BEHAVIOR:\n';
                rulesByType.contextual_behavior.forEach((rule, index) => {
                    finalPrompt += `${index + 1}. ${rule}\n`;
                });
                finalPrompt += '\n';
            }
        }

        // Add persona guidance (Layer 2)
        if (personaPrompt && personaPrompt.trim()) {
            finalPrompt += 'PERSONA GUIDANCE:\n';
            finalPrompt += personaPrompt + '\n\n';
        }

        // Add context guidance (Layer 3)
        if (contextGuidance && contextGuidance.length > 0) {
            finalPrompt += 'CONTEXT-SPECIFIC GUIDANCE:\n';
            contextGuidance.forEach((guidance, index) => {
                finalPrompt += `${guidance.context_name.toUpperCase()}: ${guidance.guidance_content}\n`;
            });
            finalPrompt += '\n';
        }

        // Add user prompt (Layer 4)
        finalPrompt += 'USER REQUEST:\n';
        finalPrompt += userPrompt;

        return finalPrompt;
    }

    /**
     * Create a new global rule
     */
    async createGlobalRule(ruleData, userId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                INSERT INTO global_prompt_rules (
                    rule_name, rule_type, category, rule_content, priority,
                    applies_to_personas, applies_to_contexts, conditions, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `, [
                ruleData.rule_name,
                ruleData.rule_type,
                ruleData.category,
                ruleData.rule_content,
                ruleData.priority || 100,
                ruleData.applies_to_personas || [],
                ruleData.applies_to_contexts || [],
                JSON.stringify(ruleData.conditions || {}),
                userId
            ]);

            // Clear cache
            this.ruleCache.clear();

            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Update a global rule
     */
    async updateGlobalRule(ruleId, ruleData, userId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                UPDATE global_prompt_rules
                SET rule_name = $1, rule_type = $2, category = $3, rule_content = $4,
                    priority = $5, applies_to_personas = $6, applies_to_contexts = $7,
                    conditions = $8, updated_by = $9, updated_at = CURRENT_TIMESTAMP,
                    version = version + 1
                WHERE id = $10
                RETURNING *
            `, [
                ruleData.rule_name,
                ruleData.rule_type,
                ruleData.category,
                ruleData.rule_content,
                ruleData.priority,
                ruleData.applies_to_personas || [],
                ruleData.applies_to_contexts || [],
                JSON.stringify(ruleData.conditions || {}),
                userId,
                ruleId
            ]);

            this.ruleCache.clear();
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Get all global rules with filtering
     */
    async getAllGlobalRules(filters = {}) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT gr.*, u1.username as created_by_username, u2.username as updated_by_username
                FROM global_prompt_rules gr
                LEFT JOIN users u1 ON gr.created_by = u1.id
                LEFT JOIN users u2 ON gr.updated_by = u2.id
                WHERE 1=1
            `;
            let queryParams = [];
            let paramCount = 0;

            if (filters.category) {
                paramCount++;
                query += ` AND gr.category = $${paramCount}`;
                queryParams.push(filters.category);
            }

            if (filters.rule_type) {
                paramCount++;
                query += ` AND gr.rule_type = $${paramCount}`;
                queryParams.push(filters.rule_type);
            }

            if (filters.is_active !== undefined) {
                paramCount++;
                query += ` AND gr.is_active = $${paramCount}`;
                queryParams.push(filters.is_active);
            }

            query += ' ORDER BY gr.priority ASC, gr.created_at DESC';

            const result = await client.query(query, queryParams);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Delete a global rule
     */
    async deleteGlobalRule(ruleId, userId) {
        const client = await this.pool.connect();
        try {
            await client.query(`
                DELETE FROM global_prompt_rules WHERE id = $1
            `, [ruleId]);

            this.ruleCache.clear();
            return true;
        } finally {
            client.release();
        }
    }

    /**
     * Validate rule for conflicts
     */
    async validateRuleForConflicts(ruleData) {
        // Implementation for detecting rule conflicts
        // This could check for contradictory rules, redundant rules, etc.
        return {
            hasConflicts: false,
            conflicts: []
        };
    }

    /**
     * Log prompt usage for analytics
     */
    async logPromptUsage(usageData) {
        try {
            // Implementation for logging usage analytics
            // This helps track which rules are most effective
        } catch (error) {
            logger.warn('Failed to log prompt usage:', error.message);
        }
    }

    /**
     * Clear rule cache
     */
    clearCache() {
        this.ruleCache.clear();
    }
}

module.exports = GlobalPromptService;