/**
 * AI Writing Service
 * Epic 3: AI-powered proposal writing and content generation
 */

const axios = require('axios');
const logger = require('../utils/logger');
const PersonasService = require('./PersonasService');
const ContextService = require('./ContextService');

class AIWritingService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.defaultModel = process.env.OLLAMA_MODEL || 'gemma2:9b';
    this.personasService = new PersonasService();
    this.contextService = new ContextService();
  }

  /**
   * Generate proposal section content
   */
  async generateSection(prompt, sectionType, requirements = {}) {
    try {
      logger.info(`Generating content with persona: ${requirements.personaId || 'default'}`);

      // Get project context if available
      const projectName = requirements.projectName || 'AI Writing Test Project';
      const documentType = requirements.documentType || 'solicitations';

      let contextData = null;
      try {
        const context = await this.contextService.getProjectContext(projectName, documentType);
        if (context && context.contextData) {
          contextData = context;
        }
      } catch (error) {
        logger.warn(`Could not load context: ${error.message}`);
      }

      // Build the prompt based on mode and available context
      let finalPrompt = prompt;
      let systemPrompt = '';
      let temperature = 0.7;

      if (requirements.noHallucinations && contextData) {
        // Pure RAG mode - use documents only and require citations
        systemPrompt = 'You are a helpful assistant that ONLY answers based on the provided documents. Always cite your sources using [Source: filename, section] format. If the answer cannot be found in the provided documents, say "I cannot find this information in the provided documents."';

        // Add document context
        const documentContext = this.buildContextString(contextData);
        finalPrompt = `${documentContext}\n\nQuestion: ${prompt}`;
        temperature = 0.3; // Lower temperature for more factual responses

        logger.info(`Using RAG mode with ${contextData.documentCount || 0} documents`);
      } else if (contextData && !requirements.noHallucinations) {
        // Augmented mode - use documents to inform creative writing
        systemPrompt = await this.getPersonaSystemPrompt(requirements.personaId);

        // Add context as reference material
        const documentContext = this.buildContextString(contextData);
        const contextualSystemPrompt = `${systemPrompt}\n\nREFERENCE MATERIAL:\n${documentContext}\n\nUse the reference material to inform your response, but you can also draw from your general knowledge. Prioritize information from the reference documents when relevant.`;

        finalPrompt = prompt;
        systemPrompt = contextualSystemPrompt;
        temperature = 0.6; // Slightly lower temperature when using context

        logger.info(`Using augmented mode with ${contextData.documentCount || 0} documents`);
      } else {
        // Normal mode - persona only, no context
        systemPrompt = await this.getPersonaSystemPrompt(requirements.personaId);
        finalPrompt = prompt;

        logger.info(`Using normal mode without context`);
      }

      const response = await this.callOllama({
        model: requirements.model || this.defaultModel,
        prompt: `${systemPrompt}\n\n${finalPrompt}`,
        stream: false,
        options: {
          temperature: temperature,
          top_p: 0.9,
          max_tokens: 2000
        }
      });

      // Process response based on showThinking setting
      let processedContent = response;
      if (!requirements.showThinking && this.hasThinkingTags(response)) {
        processedContent = this.removeThinkingContent(response);
      }

      logger.info(`Generated ${response.length} characters for ${sectionType}`);

      return {
        content: processedContent,
        sectionType,
        wordCount: this.countWords(processedContent),
        generatedAt: new Date().toISOString(),
        model: requirements.model || this.defaultModel,
        noHallucinations: requirements.noHallucinations || false,
        showThinking: requirements.showThinking || false
      };

    } catch (error) {
      logger.error(`Error generating ${sectionType} section: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze solicitation document and extract requirements
   */
  async analyzeSolicitation(documentText) {
    try {
      logger.info('Analyzing solicitation document');

      const analysisPrompt = `
Analyze this government solicitation document and extract key information:

Document:
${documentText.substring(0, 4000)}...

Please provide a structured analysis including:
1. Project overview and objectives
2. Key technical requirements
3. Proposal sections required
4. Evaluation criteria
5. Compliance requirements
6. Important dates and deadlines
7. Recommended proposal structure

Format your response as structured text with clear headings.
`;

      const response = await this.callOllama({
        model: this.defaultModel,
        prompt: analysisPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          max_tokens: 1500
        }
      });

      return {
        analysis: response,
        extractedRequirements: this.parseRequirements(response),
        analyzedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error analyzing solicitation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Improve existing content
   */
  async improveContent(content, improvementType = 'general') {
    try {
      logger.info(`Improving content: ${improvementType}`);

      const improvementPrompts = {
        clarity: 'Improve the clarity and readability of this content while maintaining technical accuracy',
        technical: 'Enhance the technical depth and accuracy of this content',
        persuasive: 'Make this content more persuasive and compelling for government evaluators',
        compliance: 'Ensure this content addresses compliance requirements and evaluation criteria',
        general: 'Improve the overall quality, clarity, and persuasiveness of this content'
      };

      const prompt = `
${improvementPrompts[improvementType] || improvementPrompts.general}:

Original content:
${content}

Please provide the improved version while maintaining the original structure and key points.
`;

      const response = await this.callOllama({
        model: this.defaultModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.5,
          max_tokens: 2000
        }
      });

      return {
        originalContent: content,
        improvedContent: response,
        improvementType,
        improvedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error improving content: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(proposalData) {
    try {
      logger.info('Generating executive summary');

      const prompt = `
Create a compelling executive summary for this government proposal:

Project: ${proposalData.projectName || 'Government Project'}
Agency: ${proposalData.agency || 'Government Agency'}
Key Requirements: ${proposalData.requirements || 'As specified in the solicitation'}

Technical Approach Summary:
${proposalData.technicalApproach || 'Our proven technical methodology'}

Past Performance Highlights:
${proposalData.pastPerformance || 'Relevant experience with similar projects'}

Management Approach:
${proposalData.management || 'Experienced team and proven processes'}

Create a professional, compelling executive summary that:
- Clearly states our understanding of the requirement
- Highlights our unique qualifications
- Demonstrates value to the government
- Is persuasive yet factual
- Follows government proposal best practices

Keep it concise but comprehensive (2-3 paragraphs).
`;

      const response = await this.callOllama({
        model: this.defaultModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.6,
          max_tokens: 1200
        }
      });

      return {
        executiveSummary: response,
        basedOn: proposalData,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error generating executive summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get system prompt from persona
   */
  async getPersonaSystemPrompt(personaId) {
    try {
      let persona;

      if (personaId) {
        persona = await this.personasService.getPersonaById(personaId);
        if (!persona || !persona.is_active) {
          logger.warn(`Persona ${personaId} not found or inactive, using default`);
          persona = await this.personasService.getDefaultPersona();
        }
      } else {
        persona = await this.personasService.getDefaultPersona();
      }

      if (!persona) {
        logger.error('No default persona found, using fallback');
        return 'You are an expert government proposal writer with deep knowledge of federal acquisition requirements and evaluation criteria. Write professional, compliant, and persuasive content.';
      }

      logger.info(`Using persona: ${persona.display_name}`);
      return persona.system_prompt;
    } catch (error) {
      logger.error(`Error getting persona system prompt: ${error.message}`);
      // Fallback to basic prompt if persona service fails
      return 'You are an expert government proposal writer with deep knowledge of federal acquisition requirements and evaluation criteria. Write professional, compliant, and persuasive content.';
    }
  }

  /**
   * Build context string from processed context data
   */
  buildContextString(contextData) {
    if (!contextData || !contextData.contextData || !contextData.contextData.chunks) {
      return 'No documents available.';
    }

    const chunks = contextData.contextData.chunks;
    if (chunks.length === 0) {
      return 'No document content available.';
    }

    let context = 'DOCUMENT CONTEXT:\n\n';

    // Group chunks by document for better organization
    const chunksByDocument = {};
    chunks.forEach(chunk => {
      const docName = chunk.documentName || 'Unknown Document';
      if (!chunksByDocument[docName]) {
        chunksByDocument[docName] = [];
      }
      chunksByDocument[docName].push(chunk);
    });

    // Build context string with proper citations
    Object.keys(chunksByDocument).forEach(docName => {
      context += `[Source: ${docName}]\n`;

      chunksByDocument[docName].forEach((chunk, index) => {
        // Add section information if available
        const sectionInfo = chunk.sectionType && chunk.sectionType !== 'general'
          ? ` (${chunk.sectionType.replace('_', ' ')})`
          : '';

        context += `\nSection ${index + 1}${sectionInfo}:\n${chunk.content}\n`;
      });

      context += '\n---\n\n';
    });

    return context;
  }

  /**
   * Build document context for no-hallucination mode (deprecated - keeping for compatibility)
   */
  buildDocumentContext(documents) {
    if (!documents || documents.length === 0) {
      return 'No documents available.';
    }

    let context = 'Available Documents:\n';
    documents.forEach((doc, index) => {
      context += `\n[Document: ${doc.originalName || doc.filename}]\n`;
      context += `Document ${index + 1}: ${doc.originalName || doc.filename}\n`;
      if (doc.description) {
        context += `Description: ${doc.description}\n`;
      }
      context += '---\n';
    });

    return context;
  }

  /**
   * Build enhanced prompt with context (deprecated - keeping for compatibility)
   */
  buildPrompt(userPrompt, requirements, sectionType) {
    // This method is now deprecated but kept for backward compatibility
    return userPrompt;
  }

  /**
   * Call Ollama API
   */
  async callOllama(params) {
    try {
      // Increase timeout for larger models
      const timeout = this.getModelTimeout(params.model);

      const response = await axios.post(`${this.ollamaUrl}/api/generate`, params, {
        timeout: timeout
      });

      return response.data.response || response.data.content || '';
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama service is not running. Please start Ollama and try again.');
      }
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  /**
   * Get appropriate timeout for model based on size
   */
  getModelTimeout(modelName = '') {
    // Large models (32B+) need more time
    if (modelName.includes('70b') || modelName.includes('32b')) {
      return 180000; // 3 minutes
    }
    // Medium models (14B) need moderate time
    if (modelName.includes('14b') || modelName.includes('27b') || modelName.includes('33b')) {
      return 120000; // 2 minutes
    }
    // Small to medium models (2B-9B) are faster
    return 90000; // 1.5 minutes
  }

  /**
   * Parse requirements from analysis
   */
  parseRequirements(analysisText) {
    // Simple keyword extraction - could be enhanced with NLP
    const requirements = {
      technical: [],
      compliance: [],
      deliverables: [],
      timeline: null
    };

    const lines = analysisText.split('\n');
    let currentSection = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().includes('technical requirement')) {
        currentSection = 'technical';
      } else if (trimmed.toLowerCase().includes('compliance')) {
        currentSection = 'compliance';
      } else if (trimmed.toLowerCase().includes('deliverable')) {
        currentSection = 'deliverables';
      } else if (trimmed.includes('-') && currentSection) {
        requirements[currentSection].push(trimmed.replace(/^-\s*/, ''));
      }
    }

    return requirements;
  }

  /**
   * Count words in text
   */
  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Check if Ollama service is available
   */
  async isAvailable() {
    try {
      await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get model description for UI display
   */
  getModelDescription(modelName) {
    const descriptions = {
      // Qwen 2.5 models - Alibaba's latest instruction-following models
      'qwen2.5:3b-instruct': 'Qwen 2.5 (3B): Excellent for structured documents and technical writing. Fast and efficient for routine proposal work. (Alibaba)',
      'qwen2.5:7b-instruct': 'Qwen 2.5 (7B): High-quality responses with strong reasoning. Ideal for complex proposals and strategic content. (Alibaba)',
      'qwen2.5:14b-instruct-q4_0': 'Qwen 2.5 (14B): Large model with superior reasoning. Best for comprehensive analysis and high-stakes documents. (Alibaba)',
      'qwen2.5:32b-instruct-q4_K_M': 'Qwen 2.5 (32B): Premium large-scale model with exceptional performance. Maximum quality for critical documents. (Alibaba)',

      // Meta Llama models - Strong general-purpose capabilities
      'llama3.2:3b': 'Llama 3.2 (3B): Balanced speed and quality for most writing tasks. Good for routine sections and summaries. (Meta)',
      'llama3.1:8b': 'Llama 3.1 (8B): Premium model with sophisticated reasoning. Excellent for important proposals and final drafts. (Meta)',
      'llama3.1:70b-instruct-q4_k_m': 'Llama 3.1 (70B): Ultra-large model with exceptional capabilities. Best for the most critical and complex documents. (Meta)',

      // Google Gemma models - Efficient and capable
      'gemma2:2b': 'Gemma 2 (2B): Ultra-efficient for clear, concise writing. Perfect for quick drafts and executive summaries. (Google)',
      'gemma2:9b': 'Gemma 2 (9B): **RECOMMENDED** Advanced reasoning with excellent performance. Ideal for most proposal writing tasks. (Google)',
      'gemma2:27b': 'Gemma 2 (27B): Large-scale model with superior capabilities. Best for complex analysis and comprehensive proposals. (Google)',

      // DeepSeek models - Code-aware and reasoning-focused
      'deepseek-coder:6.7b': 'DeepSeek Coder (6.7B): Specialized for technical documents with code examples and system architectures. (DeepSeek)',
      'deepseek-coder:33b-instruct-q4_k_m': 'DeepSeek Coder (33B): Large code-aware model for complex technical proposals and system designs. (DeepSeek)',
      'deepseek-r1:8b': 'DeepSeek R1 (8B): Advanced reasoning model for analytical and strategic content. Good for problem-solving sections. (DeepSeek)',
      'deepseek-r1:14b': 'DeepSeek R1 (14B): Large reasoning model for complex analysis and strategic planning documents. (DeepSeek)',
    };

    return descriptions[modelName] || `${modelName}: Advanced AI model for professional writing and content generation. Suitable for various proposal tasks.`;
  }

  /**
   * Get the company name for a model
   */
  getModelCompany(modelName) {
    if (modelName.startsWith('qwen')) return 'Alibaba';
    if (modelName.startsWith('llama')) return 'Meta';
    if (modelName.startsWith('gemma')) return 'Google';
    if (modelName.startsWith('deepseek')) return 'DeepSeek';
    return 'Unknown';
  }

  /**
   * Check if content contains thinking tags (DeepSeek models)
   */
  hasThinkingTags(content) {
    return content.includes('<thinking>') || content.includes('<think>') ||
           content.includes('</thinking>') || content.includes('</think>');
  }

  /**
   * Remove thinking content from response
   */
  removeThinkingContent(content) {
    // Remove <thinking>...</thinking> blocks
    let processed = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    // Remove <think>...</think> blocks
    processed = processed.replace(/<think>[\s\S]*?<\/think>/gi, '');
    // Clean up any extra whitespace
    processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    return processed;
  }

  /**
   * Get available models
   */
  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      const ollamaModels = response.data.models || [];

      // Transform Ollama model data to frontend format with enhanced descriptions
      const models = ollamaModels.map(model => ({
        id: model.name,
        name: model.name,
        provider: 'Ollama',
        size: model.size,
        modified: model.modified_at,
        description: this.getModelDescription(model.name),
        isRecommended: model.name === 'gemma2:9b'
      }));

      // Sort models alphabetically (A-Z), with gemma2:9b (recommended) first
      models.sort((a, b) => {
        if (a.name === 'gemma2:9b') return -1;
        if (b.name === 'gemma2:9b') return 1;
        return a.name.localeCompare(b.name);
      });

      return models;
    } catch (error) {
      logger.error(`Error getting models: ${error.message}`);

      // Fallback to environment variable list or default models if Ollama API fails
      const envModels = process.env.OLLAMA_MODELS ?
        process.env.OLLAMA_MODELS.split(',').map(model => ({
          id: model.trim(),
          name: model.trim(),
          provider: `${this.getModelCompany(model.trim())} (offline)`,
          size: null,
          modified: null,
          description: this.getModelDescription(model.trim()),
          isRecommended: model.trim() === 'gemma2:9b'
        })) : [
          // Default fallback models with gemma2:9b first
          {
            id: 'gemma2:9b',
            name: 'gemma2:9b',
            provider: 'Google (offline)',
            size: null,
            modified: null,
            description: this.getModelDescription('gemma2:9b'),
            isRecommended: true
          },
          {
            id: 'qwen2.5:14b-instruct-q4_0',
            name: 'qwen2.5:14b-instruct-q4_0',
            provider: 'Alibaba (offline)',
            size: null,
            modified: null,
            description: this.getModelDescription('qwen2.5:14b-instruct-q4_0'),
            isRecommended: false
          }
        ];

      return envModels;
    }
  }
}

module.exports = AIWritingService;