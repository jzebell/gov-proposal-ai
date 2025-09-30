/**
 * Global Prompt Configuration API Routes
 * Manages AI writing standards and prompt templates
 */

const express = require('express');
const router = express.Router();
const PromptCompilerService = require('../services/PromptCompilerService');
const { Pool } = require('pg');

// Initialize services
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'govai',
  user: process.env.DB_USER || 'govaiuser',
  password: process.env.DB_PASSWORD || 'devpass123'
});

const promptCompiler = new PromptCompilerService(pool);

// Placeholder auth middleware (replace with actual auth when available)
const requireAuth = (req, res, next) => {
  // TODO: Implement actual authentication
  req.user = { id: 1, role: 'admin' }; // Mock user for development
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'administrator')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
};

/**
 * GET /api/admin/global-prompt
 * Get the current global prompt configuration
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const config = await promptCompiler.getActiveConfig();

    res.json({
      success: true,
      data: {
        basePrompt: config.base_prompt,
        rules: config.rules || [],
        variables: config.variables || [],
        isActive: config.is_active,
        version: config.version,
        lastUpdated: config.updated_at,
        updatedBy: config.updated_by
      }
    });
  } catch (error) {
    console.error('Error fetching global prompt config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch global prompt configuration',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/global-prompt
 * Update the global prompt configuration
 */
