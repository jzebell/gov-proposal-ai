/**
 * Global Prompt Configuration API Routes
 * Manages the 4-layer prompt hierarchy system
 */

const express = require('express');
const GlobalPromptService = require('../services/GlobalPromptService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const globalPromptService = new GlobalPromptService();

/**
 * @route GET /api/global-prompts/rules
 * @desc Get all global prompt rules with filtering
 * @access Admin
 */
router.get('/rules', asyncHandler(async (req, res) => {
    const { category, rule_type, is_active } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (rule_type) filters.rule_type = rule_type;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const rules = await globalPromptService.getAllGlobalRules(filters);

    res.json({
        success: true,
        data: {
            rules,
            total: rules.length,
            filters: filters
        }
    });
}));

/**
 * @route POST /api/global-prompts/rules
 * @desc Create a new global prompt rule
 * @access Admin
 */
router.post('/rules', sanitizeInput, asyncHandler(async (req, res) => {
    const {
        rule_name,
        rule_type,
        category,
        rule_content,
        priority,
        applies_to_personas,
        applies_to_contexts,
        conditions
    } = req.body;

    // Validation
    if (!rule_name || !rule_type || !category || !rule_content) {
        return res.status(400).json({
            success: false,
            message: 'rule_name, rule_type, category, and rule_content are required'
        });
    }

    const validRuleTypes = ['positive_directive', 'negative_constraint', 'contextual_behavior'];
    if (!validRuleTypes.includes(rule_type)) {
        return res.status(400).json({
            success: false,
            message: `rule_type must be one of: ${validRuleTypes.join(', ')}`
        });
    }

    const validCategories = ['tone', 'compliance', 'accuracy', 'formatting', 'security'];
    if (!validCategories.includes(category)) {
        return res.status(400).json({
            success: false,
            message: `category must be one of: ${validCategories.join(', ')}`
        });
    }

    try {
        // Get current user ID (would come from auth middleware in production)
        const userId = req.user?.id || 1; // Fallback for development

        const ruleData = {
            rule_name,
            rule_type,
            category,
            rule_content,
            priority: parseInt(priority) || 100,
            applies_to_personas: applies_to_personas || [],
            applies_to_contexts: applies_to_contexts || [],
            conditions: conditions || {}
        };

        // Validate for conflicts
        const validation = await globalPromptService.validateRuleForConflicts(ruleData);
        if (validation.hasConflicts) {
            return res.status(400).json({
                success: false,
                message: 'Rule conflicts detected',
                conflicts: validation.conflicts
            });
        }

        const newRule = await globalPromptService.createGlobalRule(ruleData, userId);

        res.status(201).json({
            success: true,
            data: newRule,
            message: 'Global prompt rule created successfully'
        });

    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({
                success: false,
                message: 'A rule with this name already exists'
            });
        }
        throw error;
    }
}));

/**
 * @route PUT /api/global-prompts/rules/:id
 * @desc Update a global prompt rule
 * @access Admin
 */
router.put('/rules/:id', sanitizeInput, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        rule_name,
        rule_type,
        category,
        rule_content,
        priority,
        applies_to_personas,
        applies_to_contexts,
        conditions
    } = req.body;

    const userId = req.user?.id || 1;

    const ruleData = {
        rule_name,
        rule_type,
        category,
        rule_content,
        priority: parseInt(priority) || 100,
        applies_to_personas: applies_to_personas || [],
        applies_to_contexts: applies_to_contexts || [],
        conditions: conditions || {}
    };

    const updatedRule = await globalPromptService.updateGlobalRule(id, ruleData, userId);

    if (!updatedRule) {
        return res.status(404).json({
            success: false,
            message: 'Rule not found'
        });
    }

    res.json({
        success: true,
        data: updatedRule,
        message: 'Global prompt rule updated successfully'
    });
}));

/**
 * @route DELETE /api/global-prompts/rules/:id
 * @desc Delete a global prompt rule
 * @access Admin
 */
router.delete('/rules/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    await globalPromptService.deleteGlobalRule(id, userId);

    res.json({
        success: true,
        message: 'Global prompt rule deleted successfully'
    });
}));

/**
 * @route POST /api/global-prompts/build
 * @desc Build a layered prompt using the 4-layer hierarchy
 * @access Public (would be auth protected in production)
 */
