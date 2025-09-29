/**
 * Context Service
 * Manages document context building and caching for AI operations
 */

const crypto = require('crypto');
const ProjectContext = require('../models/ProjectContext');
const DocumentManagerService = require('./DocumentManagerService');
const logger = require('../utils/logger');

class ContextService {
  constructor() {
    this.projectContext = new ProjectContext();
    this.documentManager = new DocumentManagerService();
    this.buildTimeouts = new Map(); // Track build delays
  }

  /**
   * Get context for a project, building if needed
   */
  async getProjectContext(projectName, documentType) {
    try {
      logger.info(`Getting context for ${projectName}/${documentType}`);

      // Check if context exists and is current
      const currentChecksum = await this.calculateProjectChecksum(projectName, documentType);
      const needsRebuild = await this.projectContext.needsRebuild(projectName, documentType, currentChecksum);

      if (!needsRebuild) {
        const cached = await this.projectContext.getContext(projectName, documentType);
        if (cached) {
          logger.info(`Using cached context: ${cached.tokenCount} tokens from ${cached.documentCount} documents`);
          return cached;
        }
      }

      // Check if context is already building
      const buildStatus = await this.projectContext.getBuildStatus(projectName, documentType);
      if (buildStatus.status === 'building') {
        logger.info(`Context already building for ${projectName}/${documentType}`);
        return { status: 'building', buildTimestamp: buildStatus.buildTimestamp };
      }

      // Trigger background build
      this.triggerContextBuild(projectName, documentType);

      return { status: 'building', buildTimestamp: new Date().toISOString() };
    } catch (error) {
      logger.error(`Error getting project context: ${error.message}`);
      throw error;
    }
  }

  /**
   * Trigger context building with delay (handles multiple rapid calls)
   */
  triggerContextBuild(projectName, documentType) {
    const key = `${projectName}:${documentType}`;

    // Clear existing timeout if any
    if (this.buildTimeouts.has(key)) {
      clearTimeout(this.buildTimeouts.get(key));
    }

    // Set new timeout for 10 seconds
    const timeout = setTimeout(async () => {
      this.buildTimeouts.delete(key);
      await this.buildProjectContext(projectName, documentType);
    }, 10000);

    this.buildTimeouts.set(key, timeout);
    logger.info(`Scheduled context build for ${projectName}/${documentType} in 10 seconds`);
  }

  /**
   * Cancel pending context build
   */
  cancelContextBuild(projectName, documentType) {
    const key = `${projectName}:${documentType}`;
    if (this.buildTimeouts.has(key)) {
      clearTimeout(this.buildTimeouts.get(key));
      this.buildTimeouts.delete(key);
      logger.info(`Cancelled context build for ${projectName}/${documentType}`);
    }
  }

  /**
   * Build context for a project
   */
  async buildProjectContext(projectName, documentType, retryCount = 0) {
    try {
      logger.info(`Building context for ${projectName}/${documentType} (attempt ${retryCount + 1})`);

      // Mark as building
      try {
        await this.projectContext.markBuilding(projectName, documentType);
        logger.info(`Marked as building successfully`);
      } catch (markError) {
        logger.error(`Error marking as building: ${markError.message}`);
        throw markError;
      }

      // Get all active documents for the project
      logger.info(`About to call getProjectDocuments for ${projectName}/${documentType}`);
      const documents = await this.getProjectDocuments(projectName, documentType);
      logger.info(`getProjectDocuments returned ${documents?.length || 0} documents`);

      if (documents.length === 0) {
        logger.warn(`No documents found for ${projectName}/${documentType}`);
        await this.projectContext.markFailed(projectName, documentType, 'No documents found');
        return;
      }

      // Process documents and build context
      const contextData = await this.processDocuments(documents);

      // Calculate metadata
      const metadata = this.calculateContextMetadata(contextData, documents);

      // Save to cache
      await this.projectContext.saveContext(projectName, documentType, contextData, metadata);

      logger.info(`✅ Context built successfully: ${metadata.tokenCount} tokens from ${metadata.documentCount} documents`);

    } catch (error) {
      logger.error(`Context build failed for ${projectName}/${documentType}: ${error.message}`);

      // Retry logic (up to 3 attempts)
      if (retryCount < 2) {
        logger.info(`Retrying context build (${retryCount + 2}/3)...`);
        setTimeout(() => {
          this.buildProjectContext(projectName, documentType, retryCount + 1);
        }, 5000); // 5 second delay before retry
      } else {
        await this.projectContext.markFailed(projectName, documentType, error.message);
      }
    }
  }

