/**
 * Citation Service
 * Manages interactive citations, document previews, and citation analytics
 */

const GlobalSettingsService = require('./GlobalSettingsService');
const DocumentManagerService = require('./DocumentManagerService');
const logger = require('../utils/logger');
const crypto = require('crypto');

class CitationService {
  constructor() {
    this.globalSettingsService = new GlobalSettingsService();
    this.documentManager = new DocumentManagerService();
    this.citationCache = new Map(); // Cache for frequently accessed citations
  }

  /**
   * Generate enhanced citations from context chunks
   * @param {Array} contextChunks - Array of context chunks with document references
   * @param {string} generatedContent - The AI-generated content containing citations
   * @returns {Promise<Array>} Array of enhanced citation objects
   */
  async generateEnhancedCitations(contextChunks, generatedContent) {
    try {
      logger.info(`Generating enhanced citations for ${contextChunks.length} context chunks`);

      const citations = [];
      const citationMap = new Map();

      // Extract citation references from generated content
      const citationReferences = this.extractCitationReferences(generatedContent);

      for (const chunk of contextChunks) {
        // Check if this chunk is actually cited in the generated content
        const isReferenced = this.isChunkReferenced(chunk, generatedContent, citationReferences);

        if (isReferenced) {
          const citationId = this.generateCitationId(chunk);

          if (!citationMap.has(citationId)) {
            const enhancedCitation = await this.createEnhancedCitation(chunk);
            citations.push(enhancedCitation);
            citationMap.set(citationId, enhancedCitation);

            // Track citation usage for analytics
            await this.trackCitationUsage(enhancedCitation.documentId, chunk.chunkIndex);
          }
        }
      }

      logger.info(`Generated ${citations.length} enhanced citations`);
      return citations.sort((a, b) => a.citationNumber - b.citationNumber);

    } catch (error) {
      logger.error(`Error generating enhanced citations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create an enhanced citation object with navigation and preview data
   * @param {Object} chunk - Context chunk object
   * @returns {Promise<Object>} Enhanced citation object
   */
  async createEnhancedCitation(chunk) {
    try {
      // Generate unique citation ID
      const citationId = this.generateCitationId(chunk);

      // Get document metadata
      const documentInfo = await this.getDocumentInfo(chunk.documentId);

      // Extract surrounding context for preview
      const contextPreview = await this.generateContextPreview(chunk);

      // Determine section information
      const sectionInfo = this.analyzeSectionContext(chunk);

      const enhancedCitation = {
        id: citationId,
        citationNumber: this.assignCitationNumber(citationId),

        // Document reference information
        documentId: chunk.documentId,
        documentName: chunk.documentName || documentInfo.originalName,
        documentType: documentInfo.category,

        // Chunk-specific information
        chunkId: chunk.id,
        chunkIndex: chunk.chunkIndex,

        // Content preview and navigation
        contentPreview: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
        contextPreview: contextPreview,

        // Section and navigation info
        sectionType: chunk.sectionType || sectionInfo.detectedSection,
        sectionTitle: sectionInfo.title,
        pageNumber: this.estimatePageNumber(chunk),

        // Interactive features
        isInteractive: true,
        previewAvailable: true,
        navigatable: true,

        // Metadata for analytics
        relevanceScore: this.calculateCitationRelevance(chunk),
        wordCount: chunk.wordCount || this.countWords(chunk.content),
        characterCount: chunk.characterCount || chunk.content.length,

        // Timestamps
        createdAt: new Date().toISOString(),
        lastAccessed: null,
        accessCount: 0
      };

      return enhancedCitation;

    } catch (error) {
      logger.error(`Error creating enhanced citation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get document preview data for citation navigation
   * @param {number} documentId - Document ID
   * @param {number} chunkIndex - Chunk index for context
   * @param {Object} options - Preview options
   * @returns {Promise<Object>} Document preview data
   */
  async getDocumentPreview(documentId, chunkIndex = 0, options = {}) {
    try {
      const {
        contextLines = 5,
        highlightTerms = [],
        includeMetadata = true
      } = options;

      logger.info(`Getting document preview for document ${documentId}, chunk ${chunkIndex}`);

      // Get document information
      const document = await this.documentManager.documentModel.findById(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Get document content
      const content = await this.documentManager.getDocumentContent(
        document.category,
        document.projectName,
        document.originalName
      );

      // Process content into chunks for navigation
      const chunks = await this.processContentForPreview(content.content, document);

      // Find the specific chunk and surrounding context
      const targetChunk = chunks[chunkIndex] || chunks[0];
      const contextChunks = this.getContextChunks(chunks, chunkIndex, contextLines);

      const preview = {
        documentInfo: {
          id: document.id,
          name: document.originalName,
          category: document.category,
          projectName: document.projectName,
          uploadedAt: document.createdAt,
          size: document.size,
          metadata: includeMetadata ? document.metadata : null
        },

        content: {
          targetChunk: {
            index: chunkIndex,
            content: targetChunk ? targetChunk.content : '',
            sectionType: targetChunk ? targetChunk.sectionType : 'unknown',
            highlighted: this.highlightTerms(targetChunk?.content || '', highlightTerms)
          },

          contextChunks: contextChunks.map(chunk => ({
            index: chunk.index,
            content: chunk.content,
            sectionType: chunk.sectionType,
            highlighted: this.highlightTerms(chunk.content, highlightTerms)
          })),

          navigation: {
            currentChunk: chunkIndex,
            totalChunks: chunks.length,
            hasNext: chunkIndex < chunks.length - 1,
            hasPrevious: chunkIndex > 0,
            sections: this.extractSectionMap(chunks)
          }
        },

        previewMetadata: {
          generatedAt: new Date().toISOString(),
          contextLines,
          highlightTerms,
          chunkCount: chunks.length
        }
      };

      // Cache the preview for performance
      this.cachePreview(documentId, chunkIndex, preview);

      return preview;

    } catch (error) {
      logger.error(`Error getting document preview: ${error.message}`);
      throw error;
    }
  }

  /**
   * Track citation access for analytics
   * @param {string} citationId - Citation ID
   * @param {string} projectName - Project name
   * @param {Object} accessInfo - Access information
   */
  async trackCitationAccess(citationId, projectName, accessInfo = {}) {
    try {
      const {
        userId = 'anonymous',
        accessType = 'view',
        duration = null,
        userRating = null
      } = accessInfo;

      logger.info(`Tracking citation access: ${citationId} by ${userId}`);

      // Update access count and timestamp
      const citation = await this.getCitationById(citationId);
      if (citation) {
        citation.accessCount = (citation.accessCount || 0) + 1;
        citation.lastAccessed = new Date().toISOString();
      }

      // Log analytics data (future: store in citation_analytics table)
      const analyticsEvent = {
        citationId,
        projectName,
        userId,
        accessType,
        duration,
        userRating,
        timestamp: new Date().toISOString(),
        sessionId: this.generateSessionId()
      };

      logger.info(`Citation analytics: ${JSON.stringify(analyticsEvent)}`);

      // Future enhancement: Store in database
      // await this.storeCitationAnalytics(analyticsEvent);

    } catch (error) {
      logger.error(`Error tracking citation access: ${error.message}`);
    }
  }

  /**
   * Get citation analytics for a project
   * @param {string} projectName - Project name
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} Citation analytics data
   */
  async getCitationAnalytics(projectName, days = 30) {
    try {
      // Mock analytics data - in production this would query citation_analytics table
      return {
        projectName,
        timeRange: { days },
        totalCitations: 0,
        totalAccesses: 0,
        mostAccessedDocuments: [],
        citationPatterns: {
          byDocumentType: {},
          bySection: {},
          byTimeOfDay: {}
        },
        userEngagement: {
          averageViewDuration: 0,
          clickThroughRate: 0,
          documentNavigationRate: 0
        },
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error getting citation analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract citation references from generated content
   * @param {string} content - Generated content
   * @returns {Array} Array of citation references
   */
  extractCitationReferences(content) {
    // Look for citation patterns like [1], (Document X), etc.
    const patterns = [
      /\[(\d+)\]/g,           // [1], [2], etc.
      /\(([^)]+\.(?:pdf|docx?|txt))\)/gi, // (filename.pdf)
      /(?:source|ref|cite):\s*([^\s]+)/gi, // source: filename
      /according to ([^,]+)/gi             // according to document
    ];

    const references = [];
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        references.push({
          fullMatch: match[0],
          reference: match[1],
          index: match.index,
          pattern: pattern.source
        });
      }
    });

    return references;
  }

  /**
   * Check if a context chunk is referenced in generated content
   * @param {Object} chunk - Context chunk
   * @param {string} content - Generated content
   * @param {Array} references - Citation references
   * @returns {boolean} True if chunk is referenced
   */
  isChunkReferenced(chunk, content, references) {
    // Simple heuristic: check if document name appears in content or references
    const documentName = chunk.documentName?.toLowerCase() || '';
    const contentLower = content.toLowerCase();

    // Direct document name reference
    if (documentName && contentLower.includes(documentName)) {
      return true;
    }

    // Check if content contains key phrases from the chunk
    const chunkKeywords = this.extractKeywords(chunk.content);
    const matchingKeywords = chunkKeywords.filter(keyword =>
      contentLower.includes(keyword.toLowerCase())
    );

    // If significant keyword overlap, consider it referenced
    return matchingKeywords.length >= Math.min(3, chunkKeywords.length * 0.3);
  }

  /**
   * Generate unique citation ID
   * @param {Object} chunk - Context chunk
   * @returns {string} Citation ID
   */
  generateCitationId(chunk) {
    const data = `${chunk.documentId}_${chunk.chunkIndex}_${chunk.id}`;
    return crypto.createHash('md5').update(data).digest('hex').substring(0, 12);
  }

  /**
   * Assign citation number for display
   * @param {string} citationId - Citation ID
   * @returns {number} Citation number
   */
  assignCitationNumber(citationId) {
    // Simple incremental numbering - in production, maintain per-generation mapping
    if (!this.citationNumbers) {
      this.citationNumbers = new Map();
      this.nextNumber = 1;
    }

    if (!this.citationNumbers.has(citationId)) {
      this.citationNumbers.set(citationId, this.nextNumber++);
    }

    return this.citationNumbers.get(citationId);
  }

  /**
   * Generate context preview around a chunk
   * @param {Object} chunk - Context chunk
   * @returns {Promise<Object>} Context preview
   */
  async generateContextPreview(chunk) {
    return {
      beforeContent: '...', // Previous chunk content (if available)
      currentContent: chunk.content,
      afterContent: '...',  // Next chunk content (if available)
      sectionContext: chunk.sectionType || 'unknown',
      estimatedPosition: this.estimateRelativePosition(chunk)
    };
  }

  /**
   * Analyze section context for better citation placement
   * @param {Object} chunk - Context chunk
   * @returns {Object} Section analysis
   */
  analyzeSectionContext(chunk) {
    const content = chunk.content.toLowerCase();

    // Enhanced section detection
    const sectionKeywords = {
      'executive_summary': ['executive', 'summary', 'overview', 'abstract'],
      'technical': ['technical', 'technology', 'solution', 'architecture'],
      'management': ['management', 'project', 'timeline', 'schedule'],
      'requirements': ['requirement', 'specification', 'must', 'shall'],
      'experience': ['experience', 'performance', 'past', 'previous']
    };

    let detectedSection = chunk.sectionType || 'general';
    let confidence = 0;

    for (const [section, keywords] of Object.entries(sectionKeywords)) {
      const matches = keywords.filter(keyword => content.includes(keyword)).length;
      const sectionConfidence = matches / keywords.length;

      if (sectionConfidence > confidence) {
        confidence = sectionConfidence;
        detectedSection = section;
      }
    }

    return {
      detectedSection,
      confidence,
      title: this.generateSectionTitle(detectedSection, chunk.content)
    };
  }

  /**
   * Utility methods
   */

  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  extractKeywords(content) {
    return content.toLowerCase()
      .match(/\b[a-z]{4,}\b/g) || [];
  }

  estimatePageNumber(chunk) {
    // Simple estimation based on chunk position
    return Math.ceil((chunk.chunkIndex + 1) / 3); // ~3 chunks per page
  }

  estimateRelativePosition(chunk) {
    // Estimate position as percentage
    return chunk.chunkIndex ? (chunk.chunkIndex / 10) * 100 : 0; // Rough estimate
  }

  generateSectionTitle(sectionType, content) {
    const firstLine = content.split('\n')[0];
    if (firstLine.length < 100) {
      return firstLine.trim();
    }
    return `${sectionType.replace('_', ' ').toUpperCase()} Section`;
  }

  calculateCitationRelevance(chunk) {
    // Simple relevance scoring based on content characteristics
    let score = 50; // Base score

    const content = chunk.content.toLowerCase();

    // Boost for important sections
    if (content.includes('requirement') || content.includes('specification')) score += 20;
    if (content.includes('executive') || content.includes('summary')) score += 15;

    // Content quality indicators
    if (chunk.wordCount > 50 && chunk.wordCount < 500) score += 10;
    if (content.includes('shall') || content.includes('must')) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  generateSessionId() {
    return crypto.randomBytes(8).toString('hex');
  }

  // Cache and utility methods for preview system
  cachePreview(documentId, chunkIndex, preview) {
    const key = `${documentId}_${chunkIndex}`;
    this.citationCache.set(key, {
      preview,
      cachedAt: Date.now(),
      ttl: 30 * 60 * 1000 // 30 minutes
    });
  }

  async processContentForPreview(content, document) {
    // Reuse existing chunking logic from ContextService
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    return paragraphs.map((paragraph, index) => ({
      index,
      content: paragraph.trim(),
      wordCount: this.countWords(paragraph),
      characterCount: paragraph.length,
      sectionType: this.detectBasicSectionType(paragraph)
    }));
  }

  getContextChunks(chunks, centerIndex, contextLines) {
    const start = Math.max(0, centerIndex - contextLines);
    const end = Math.min(chunks.length, centerIndex + contextLines + 1);
    return chunks.slice(start, end).map(chunk => ({ ...chunk, index: chunk.index }));
  }

  highlightTerms(content, terms) {
    if (!terms || terms.length === 0) return content;

    let highlighted = content;
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
  }

  extractSectionMap(chunks) {
    const sections = {};
    chunks.forEach(chunk => {
      if (!sections[chunk.sectionType]) {
        sections[chunk.sectionType] = [];
      }
      sections[chunk.sectionType].push(chunk.index);
    });
    return sections;
  }

  detectBasicSectionType(content) {
    const lower = content.toLowerCase();

    if (lower.includes('executive') || lower.includes('summary')) return 'executive_summary';
    if (lower.includes('technical') || lower.includes('solution')) return 'technical';
    if (lower.includes('management') || lower.includes('timeline')) return 'management';
    if (lower.includes('requirement') || lower.includes('specification')) return 'requirements';
    if (lower.includes('experience') || lower.includes('performance')) return 'experience';

    return 'general';
  }

  async getDocumentInfo(documentId) {
    // Get from document manager or cache
    return await this.documentManager.documentModel.findById(documentId);
  }

  async getCitationById(citationId) {
    // In production, this would query the database
    return null;
  }

  async trackCitationUsage(documentId, chunkIndex) {
    logger.info(`Tracking citation usage: document ${documentId}, chunk ${chunkIndex}`);
    // Future: implement database logging
  }
}

module.exports = CitationService;