router.post('/build', sanitizeInput, asyncHandler(async (req, res) => {
    const {
        user_prompt,
        persona_id,
        section_type,
        document_type,
        context_overrides
    } = req.body;

    if (!user_prompt) {
        return res.status(400).json({
            success: false,
            message: 'user_prompt is required'
        });
    }

    logger.info(`Building layered prompt for section: ${section_type}, persona: ${persona_id}`);

    try {
        const finalPrompt = await globalPromptService.buildLayeredPrompt(user_prompt, {
            personaId: persona_id,
            sectionType: section_type,
            documentType: document_type,
            contextOverrides: context_overrides || {}
        });

        res.json({
            success: true,
            data: {
                final_prompt: finalPrompt,
                layers_applied: {
                    global_rules: true,
                    persona: !!persona_id,
                    context_guidance: !!section_type,
                    user_prompt: true
                },
                metadata: {
                    section_type: section_type,
                    document_type: document_type,
                    persona_id: persona_id,
                    prompt_length: finalPrompt.length,
                    generated_at: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        logger.error(`Error building layered prompt: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to build layered prompt',
            error: error.message
        });
    }
}));

/**
 * @route GET /api/global-prompts/context-guidance
 * @desc Get context guidance rules
 * @access Public
 */
router.get('/context-guidance', asyncHandler(async (req, res) => {
    const { context_type, section_type } = req.query;

    const contextGuidance = await globalPromptService.getContextGuidance({
        contextType: context_type,
        sectionType: section_type
    });

    res.json({
        success: true,
        data: {
            guidance: contextGuidance,
            total: contextGuidance.length
        }
    });
}));

/**
 * @route POST /api/global-prompts/context-guidance
 * @desc Create new context guidance
 * @access Admin
 */
router.post('/context-guidance', sanitizeInput, asyncHandler(async (req, res) => {
    const {
        context_name,
        context_type,
        guidance_content,
        section_types,
        document_types,
        priority,
        prerequisites
    } = req.body;

    if (!context_name || !context_type || !guidance_content) {
        return res.status(400).json({
            success: false,
            message: 'context_name, context_type, and guidance_content are required'
        });
    }

    try {
        const userId = req.user?.id || 1;

        const client = await globalPromptService.pool.connect();
        try {
            const result = await client.query(`
                INSERT INTO context_guidance (
                    context_name, context_type, guidance_content, section_types,
                    document_types, priority, prerequisites, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                context_name,
                context_type,
                guidance_content,
                section_types || [],
                document_types || [],
                parseInt(priority) || 100,
                JSON.stringify(prerequisites || {}),
                userId
            ]);

            // Clear cache
            globalPromptService.clearCache();

            res.status(201).json({
                success: true,
                data: result.rows[0],
                message: 'Context guidance created successfully'
            });

        } finally {
            client.release();
        }

    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({
                success: false,
                message: 'Context guidance with this name already exists'
            });
        }
        throw error;
    }
}));

/**
 * @route GET /api/global-prompts/categories
 * @desc Get available rule categories and types
 * @access Public
 */
router.get('/categories', asyncHandler(async (req, res) => {
    const categories = {
        rule_types: [
            { value: 'positive_directive', label: 'Positive Directive', description: 'Instructions on what to do' },
            { value: 'negative_constraint', label: 'Negative Constraint', description: 'Restrictions on what not to do' },
            { value: 'contextual_behavior', label: 'Contextual Behavior', description: 'Adaptive behavior based on context' }
        ],
        categories: [
            { value: 'tone', label: 'Tone & Voice', description: 'Writing tone and communication style' },
            { value: 'compliance', label: 'Compliance', description: 'Regulatory and requirement adherence' },
            { value: 'accuracy', label: 'Accuracy', description: 'Factual correctness and evidence' },
            { value: 'formatting', label: 'Formatting', description: 'Document structure and presentation' },
            { value: 'security', label: 'Security', description: 'Information security and classification' }
        ],
        context_types: [
            { value: 'document_section', label: 'Document Section', description: 'Guidance for specific document sections' },
            { value: 'task_type', label: 'Task Type', description: 'Guidance for different types of writing tasks' },
            { value: 'domain_specific', label: 'Domain Specific', description: 'Industry or domain-specific guidance' }
        ]
    };

    res.json({
        success: true,
        data: categories
    });
}));

/**
 * @route POST /api/global-prompts/validate
 * @desc Validate a rule for conflicts before creation
 * @access Admin
 */
router.post('/validate', sanitizeInput, asyncHandler(async (req, res) => {
    const ruleData = req.body;

    const validation = await globalPromptService.validateRuleForConflicts(ruleData);

    res.json({
        success: true,
        data: validation
    });
}));

/**
 * @route POST /api/global-prompts/clear-cache
 * @desc Clear the rule cache (admin utility)
 * @access Admin
 */
router.post('/clear-cache', asyncHandler(async (req, res) => {
    globalPromptService.clearCache();

    res.json({
        success: true,
        message: 'Rule cache cleared successfully'
    });
}));

module.exports = router;