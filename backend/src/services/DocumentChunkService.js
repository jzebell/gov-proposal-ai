/**
 * Document Chunk Service
 * Handles vector storage and retrieval for semantic search
 */

const { Pool } = require('pg');
const EmbeddingService = require('./EmbeddingService');
const logger = require('../utils/logger');

class DocumentChunkService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Create a document chunk with embedding
   * @param {Object} chunkData - Chunk data
   * @returns {Object} Created chunk
   */
  async createChunk(chunkData) {
    const {
      documentId,
      pastPerformanceId,
      chunkType,
      chunkIndex = 0,
      content,
      sectionTitle,
      pageNumber,
      metadata = {}
    } = chunkData;

    // Validate that chunk belongs to either document or past performance
    if (!documentId && !pastPerformanceId) {
      throw new Error('Chunk must belong to either a document or past performance record');
    }

    if (documentId && pastPerformanceId) {
      throw new Error('Chunk cannot belong to both document and past performance');
    }

    if (!content?.trim()) {
      throw new Error('Chunk content is required');
    }

    try {
      // Generate embedding for the content
      const embedding = await this.embeddingService.generateEmbedding(content);

      const query = `
        INSERT INTO document_chunks (
          document_id, past_performance_id, chunk_type, chunk_index,
          content, section_title, page_number, metadata, embedding
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        documentId || null,
        pastPerformanceId || null,
        chunkType,
        chunkIndex,
        content.trim(),
        sectionTitle,
        pageNumber,
        JSON.stringify(metadata),
        `[${embedding.join(',')}]` // Convert array to PostgreSQL vector format
      ];

      const result = await this.pool.query(query, values);
      logger.debug(`Created document chunk: ${result.rows[0].id}`);

      return this.formatChunk(result.rows[0]);
    } catch (error) {
      logger.error(`Error creating document chunk: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get chunks by document ID
   * @param {string} documentId - Document ID
   * @returns {Array} Document chunks
   */
  async getByDocumentId(documentId) {
    const query = `
      SELECT * FROM document_chunks
      WHERE document_id = $1
      ORDER BY chunk_index
    `;

    try {
      const result = await this.pool.query(query, [documentId]);
      return result.rows.map(row => this.formatChunk(row));
    } catch (error) {
      logger.error(`Error getting chunks by document ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get chunks by past performance ID
   * @param {string} pastPerformanceId - Past performance ID
   * @returns {Array} Past performance chunks
   */
  async getByPastPerformanceId(pastPerformanceId) {
    const query = `
      SELECT * FROM document_chunks
      WHERE past_performance_id = $1
      ORDER BY chunk_index
    `;

    try {
      const result = await this.pool.query(query, [pastPerformanceId]);
      return result.rows.map(row => this.formatChunk(row));
    } catch (error) {
      logger.error(`Error getting chunks by past performance ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform semantic similarity search
   * @param {Array} queryEmbedding - Query embedding vector
   * @param {Object} options - Search options
   * @returns {Array} Similar chunks with similarity scores
   */
  async semanticSearch(queryEmbedding, options = {}) {
    const {
      chunkTypes = [],
      limit = 10,
      threshold = 0.7,
      includeContent = true
    } = options;

    let whereClause = '';
    const values = [`[${queryEmbedding.join(',')}]`, limit];
    let paramIndex = 3;

    // Filter by chunk types if specified
    if (chunkTypes.length > 0) {
      whereClause = `WHERE chunk_type = ANY($${paramIndex})`;
      values.push(chunkTypes);
      paramIndex++;
    }

    // Add similarity threshold
    const similarityThreshold = threshold;

    const query = `
      SELECT
        id,
        document_id,
        past_performance_id,
        chunk_type,
        chunk_index,
        ${includeContent ? 'content,' : ''}
        section_title,
        page_number,
        metadata,
        1 - (embedding <=> $1) as similarity_score
      FROM document_chunks
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} 1 - (embedding <=> $1) >= ${similarityThreshold}
      ORDER BY embedding <=> $1
      LIMIT $2
    `;

    try {
      const result = await this.pool.query(query, values);

      return result.rows.map(row => ({
        id: row.id,
        documentId: row.document_id,
        pastPerformanceId: row.past_performance_id,
        chunkType: row.chunk_type,
        chunkIndex: row.chunk_index,
        content: includeContent ? row.content : undefined,
        sectionTitle: row.section_title,
        pageNumber: row.page_number,
        metadata: row.metadata || {},
        similarityScore: parseFloat(row.similarity_score)
      }));
    } catch (error) {
      logger.error(`Error performing semantic search: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update chunk content and regenerate embedding
   * @param {string} chunkId - Chunk ID
   * @param {Object} updates - Updates to apply
   * @returns {Object|null} Updated chunk
   */
  async updateChunk(chunkId, updates) {
    const allowedFields = ['content', 'section_title', 'page_number', 'metadata'];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    // Build update fields
    Object.keys(updates).forEach(field => {
      const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = $${paramIndex}`);

        if (dbField === 'metadata') {
          values.push(JSON.stringify(updates[field]));
        } else {
          values.push(updates[field]);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // If content is being updated, regenerate embedding
    if (updates.content) {
      try {
        const embedding = await this.embeddingService.generateEmbedding(updates.content);
        updateFields.push(`embedding = $${paramIndex}`);
        values.push(`[${embedding.join(',')}]`);
        paramIndex++;
      } catch (error) {
        logger.warn(`Could not regenerate embedding: ${error.message}`);
      }
    }

    values.push(chunkId);

    const query = `
      UPDATE document_chunks
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }

      logger.debug(`Updated document chunk: ${chunkId}`);
      return this.formatChunk(result.rows[0]);
    } catch (error) {
      logger.error(`Error updating chunk: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete chunk
   * @param {string} chunkId - Chunk ID
   * @returns {boolean} Success status
   */
  async deleteChunk(chunkId) {
    const query = 'DELETE FROM document_chunks WHERE id = $1 RETURNING id';

    try {
      const result = await this.pool.query(query, [chunkId]);
      const deleted = result.rows.length > 0;

      if (deleted) {
        logger.debug(`Deleted document chunk: ${chunkId}`);
      }

      return deleted;
    } catch (error) {
      logger.error(`Error deleting chunk: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk create chunks for a document or past performance
   * @param {Array} chunksData - Array of chunk data
   * @returns {Array} Created chunks
   */
  async bulkCreateChunks(chunksData) {
    if (!Array.isArray(chunksData) || chunksData.length === 0) {
      return [];
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const createdChunks = [];
      for (const chunkData of chunksData) {
        const chunk = await this.createChunk(chunkData);
        createdChunks.push(chunk);
      }

      await client.query('COMMIT');
      logger.info(`Bulk created ${createdChunks.length} chunks`);

      return createdChunks;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Error bulk creating chunks: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get chunk statistics
   * @returns {Object} Chunk statistics
   */
  async getStatistics() {
    const queries = {
      total: 'SELECT COUNT(*) as count FROM document_chunks',
      byChunkType: `
        SELECT chunk_type, COUNT(*) as count
        FROM document_chunks
        GROUP BY chunk_type
        ORDER BY count DESC
      `,
      avgContentLength: `
        SELECT AVG(LENGTH(content)) as avg_length
        FROM document_chunks
      `,
      recentActivity: `
        SELECT DATE_TRUNC('day', created_at) as date,
               COUNT(*) as count
        FROM document_chunks
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY date
        ORDER BY date
      `
    };

    try {
      const results = await Promise.all(
        Object.values(queries).map(query => this.pool.query(query))
      );

      return {
        total: parseInt(results[0].rows[0].count),
        byChunkType: results[1].rows,
        averageContentLength: Math.round(results[2].rows[0].avg_length || 0),
        recentActivity: results[3].rows
      };
    } catch (error) {
      logger.error(`Error getting chunk statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find related chunks across different types
   * @param {string} baseChunkId - Base chunk ID
   * @param {Object} options - Search options
   * @returns {Array} Related chunks
   */
  async findRelatedChunks(baseChunkId, options = {}) {
    const { limit = 5, threshold = 0.8 } = options;

    // Get the base chunk's embedding
    const baseQuery = 'SELECT embedding FROM document_chunks WHERE id = $1';

    try {
      const baseResult = await this.pool.query(baseQuery, [baseChunkId]);
      if (baseResult.rows.length === 0) {
        return [];
      }

      const baseEmbedding = baseResult.rows[0].embedding;

      // Find similar chunks
      const similarQuery = `
        SELECT
          id,
          document_id,
          past_performance_id,
          chunk_type,
          section_title,
          1 - (embedding <=> $1) as similarity_score
        FROM document_chunks
        WHERE id != $2
          AND 1 - (embedding <=> $1) >= $3
        ORDER BY embedding <=> $1
        LIMIT $4
      `;

      const result = await this.pool.query(similarQuery, [
        baseEmbedding,
        baseChunkId,
        threshold,
        limit
      ]);

      return result.rows.map(row => ({
        id: row.id,
        documentId: row.document_id,
        pastPerformanceId: row.past_performance_id,
        chunkType: row.chunk_type,
        sectionTitle: row.section_title,
        similarityScore: parseFloat(row.similarity_score)
      }));
    } catch (error) {
      logger.error(`Error finding related chunks: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format chunk for API response
   * @private
   */
  formatChunk(row) {
    return {
      id: row.id,
      documentId: row.document_id,
      pastPerformanceId: row.past_performance_id,
      chunkType: row.chunk_type,
      chunkIndex: row.chunk_index,
      content: row.content,
      sectionTitle: row.section_title,
      pageNumber: row.page_number,
      metadata: row.metadata || {},
      createdAt: row.created_at
    };
  }
}

module.exports = DocumentChunkService;