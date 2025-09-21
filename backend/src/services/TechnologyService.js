/**
 * Technology Service
 * Manages technology taxonomy and extraction
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

class TechnologyService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  /**
   * Get all technologies with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Array} Technology records
   */
  async getAllTechnologies(filters = {}) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (filters.categoryId) {
      conditions.push(`t.category_id = $${paramIndex}`);
      values.push(filters.categoryId);
      paramIndex++;
    }

    if (filters.technologyType) {
      conditions.push(`t.technology_type = $${paramIndex}`);
      values.push(filters.technologyType);
      paramIndex++;
    }

    if (filters.vendor) {
      conditions.push(`t.vendor ILIKE $${paramIndex}`);
      values.push(`%${filters.vendor}%`);
      paramIndex++;
    }

    if (filters.isActive !== undefined) {
      conditions.push(`t.is_active = $${paramIndex}`);
      values.push(filters.isActive);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(
        t.technology_name ILIKE $${paramIndex} OR
        t.aliases::text ILIKE $${paramIndex}
      )`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        t.*,
        tc.category_name
      FROM technologies t
      LEFT JOIN technology_categories tc ON t.category_id = tc.id
      ${whereClause}
      ORDER BY t.usage_count DESC, t.technology_name
    `;

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => this.formatTechnology(row));
    } catch (error) {
      logger.error(`Error getting technologies: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get technology by ID
   * @param {number} id - Technology ID
   * @returns {Object|null} Technology record
   */
  async getTechnologyById(id) {
    const query = `
      SELECT
        t.*,
        tc.category_name
      FROM technologies t
      LEFT JOIN technology_categories tc ON t.category_id = tc.id
      WHERE t.id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      return result.rows.length > 0 ? this.formatTechnology(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Error getting technology by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new technology
   * @param {Object} techData - Technology data
   * @returns {Object} Created technology
   */
  async createTechnology(techData) {
    const {
      technologyName,
      categoryId,
      aliases = [],
      vendor,
      technologyType,
      isActive = true
    } = techData;

    if (!technologyName?.trim()) {
      throw new Error('Technology name is required');
    }

    const query = `
      INSERT INTO technologies (
        technology_name, category_id, aliases, vendor, technology_type, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      technologyName.trim(),
      categoryId,
      JSON.stringify(aliases),
      vendor,
      technologyType,
      isActive
    ];

    try {
      const result = await this.pool.query(query, values);
      logger.info(`Created technology: ${technologyName}`);
      return this.formatTechnology(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error(`Technology '${technologyName}' already exists`);
      }
      logger.error(`Error creating technology: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update technology
   * @param {number} id - Technology ID
   * @param {Object} updates - Updates to apply
   * @returns {Object|null} Updated technology
   */
  async updateTechnology(id, updates) {
    const allowedFields = [
      'technology_name', 'category_id', 'aliases', 'vendor',
      'technology_type', 'is_active'
    ];

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(field => {
      const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = $${paramIndex}`);

        if (dbField === 'aliases') {
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
      UPDATE technologies
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Updated technology: ${id}`);
      return this.formatTechnology(result.rows[0]);
    } catch (error) {
      logger.error(`Error updating technology: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete technology
   * @param {number} id - Technology ID
   * @returns {boolean} Success status
   */
  async deleteTechnology(id) {
    const query = 'DELETE FROM technologies WHERE id = $1 RETURNING id';

    try {
      const result = await this.pool.query(query, [id]);
      const deleted = result.rows.length > 0;

      if (deleted) {
        logger.info(`Deleted technology: ${id}`);
      }

      return deleted;
    } catch (error) {
      logger.error(`Error deleting technology: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all technology categories
   * @returns {Array} Technology categories
   */
  async getAllCategories() {
    const query = `
      SELECT
        tc.*,
        COUNT(t.id) as technology_count
      FROM technology_categories tc
      LEFT JOIN technologies t ON tc.id = t.category_id AND t.is_active = true
      WHERE tc.is_active = true
      GROUP BY tc.id
      ORDER BY tc.category_name
    `;

    try {
      const result = await this.pool.query(query);
      return result.rows.map(row => ({
        id: row.id,
        categoryName: row.category_name,
        parentCategoryId: row.parent_category_id,
        description: row.description,
        isActive: row.is_active,
        technologyCount: parseInt(row.technology_count),
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error(`Error getting technology categories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create technology category
   * @param {Object} categoryData - Category data
   * @returns {Object} Created category
   */
  async createCategory(categoryData) {
    const {
      categoryName,
      parentCategoryId,
      description,
      createdBy = 'system'
    } = categoryData;

    if (!categoryName?.trim()) {
      throw new Error('Category name is required');
    }

    const query = `
      INSERT INTO technology_categories (
        category_name, parent_category_id, description, created_by
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      categoryName.trim(),
      parentCategoryId,
      description,
      createdBy
    ];

    try {
      const result = await this.pool.query(query, values);
      logger.info(`Created technology category: ${categoryName}`);
      return {
        id: result.rows[0].id,
        categoryName: result.rows[0].category_name,
        parentCategoryId: result.rows[0].parent_category_id,
        description: result.rows[0].description,
        isActive: result.rows[0].is_active,
        createdBy: result.rows[0].created_by,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      };
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error(`Category '${categoryName}' already exists`);
      }
      logger.error(`Error creating technology category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract technologies from text content
   * @param {string} textContent - Text to analyze
   * @returns {Array} Extracted technologies with confidence scores
   */
  async extractTechnologies(textContent) {
    if (!textContent?.trim()) {
      return [];
    }

    try {
      // Get all active technologies
      const technologies = await this.getAllTechnologies({ isActive: true });
      const extractedTechnologies = [];

      const normalizedText = textContent.toLowerCase();

      technologies.forEach(tech => {
        const techName = tech.technologyName.toLowerCase();
        const aliases = tech.aliases || [];

        // Check main name and aliases
        const searchTerms = [techName, ...aliases.map(alias => alias.toLowerCase())];
        let found = false;
        let matchedTerm = '';

        for (const term of searchTerms) {
          // Use word boundaries to avoid partial matches
          const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (regex.test(normalizedText)) {
            found = true;
            matchedTerm = term;
            break;
          }
        }

        if (found) {
          // Calculate confidence based on match type and frequency
          let confidence = 0.8; // Base confidence for exact match

          // Boost confidence for exact technology name match
          if (matchedTerm === techName) {
            confidence += 0.1;
          }

          // Count occurrences to boost confidence
          const occurrences = (normalizedText.match(new RegExp(matchedTerm, 'g')) || []).length;
          confidence += Math.min(occurrences * 0.05, 0.1);

          // Cap confidence at 1.0
          confidence = Math.min(confidence, 1.0);

          extractedTechnologies.push({
            id: tech.id,
            technologyName: tech.technologyName,
            categoryName: tech.categoryName,
            technologyType: tech.technologyType,
            vendor: tech.vendor,
            confidence,
            matchedTerm,
            occurrences
          });

          // Update usage count
          this.incrementUsageCount(tech.id).catch(err => {
            logger.warn(`Could not increment usage count for ${tech.technologyName}: ${err.message}`);
          });
        }
      });

      // Sort by confidence and remove duplicates
      const uniqueTechnologies = this.removeDuplicateTechnologies(extractedTechnologies);
      uniqueTechnologies.sort((a, b) => b.confidence - a.confidence);

      logger.debug(`Extracted ${uniqueTechnologies.length} technologies from text`);
      return uniqueTechnologies;
    } catch (error) {
      logger.error(`Error extracting technologies: ${error.message}`);
      return [];
    }
  }

  /**
   * Get technology usage statistics
   * @returns {Object} Usage statistics
   */
  async getUsageStatistics() {
    const queries = {
      mostUsed: `
        SELECT technology_name, usage_count, category_id
        FROM technologies
        WHERE usage_count > 0
        ORDER BY usage_count DESC
        LIMIT 10
      `,
      byCategory: `
        SELECT
          tc.category_name,
          COUNT(t.id) as technology_count,
          SUM(t.usage_count) as total_usage
        FROM technology_categories tc
        LEFT JOIN technologies t ON tc.id = t.category_id
        GROUP BY tc.id, tc.category_name
        ORDER BY total_usage DESC
      `,
      byType: `
        SELECT
          technology_type,
          COUNT(*) as count,
          SUM(usage_count) as total_usage
        FROM technologies
        WHERE technology_type IS NOT NULL
        GROUP BY technology_type
        ORDER BY total_usage DESC
      `,
      recentlyAdded: `
        SELECT technology_name, created_at
        FROM technologies
        WHERE created_at >= NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
        LIMIT 10
      `
    };

    try {
      const results = await Promise.all(
        Object.values(queries).map(query => this.pool.query(query))
      );

      return {
        mostUsed: results[0].rows,
        byCategory: results[1].rows,
        byType: results[2].rows,
        recentlyAdded: results[3].rows
      };
    } catch (error) {
      logger.error(`Error getting usage statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk update technology usage counts
   * @param {Array} technologyUsage - Array of {id, count} objects
   * @returns {boolean} Success status
   */
  async bulkUpdateUsageCount(technologyUsage) {
    if (!Array.isArray(technologyUsage) || technologyUsage.length === 0) {
      return true;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const { id, count } of technologyUsage) {
        await client.query(
          'UPDATE technologies SET usage_count = usage_count + $1 WHERE id = $2',
          [count, id]
        );
      }

      await client.query('COMMIT');
      logger.debug(`Bulk updated usage counts for ${technologyUsage.length} technologies`);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Error bulk updating usage counts: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Increment usage count for a technology
   * @private
   */
  async incrementUsageCount(technologyId) {
    const query = 'UPDATE technologies SET usage_count = usage_count + 1 WHERE id = $1';

    try {
      await this.pool.query(query, [technologyId]);
    } catch (error) {
      // Don't throw error for usage count updates
      logger.warn(`Could not increment usage count for technology ${technologyId}: ${error.message}`);
    }
  }

  /**
   * Remove duplicate technologies from extraction results
   * @private
   */
  removeDuplicateTechnologies(technologies) {
    const seen = new Set();
    return technologies.filter(tech => {
      if (seen.has(tech.id)) {
        return false;
      }
      seen.add(tech.id);
      return true;
    });
  }

  /**
   * Format technology for API response
   * @private
   */
  formatTechnology(row) {
    return {
      id: row.id,
      technologyName: row.technology_name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      aliases: row.aliases || [],
      vendor: row.vendor,
      technologyType: row.technology_type,
      isActive: row.is_active,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = TechnologyService;