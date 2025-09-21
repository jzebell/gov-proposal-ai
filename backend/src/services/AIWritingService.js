/**
 * AI Writing Service
 * Epic 3: AI-powered proposal writing and content generation
 */

const axios = require('axios');
const logger = require('../utils/logger');

class AIWritingService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.defaultModel = process.env.OLLAMA_MODEL || 'qwen2.5:14b';
  }

  /**
   * Generate proposal section content
   */
  async generateSection(prompt, sectionType, requirements = {}) {
    try {
      logger.info(`Generating ${sectionType} section`);

      const systemPrompt = this.getSystemPrompt(sectionType);
      const enhancedPrompt = this.buildPrompt(prompt, requirements, sectionType);

      const response = await this.callOllama({
        model: this.defaultModel,
        prompt: `${systemPrompt}\n\n${enhancedPrompt}`,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2000
        }
      });

      logger.info(`Generated ${response.length} characters for ${sectionType}`);

      return {
        content: response,
        sectionType,
        wordCount: this.countWords(response),
        generatedAt: new Date().toISOString(),
        model: this.defaultModel
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
   * Get system prompts for different section types
   */
  getSystemPrompt(sectionType) {
    const prompts = {
      'technical-approach': `You are an expert technical writer specializing in government proposals. Write clear, detailed technical approaches that demonstrate deep understanding of requirements and proven methodologies.`,

      'management-plan': `You are an expert project manager and proposal writer. Create comprehensive management plans that show strong leadership, clear processes, and risk mitigation strategies.`,

      'past-performance': `You are an expert at writing compelling past performance narratives. Highlight relevant experience, successful outcomes, and lessons learned that directly relate to the current requirement.`,

      'executive-summary': `You are an expert proposal writer. Create compelling executive summaries that capture attention, demonstrate understanding, and persuade evaluators of your capabilities.`,

      'general': `You are an expert government proposal writer with deep knowledge of federal acquisition requirements and evaluation criteria. Write professional, compliant, and persuasive content.`
    };

    return prompts[sectionType] || prompts.general;
  }

  /**
   * Build enhanced prompt with context
   */
  buildPrompt(userPrompt, requirements, sectionType) {
    let prompt = userPrompt;

    if (requirements.length || requirements.budget || requirements.timeline) {
      prompt += '\n\nKey Requirements:';
      if (requirements.length) prompt += `\n- Target length: ${requirements.length} words`;
      if (requirements.budget) prompt += `\n- Budget considerations: ${requirements.budget}`;
      if (requirements.timeline) prompt += `\n- Timeline: ${requirements.timeline}`;
    }

    if (requirements.evaluationCriteria) {
      prompt += `\n\nEvaluation Criteria to Address:\n${requirements.evaluationCriteria}`;
    }

    if (requirements.pastPerformance) {
      prompt += `\n\nRelevant Past Performance:\n${requirements.pastPerformance}`;
    }

    prompt += `\n\nPlease write a professional ${sectionType} section that addresses these requirements.`;

    return prompt;
  }

  /**
   * Call Ollama API
   */
  async callOllama(params) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, params, {
        timeout: 60000 // 60 second timeout
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
   * Get available models
   */
  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      logger.error(`Error getting models: ${error.message}`);
      return [];
    }
  }
}

module.exports = AIWritingService;