  /**
   * Get documents for a project
   */
  async getProjectDocuments(projectName, documentType) {
    try {
      logger.info(`Searching for documents with projectName="${projectName}", status="active"`);

      // Get all documents for the project regardless of category
      // This allows projects to contain documents of different types (solicitations, references, etc.)
      const results = await this.documentManager.documentModel.list({
        projectName: projectName,
        status: 'active' // Only active documents
      }, { limit: 1000 });

      logger.info(`Found ${results.documents?.length || 0} documents for project "${projectName}"`);

      // Apply basic priority rules
      return this.prioritizeDocuments(results.documents || []);
    } catch (error) {
      logger.error(`Error getting project documents: ${error.message}`);
      logger.error(`Error stack: ${error.stack}`);
      return [];
    }
  }

  /**
   * Apply document prioritization with enhanced rules
   */
  prioritizeDocuments(documents) {
    return documents.sort((a, b) => {
      // Priority 1: Active status (already filtered, but explicit)
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1;
      }

      // Priority 2: Document type hierarchy
      const typeScore = this.getDocumentTypeScore(a) - this.getDocumentTypeScore(b);
      if (typeScore !== 0) {
        return typeScore; // Lower scores (higher priority) first
      }

      // Priority 3: Metadata matching (basic implementation)
      const metadataScore = this.getMetadataScore(a) - this.getMetadataScore(b);
      if (metadataScore !== 0) {
        return metadataScore; // Lower scores (higher priority) first
      }

      // Priority 4: Recency (newer first)
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();

      return bTime - aTime; // Descending order (newest first)
    });
  }

  /**
   * Get document type priority score (lower = higher priority)
   */
  getDocumentTypeScore(document) {
    const category = document.category?.toLowerCase() || '';

    // Document type hierarchy (configurable in admin - this is default)
    const typeHierarchy = {
      'solicitations': 1,      // Highest priority
      'requirements': 2,
      'references': 3,
      'past-performance': 4,
      'proposals': 5,
      'compliance': 6,
      'media': 7               // Lowest priority
    };

    return typeHierarchy[category] || 8; // Unknown types get lowest priority
  }

  /**
   * Get metadata-based priority score (basic implementation)
   */
  getMetadataScore(document) {
    let score = 0;

    // Check for important keywords in filename or description
    const text = `${document.originalName} ${document.description || ''}`.toLowerCase();

    // High priority keywords (reduce score = increase priority)
    if (text.includes('executive') || text.includes('summary')) score -= 3;
    if (text.includes('requirement') || text.includes('specification')) score -= 2;
    if (text.includes('technical') || text.includes('approach')) score -= 2;
    if (text.includes('management') || text.includes('plan')) score -= 1;

    // Check file size - prefer reasonably sized documents for context
    const size = document.size || 0;
    if (size > 5 * 1024 * 1024) { // > 5MB
      score += 3; // Penalize very large documents
    } else if (size < 1024) { // < 1KB
      score += 2; // Penalize very small documents
    }

    return score;
  }

  /**
   * Process documents into context chunks
   */
  async processDocuments(documents) {
    const contextChunks = [];
    const failedDocuments = [];

    for (const document of documents) {
      try {
        logger.info(`Processing document: ${document.originalName}`);

        // Extract text content
        const content = await this.documentManager.getDocumentContent(
          document.category,
          document.projectName,
          document.originalName
        );

        // Create chunks (basic implementation for now)
        const chunks = await this.createDocumentChunks(document, content.content);
        contextChunks.push(...chunks);

      } catch (error) {
        logger.error(`Failed to process document ${document.originalName}: ${error.message}`);
        failedDocuments.push({
          filename: document.originalName,
          error: error.message
        });
      }
    }

    return {
      chunks: contextChunks,
      failedDocuments: failedDocuments,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Create chunks from document content (basic implementation)
   */
  async createDocumentChunks(document, content) {
    if (!content || typeof content !== 'string') {
      return [];
    }

    // Basic chunking by paragraphs for now
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    return paragraphs.map((paragraph, index) => ({
      id: `${document.id}_chunk_${index}`,
      documentId: document.id,
      documentName: document.originalName,
      content: paragraph.trim(),
      chunkIndex: index,
      wordCount: this.countWords(paragraph),
      characterCount: paragraph.length,
      // Basic section detection (can be enhanced later)
      sectionType: this.detectSectionType(paragraph),
      metadata: {
        documentType: document.category,
        projectName: document.projectName,
        uploadDate: document.createdAt
      }
    }));
  }

  /**
   * Basic section type detection (keyword-based)
   */
  detectSectionType(content) {
    const lower = content.toLowerCase();

    if (lower.includes('executive summary') || lower.includes('summary')) {
      return 'executive_summary';
    } else if (lower.includes('technical') || lower.includes('technology') || lower.includes('solution')) {
      return 'technical';
    } else if (lower.includes('management') || lower.includes('project management') || lower.includes('timeline')) {
      return 'management';
    } else if (lower.includes('requirement') || lower.includes('specification')) {
      return 'requirements';
    } else if (lower.includes('experience') || lower.includes('performance') || lower.includes('past')) {
      return 'experience';
    } else {
      return 'general';
    }
  }

  /**
   * Calculate context metadata
   */
  calculateContextMetadata(contextData, documents) {
    const chunks = contextData.chunks || [];

    const totalWordCount = chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0);
    const totalCharacterCount = chunks.reduce((sum, chunk) => sum + chunk.characterCount, 0);

    // Simple token estimation (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokenCount = Math.ceil(totalCharacterCount / 4);

    const checksum = this.calculateDataChecksum(documents);

    return {
      tokenCount: estimatedTokenCount,
      wordCount: totalWordCount,
      characterCount: totalCharacterCount,
      documentCount: documents.length,
      chunkCount: chunks.length,
      checksum: checksum
    };
  }

  /**
   * Calculate checksum for project documents
   */
  async calculateProjectChecksum(projectName, documentType) {
    try {
      const documents = await this.getProjectDocuments(projectName, documentType);
      return this.calculateDataChecksum(documents);
    } catch (error) {
      logger.error(`Error calculating project checksum: ${error.message}`);
      return null;
    }
  }

  /**
   * Calculate checksum from document data
   */
  calculateDataChecksum(documents) {
    const hashData = documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      updatedAt: doc.updatedAt || doc.createdAt,
      size: doc.size
    }));

    return crypto.createHash('md5')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Count words in text
   */
  countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get context size summary for UI
   */
  async getContextSummary(projectName, documentType) {
    try {
      const buildStatus = await this.projectContext.getBuildStatus(projectName, documentType);

      if (buildStatus.status === 'complete') {
        const context = await this.projectContext.getContext(projectName, documentType);
        if (context) {
          return {
            status: 'ready',
            tokenCount: context.tokenCount,
            wordCount: context.wordCount,
            documentCount: context.documentCount,
            lastBuilt: context.buildTimestamp
          };
        }
      }

      return {
        status: buildStatus.status,
        error: buildStatus.errorMessage,
        lastAttempt: buildStatus.buildTimestamp
      };
    } catch (error) {
      logger.error(`Error getting context summary: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Cleanup old contexts
   */
  async cleanup() {
    try {
      await this.projectContext.cleanup(24); // Clean up contexts older than 24 hours
    } catch (error) {
      logger.error(`Context cleanup error: ${error.message}`);
    }
  }
}

module.exports = ContextService;