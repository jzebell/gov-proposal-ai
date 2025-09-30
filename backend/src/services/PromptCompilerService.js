/**
 * Prompt Compiler Service
 * Compiles global prompt configuration with rules and variables
 * for use in AI creative writing tasks
 */

const { Pool } = require('pg');

class PromptCompilerService {
  constructor(pool) {
    this.pool = pool || new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'govai',
      user: process.env.DB_USER || 'govaiuser',
      password: process.env.DB_PASSWORD || 'devpass123'
    });
  }

  /**
   * Get the active global prompt configuration from database
   */
  async getActiveConfig() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM global_prompt_config WHERE is_active = true ORDER BY id DESC LIMIT 1`
      );

      if (result.rows.length === 0) {
        // Return default if no config exists
        return this.getDefaultConfig();
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      base_prompt: 'Write in a clear, professional manner suitable for government proposals.',
      rules: [],
      variables: [],
      is_active: true
    };
  }

  /**
   * Compile the global prompt with rules and variables
   * @param {Object} config - Global prompt configuration
   * @param {Object} context - Context for variable replacement (project, user, etc.)
   * @returns {string} - Compiled prompt ready for AI
   */
  async compileGlobalPrompt(config, context = {}) {
    if (!config) {
      config = await this.getActiveConfig();
    }

    let compiledPrompt = config.base_prompt || '';

    // Add enabled rules to the prompt
    const enabledRules = this.getEnabledRules(config.rules);
    if (enabledRules.length > 0) {
      compiledPrompt += '\n\n### Writing Requirements:\n';
      enabledRules.forEach((rule, index) => {
        compiledPrompt += `${index + 1}. ${rule.rule}\n`;

        // Add forbidden words if applicable
        if (rule.type === 'forbidden' && rule.words && rule.words.length > 0) {
          compiledPrompt += `   Forbidden words: ${rule.words.join(', ')}\n`;
        }
      });
    }

    // Replace variables with context values
    compiledPrompt = await this.replaceVariables(compiledPrompt, config.variables, context);

    return compiledPrompt;
  }

  /**
   * Get only enabled rules, sorted by order
   */
  getEnabledRules(rules) {
    if (!rules || !Array.isArray(rules)) {
      return [];
    }

    return rules
      .filter(rule => rule.enabled === true)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Replace variables in the prompt with actual values from context
   */
  async replaceVariables(prompt, variables, context) {
    if (!variables || !Array.isArray(variables)) {
      return prompt;
    }

    let compiledPrompt = prompt;

    for (const variable of variables) {
      const value = await this.resolveVariable(variable, context);
      const regex = new RegExp(this.escapeRegex(variable.key), 'g');
      compiledPrompt = compiledPrompt.replace(regex, value || variable.default || '');
    }

    return compiledPrompt;
  }

  /**
   * Resolve a variable's value from the context
   */
  async resolveVariable(variable, context) {
    switch (variable.source) {
      case 'project':
        return this.resolveProjectVariable(variable.key, context);

      case 'user':
        return this.resolveUserVariable(variable.key, context);

      case 'custom':
        return context.customVariables?.[variable.key] || variable.default;

      case 'system':
        return this.resolveSystemVariable(variable.key);

      default:
        return variable.default || '';
    }
  }

  /**
   * Resolve project-specific variables
   */
  async resolveProjectVariable(key, context) {
    if (!context.project) {
      return null;
    }

    const project = context.project;

    switch (key) {
      case '{{AGENCY_NAME}}':
        return project.agency || project.agency_name || null;

      case '{{PROJECT_NAME}}':
        return project.name || project.project_name || null;

      case '{{CONTRACT_NUMBER}}':
        return project.contract_number || project.rfp_number || null;

      case '{{SUBMISSION_DATE}}':
        if (project.submission_date) {
          return new Date(project.submission_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Resolve user-specific variables
   */
  resolveUserVariable(key, context) {
    if (!context.user) {
      return null;
    }

    const user = context.user;

    switch (key) {
      case '{{USER_NAME}}':
        return user.full_name || user.name || null;

      case '{{USER_ROLE}}':
        return user.role || user.role_name || null;

      default:
        return null;
    }
  }

  /**
   * Resolve system-wide variables
   */
  resolveSystemVariable(key) {
    switch (key) {
      case '{{CURRENT_DATE}}':
        return new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });

      case '{{CURRENT_TIME}}':
        return new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

      default:
        return null;
    }
  }

  /**
   * Utility function to escape regex special characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Test the prompt compilation with sample context
   */
  async testCompilation(config, sampleContext = {}) {
    const defaultContext = {
      project: {
        agency_name: 'Department of Defense',
        name: 'Next-Gen Communications System',
        contract_number: 'W15P7T-24-R-0001',
        submission_date: '2024-12-15'
      },
      user: {
        full_name: 'Jane Smith',
        role: 'Proposal Manager'
      },
      customVariables: {
        '{{WIN_THEMES}}': 'proven past performance, cost efficiency, technical innovation'
      }
    };

    const mergedContext = { ...defaultContext, ...sampleContext };
    return this.compileGlobalPrompt(config, mergedContext);
  }

  /**
   * Validate a prompt configuration
   */
  validateConfig(config) {
    const errors = [];

    // Validate base prompt
    if (!config.base_prompt) {
      errors.push('Base prompt is required');
    } else if (config.base_prompt.length > 2000) {
      errors.push('Base prompt must be less than 2000 characters');
    }

    // Validate rules
    if (config.rules && Array.isArray(config.rules)) {
      config.rules.forEach((rule, index) => {
        if (!rule.rule) {
          errors.push(`Rule ${index + 1} is missing rule text`);
        }
        if (!rule.type) {
          errors.push(`Rule ${index + 1} is missing type`);
        }
        if (rule.rule && rule.rule.length > 200) {
          errors.push(`Rule ${index + 1} text must be less than 200 characters`);
        }
      });
    }

    // Validate variables
    if (config.variables && Array.isArray(config.variables)) {
      const variableKeys = new Set();
      config.variables.forEach((variable, index) => {
        if (!variable.key) {
          errors.push(`Variable ${index + 1} is missing key`);
        } else {
          // Check for valid format {{KEY}}
          if (!variable.key.match(/^{{[A-Z_]+}}$/)) {
            errors.push(`Variable ${index + 1} key must be in format {{VARIABLE_NAME}}`);
          }
          // Check for duplicates
          if (variableKeys.has(variable.key)) {
            errors.push(`Duplicate variable key: ${variable.key}`);
          }
          variableKeys.add(variable.key);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if prompt should be applied based on context
   */
  shouldApplyGlobalPrompt(context) {
    // Don't apply to strict RAG queries
    if (context.type === 'rag_strict' || context.type === 'factual') {
      return false;
    }

    // Apply to all creative writing tasks
    if (context.type === 'creative' || context.type === 'proposal' || context.type === 'narrative') {
      return true;
    }

    // Default to applying for safety
    return true;
  }
}

module.exports = PromptCompilerService;