router.put('/', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();

  try {
    const { basePrompt, rules, variables } = req.body;

    // Validate the configuration
    const validation = promptCompiler.validateConfig({
      base_prompt: basePrompt,
      rules,
      variables
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration',
        errors: validation.errors
      });
    }

    await client.query('BEGIN');

    // Check if config exists
    const existingConfig = await client.query(
      'SELECT id FROM global_prompt_config WHERE is_active = true LIMIT 1'
    );

    let result;

    if (existingConfig.rows.length > 0) {
      // Update existing config
      result = await client.query(
        `UPDATE global_prompt_config
         SET base_prompt = $1,
             rules = $2,
             variables = $3,
             updated_by = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [
          basePrompt,
          JSON.stringify(rules),
          JSON.stringify(variables),
          req.user.id,
          existingConfig.rows[0].id
        ]
      );
    } else {
      // Insert new config
      result = await client.query(
        `INSERT INTO global_prompt_config (base_prompt, rules, variables, updated_by, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [
          basePrompt,
          JSON.stringify(rules),
          JSON.stringify(variables),
          req.user.id
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Global prompt configuration updated successfully',
      data: {
        basePrompt: result.rows[0].base_prompt,
        rules: result.rows[0].rules,
        variables: result.rows[0].variables,
        version: result.rows[0].version,
        lastUpdated: result.rows[0].updated_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating global prompt config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update global prompt configuration',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/admin/global-prompt/preview
 * Preview the compiled prompt with sample context
 */
router.post('/preview', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { config, context } = req.body;

    // Use provided config or fetch current
    const configToUse = config || await promptCompiler.getActiveConfig();

    // Compile the prompt with context
    const compiledPrompt = await promptCompiler.compileGlobalPrompt(
      configToUse,
      context || {}
    );

    // Also test with sample data if no context provided
    const samplePrompt = !context
      ? await promptCompiler.testCompilation(configToUse)
      : null;

    res.json({
      success: true,
      data: {
        compiledPrompt,
        samplePrompt,
        variablesResolved: context || {}
      }
    });
  } catch (error) {
    console.error('Error previewing prompt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview prompt',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/global-prompt/defaults
 * Get the default prompt configuration
 */
router.get('/defaults', requireAuth, requireAdmin, async (req, res) => {
  try {
    const defaultConfig = {
      basePrompt: 'You are a professional government proposal writer. Write in clear, concise, and compelling prose that demonstrates understanding of government requirements and evaluation criteria. Focus on tangible benefits, proven methodologies, and measurable outcomes. Maintain a confident, authoritative tone while being accessible to both technical and non-technical evaluators.',
      rules: [
        {
          id: 'rule-1',
          type: 'style',
          rule: 'Use active voice exclusively',
          enabled: true,
          order: 1
        },
        {
          id: 'rule-2',
          type: 'formatting',
          rule: 'Spell out all acronyms on first use, followed by the acronym in parentheses',
          enabled: true,
          order: 2
        },
        {
          id: 'rule-3',
          type: 'style',
          rule: 'Limit sentences to 20 words maximum for clarity',
          enabled: true,
          order: 3
        },
        {
          id: 'rule-4',
          type: 'forbidden',
          rule: 'Never use business jargon or buzzwords',
          words: ['leverage', 'utilize', 'synergize', 'ideate', 'paradigm', 'holistic'],
          enabled: true,
          order: 4
        }
      ],
      variables: [
        {
          key: '{{AGENCY_NAME}}',
          description: 'The contracting agency name',
          source: 'project',
          default: 'the agency',
          system: true
        },
        {
          key: '{{PROJECT_NAME}}',
          description: 'Current project or proposal name',
          source: 'project',
          default: 'this project',
          system: true
        },
        {
          key: '{{CONTRACT_NUMBER}}',
          description: 'RFP/RFQ/Contract number',
          source: 'project',
          default: '',
          system: true
        }
      ]
    };

    res.json({
      success: true,
      data: defaultConfig
    });
  } catch (error) {
    console.error('Error fetching defaults:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default configuration',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/global-prompt/history
 * Get the configuration change history
 */
router.get('/history', requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT
        h.*,
        u.full_name as changed_by_name
      FROM global_prompt_config_history h
      LEFT JOIN users u ON h.changed_by = u.id
      ORDER BY h.changed_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        configId: row.config_id,
        basePrompt: row.base_prompt,
        rules: row.rules,
        variables: row.variables,
        version: row.version,
        changedBy: row.changed_by_name,
        changedAt: row.changed_at,
        changeReason: row.change_reason
      })),
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration history',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/global-prompt/test
 * Test the prompt with actual AI (limited for safety)
 */
router.post('/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { sampleText, useCurrentConfig } = req.body;

    if (!sampleText || sampleText.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Sample text is required and must be less than 500 characters'
      });
    }

    // Get config to use
    const config = useCurrentConfig
      ? await promptCompiler.getActiveConfig()
      : req.body.config;

    // Compile the prompt
    const compiledPrompt = await promptCompiler.compileGlobalPrompt(config);

    // Here you would normally call your AI service
    // For now, return a mock response showing what would be sent
    res.json({
      success: true,
      data: {
        prompt: compiledPrompt,
        sampleText,
        // This would be the AI response in production
        mockResponse: 'This is where the AI response would appear, following all the configured rules and standards.',
        note: 'AI integration pending - showing compiled prompt only'
      }
    });
  } catch (error) {
    console.error('Error testing prompt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test prompt',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/global-prompt/compile
 * Compile prompt for internal use by AI services
 * This endpoint is for system use, not admin UI
 */
router.post('/compile', requireAuth, async (req, res) => {
  try {
    const { context } = req.body;

    // Check if global prompt should be applied
    if (!promptCompiler.shouldApplyGlobalPrompt(context)) {
      return res.json({
        success: true,
        data: {
          prompt: null,
          applied: false,
          reason: 'Global prompt not applicable for this context type'
        }
      });
    }

    // Get active config and compile
    const config = await promptCompiler.getActiveConfig();
    const compiledPrompt = await promptCompiler.compileGlobalPrompt(config, context);

    res.json({
      success: true,
      data: {
        prompt: compiledPrompt,
        applied: true,
        version: config.version
      }
    });
  } catch (error) {
    console.error('Error compiling prompt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compile prompt',
      error: error.message
    });
  }
});

module.exports = router;