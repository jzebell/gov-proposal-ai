/**
 * Document Model
 * Handles CRUD operations and business logic for document records
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

class Document {
  constructor(pool) {
    this.pool = pool || new Pool({
      connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    });
  }

  /**
   * Create a new document record
   * @param {Object} docData - Document data
   * @returns {Object} Created document record
   */
  async create(docData) {
    const {
      filename,
      originalName,
      path,
      relativePath,
      category,
      subfolder,
      projectName,
      size,
      mimeType,
      extension,
      tags = [],
      description = '',
      uploadedBy = 'user',
      metadata = {},
      status = 'active'
    } = docData;

    // Validate required fields
    if (!filename || !originalName || !path || !category) {
      throw new Error('Filename, original name, path, and category are required');
    }

    const query = `
      INSERT INTO documents (
        filename, original_name, file_path, relative_path, category, subfolder,
        project_name, size, mime_type, extension, status, tags, description, uploaded_by, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING *
    `;

    const values = [
      filename, originalName, path, relativePath, category, subfolder,
      projectName, size, mimeType, extension, status, JSON.stringify(tags),
      description, uploadedBy, JSON.stringify(metadata)
    ];

    try {
      const result = await this.pool.query(query, values);
      logger.info(`Created document record: ${filename}`);
      return this.formatDocument(result.rows[0]);
    } catch (error) {
      logger.error(`Error creating document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get document by ID
   * @param {string} id - Document ID
   * @returns {Object|null} Document record
   */
  async getById(id) {
    const query = 'SELECT * FROM documents WHERE id = $1';

    try {
      const result = await this.pool.query(query, [id]);
      return result.rows.length > 0 ? this.formatDocument(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Error getting document by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * List documents with filtering
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Object} Documents with metadata
   */
  async list(filters = {}, pagination = {}) {
    const { limit = 50, offset = 0 } = pagination;
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (filters.category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(filters.category);
      paramIndex++;
    }

    if (filters.subfolder) {
      conditions.push(`subfolder = $${paramIndex}`);
      values.push(filters.subfolder);
      paramIndex++;
    }

    if (filters.projectName) {
      conditions.push(`project_name = $${paramIndex}`);
      values.push(filters.projectName);
      paramIndex++;
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        const statusPlaceholders = filters.status.map(() => `$${paramIndex++}`).join(',');
        conditions.push(`status IN (${statusPlaceholders})`);
        values.push(...filters.status);
      } else {
        conditions.push(`status = $${paramIndex}`);
        values.push(filters.status);
        paramIndex++;
      }
    } else {
      // Default to showing only active documents
      conditions.push(`status = $${paramIndex}`);
      values.push('active');
      paramIndex++;
    }

    if (filters.searchTerm) {
      conditions.push(`(
        original_name ILIKE $${paramIndex} OR
        description ILIKE $${paramIndex} OR
        project_name ILIKE $${paramIndex}
      )`);
      values.push(`%${filters.searchTerm}%`);
      paramIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      // Simple JSONB contains check instead of ?| operator
      conditions.push(`tags::text ILIKE $${paramIndex}`);
      values.push(`%${filters.tags[0]}%`); // Check for first tag for now
      paramIndex++;
    }

    if (filters.dateFrom) {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      conditions.push(`created_at <= $${paramIndex}`);
      values.push(filters.dateTo);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build queries
    const countQuery = `SELECT COUNT(*) FROM documents ${whereClause}`;
    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['created_at', 'updated_at', 'original_name', 'size', 'filename'];
    const sortBy = allowedSortFields.includes(filters.sortBy) ? filters.sortBy : 'created_at';
    const sortOrder = (filters.sortOrder && filters.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    const dataQuery = `
      SELECT * FROM documents
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    try {
      const [countResult, dataResult] = await Promise.all([
        this.pool.query(countQuery, values.slice(0, -2)),
        this.pool.query(dataQuery, values)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const documents = dataResult.rows.map(row => this.formatDocument(row));

      return {
        documents,
        total,
        offset,
        limit,
        hasMore: offset + limit < total
      };
    } catch (error) {
      logger.error(`Error listing documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update document record
   * @param {string} id - Document ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated document record
   */
  async update(id, updates) {
    const allowedFields = [
      'original_name', 'description', 'tags', 'project_name', 'subfolder', 'metadata'
    ];

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(field => {
      const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = $${paramIndex}`);

        // Handle JSON fields
        if (['tags', 'metadata'].includes(dbField)) {
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

    updateFields.push('updated_at = NOW()');
    values.push(id);

    const query = `
      UPDATE documents
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Updated document record: ${id}`);
      return this.formatDocument(result.rows[0]);
    } catch (error) {
      logger.error(`Error updating document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Archive document (soft delete)
   * @param {string} id - Document ID
   * @param {string} archivedBy - User who archived the document
   * @returns {Object|null} Updated document record
   */
  async archive(id, archivedBy) {
    const query = `
      UPDATE documents
      SET status = 'archived', archived_at = NOW(), archived_by = $2, updated_at = NOW()
      WHERE id = $1 AND status = 'active'
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [id, archivedBy]);
      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Archived document: ${id} by ${archivedBy}`);
      return this.formatDocument(result.rows[0]);
    } catch (error) {
      logger.error(`Error archiving document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unarchive document
   * @param {string} id - Document ID
   * @param {string} unarchivedBy - User who unarchived the document
   * @returns {Object|null} Updated document record
   */
  async unarchive(id, unarchivedBy) {
    const query = `
      UPDATE documents
      SET status = 'active', archived_at = NULL, archived_by = NULL, updated_at = NOW()
      WHERE id = $1 AND status = 'archived'
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Unarchived document: ${id} by ${unarchivedBy}`);
      return this.formatDocument(result.rows[0]);
    } catch (error) {
      logger.error(`Error unarchiving document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Soft delete document
   * @param {string} id - Document ID
   * @param {string} deletedBy - User who deleted the document
   * @returns {Object|null} Updated document record
   */
  async softDelete(id, deletedBy) {
    const query = `
      UPDATE documents
      SET status = 'deleted', deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
      WHERE id = $1 AND status IN ('active', 'archived')
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [id, deletedBy]);
      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Soft deleted document: ${id} by ${deletedBy}`);
      return this.formatDocument(result.rows[0]);
    } catch (error) {
      logger.error(`Error soft deleting document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Permanently delete document record and file
   * @param {string} id - Document ID
   * @returns {boolean} Success status
   */
  async permanentDelete(id) {
    const query = 'DELETE FROM documents WHERE id = $1 RETURNING *';

    try {
      const result = await this.pool.query(query, [id]);
      const deleted = result.rows.length > 0;

      if (deleted) {
        const doc = result.rows[0];
        // TODO: Also delete the physical file from disk
        // const fs = require('fs').promises;
        // await fs.unlink(doc.file_path);
        logger.info(`Permanently deleted document record: ${id}`);
      }

      return deleted;
    } catch (error) {
      logger.error(`Error permanently deleting document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get documents by project
   * @param {string} projectName - Project name
   * @param {string} category - Document category
   * @returns {Array} Document records for the project
   */
  async getByProject(projectName, category) {
    const result = await this.list({
      projectName,
      category
    }, { limit: 1000 });

    return result.documents;
  }

  /**
   * Format document record for API response
   * @param {Object} row - Database row
   * @returns {Object} Formatted document record
   */
  formatDocument(row) {
    return {
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      path: row.file_path,
      relativePath: row.relative_path,
      category: row.category,
      subfolder: row.subfolder,
      projectName: row.project_name,
      size: row.size,
      mimeType: row.mime_type,
      extension: row.extension,
      status: row.status,
      tags: row.tags || [],
      description: row.description,
      uploadedBy: row.uploaded_by,
      metadata: row.metadata || {},
      downloadCount: row.download_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
      archivedBy: row.archived_by,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by
    };
  }
}

module.exports = Document;