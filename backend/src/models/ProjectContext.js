/**
 * Project Context Model
 * Manages document context caching for AI writing operations
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

class ProjectContext {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER || 'govaiuser'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'govai'}`
    });
  }

  /**
   * Get cached context for a project
   */
  async getContext(projectName, documentType) {
    try {
      const query = `
        SELECT * FROM project_contexts
        WHERE project_name = $1 AND document_type = $2 AND status = 'complete'
        ORDER BY updated_at DESC LIMIT 1
      `;

      const result = await this.pool.query(query, [projectName, documentType]);

      if (result.rows.length === 0) {
        return null;
      }

      const context = result.rows[0];
      logger.info(`Retrieved cached context for ${projectName}/${documentType}: ${context.token_count} tokens`);

      return {
        id: context.id,
        contextData: context.context_data,
        tokenCount: context.token_count,
        characterCount: context.character_count,
        wordCount: context.word_count,
        documentCount: context.document_count,
        buildTimestamp: context.build_timestamp,
        checksum: context.checksum
      };
    } catch (error) {
      logger.error(`Error retrieving context for ${projectName}/${documentType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save context to cache
   */
  async saveContext(projectName, documentType, contextData, metadata) {
    try {
      const {
        tokenCount = 0,
        characterCount = 0,
        wordCount = 0,
        documentCount = 0,
        checksum = null
      } = metadata;

      const query = `
        INSERT INTO project_contexts (
          project_name, document_type, context_data, token_count,
          character_count, word_count, document_count, status, checksum
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'complete', $8)
        ON CONFLICT (project_name, document_type)
        DO UPDATE SET
          context_data = EXCLUDED.context_data,
          token_count = EXCLUDED.token_count,
          character_count = EXCLUDED.character_count,
          word_count = EXCLUDED.word_count,
          document_count = EXCLUDED.document_count,
          status = 'complete',
          checksum = EXCLUDED.checksum,
          build_timestamp = NOW(),
          error_message = NULL
        RETURNING id, build_timestamp
      `;

      // Safe JSON serialization with Unicode handling
      const safeContextData = this.sanitizeForJson(contextData);

      const result = await this.pool.query(query, [
        projectName, documentType, JSON.stringify(safeContextData),
        tokenCount, characterCount, wordCount, documentCount, checksum
      ]);

      logger.info(`Saved context cache for ${projectName}/${documentType}: ${tokenCount} tokens, ${documentCount} documents`);

      return {
        id: result.rows[0].id,
        buildTimestamp: result.rows[0].build_timestamp
      };
    } catch (error) {
      logger.error(`Error saving context for ${projectName}/${documentType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark context as building (in progress)
   */
  async markBuilding(projectName, documentType) {
    try {
      const query = `
        INSERT INTO project_contexts (project_name, document_type, context_data, status)
        VALUES ($1, $2, '{}', 'building')
        ON CONFLICT (project_name, document_type)
        DO UPDATE SET
          status = 'building',
          build_timestamp = NOW(),
          error_message = NULL
        RETURNING id
      `;

      const result = await this.pool.query(query, [projectName, documentType]);
      logger.info(`Marked context as building for ${projectName}/${documentType}`);

      return result.rows[0].id;
    } catch (error) {
      logger.error(`Error marking context as building: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark context as failed with error message
   */
  async markFailed(projectName, documentType, errorMessage) {
    try {
      const query = `
        UPDATE project_contexts
        SET status = 'failed', error_message = $3, build_timestamp = NOW()
        WHERE project_name = $1 AND document_type = $2
      `;

      await this.pool.query(query, [projectName, documentType, errorMessage]);
      logger.error(`Context build failed for ${projectName}/${documentType}: ${errorMessage}`);
    } catch (error) {
      logger.error(`Error marking context as failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if context needs rebuilding based on document changes
   */
  async needsRebuild(projectName, documentType, currentChecksum) {
    try {
      const context = await this.getContext(projectName, documentType);

      if (!context) {
        return true; // No context exists
      }

      if (context.checksum !== currentChecksum) {
        logger.info(`Context needs rebuild - checksum changed: ${context.checksum} -> ${currentChecksum}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error checking if context needs rebuild: ${error.message}`);
      return true; // Err on side of caution
    }
  }

  /**
   * Get context build status
   */
  async getBuildStatus(projectName, documentType) {
    try {
      const query = `
        SELECT status, error_message, build_timestamp
        FROM project_contexts
        WHERE project_name = $1 AND document_type = $2
        ORDER BY updated_at DESC LIMIT 1
      `;

      const result = await this.pool.query(query, [projectName, documentType]);

      if (result.rows.length === 0) {
        return { status: 'none', errorMessage: null, buildTimestamp: null };
      }

      const row = result.rows[0];
      return {
        status: row.status,
        errorMessage: row.error_message,
        buildTimestamp: row.build_timestamp
      };
    } catch (error) {
      logger.error(`Error getting build status: ${error.message}`);
      return { status: 'error', errorMessage: error.message, buildTimestamp: null };
    }
  }

  /**
   * Clean up old/failed contexts
   */
  async cleanup(olderThanHours = 24) {
    try {
      const query = `
        DELETE FROM project_contexts
        WHERE status IN ('failed', 'building')
        AND build_timestamp < NOW() - INTERVAL '${olderThanHours} hours'
      `;

      const result = await this.pool.query(query);

      if (result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} old/failed context entries`);
      }
    } catch (error) {
      logger.error(`Error during context cleanup: ${error.message}`);
    }
  }

  /**
   * Sanitize data for safe JSON serialization
   */
  sanitizeForJson(data) {
    if (typeof data === 'string') {
      // Remove problematic Unicode characters and normalize
      return data
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\\/g, '\\\\') // Escape backslashes
        .replace(/"/g, '\\"')   // Escape quotes
        .normalize('NFC');      // Normalize Unicode
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForJson(item));
    }

    if (data && typeof data === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeForJson(value);
      }
      return sanitized;
    }

    return data;
  }
}

module.exports = ProjectContext;