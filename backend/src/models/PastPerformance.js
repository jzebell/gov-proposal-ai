/**
 * Past Performance Model
 * Handles CRUD operations and business logic for past performance records
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

class PastPerformance {
  constructor(pool) {
    this.pool = pool || new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  /**
   * Create a new past performance record
   * @param {Object} ppData - Past performance data
   * @returns {Object} Created past performance record
   */
  async create(ppData) {
    const {
      projectName,
      customer,
      customerType = 'Federal',
      contractNumber,
      contractValue,
      contractType = 'Prime',
      startDate,
      endDate,
      workType = 'Mixed',
      dmePercentage = 50,
      omPercentage = 50,
      summary,
      technicalApproach,
      technologiesUsed = [],
      domainAreas = [],
      keyPersonnel = [],
      performanceMetrics = {},
      lessonsLearned,
      challengesOvercome,
      relevanceTags = [],
      confidenceScore = 0.0
    } = ppData;

    // Validate required fields
    if (!projectName || !customer || !summary) {
      throw new Error('Project name, customer, and summary are required');
    }

    // Validate percentage totals
    if (dmePercentage + omPercentage !== 100) {
      throw new Error('DME and O&M percentages must total 100');
    }

    const query = `
      INSERT INTO past_performance (
        project_name, customer, customer_type, contract_number, contract_value,
        contract_type, start_date, end_date, work_type, dme_percentage, om_percentage,
        summary, technical_approach, technologies_used, domain_areas, key_personnel,
        performance_metrics, lessons_learned, challenges_overcome, relevance_tags,
        confidence_score
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `;

    const values = [
      projectName, customer, customerType, contractNumber, contractValue,
      contractType, startDate, endDate, workType, dmePercentage, omPercentage,
      summary, technicalApproach, JSON.stringify(technologiesUsed),
      JSON.stringify(domainAreas), JSON.stringify(keyPersonnel),
      JSON.stringify(performanceMetrics), lessonsLearned, challengesOvercome,
      JSON.stringify(relevanceTags), confidenceScore
    ];

    try {
      const result = await this.pool.query(query, values);
      logger.info(`Created past performance record: ${projectName}`);
      return this.formatPastPerformance(result.rows[0]);
    } catch (error) {
      logger.error(`Error creating past performance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get past performance by ID
   * @param {string} id - Past performance ID
   * @returns {Object|null} Past performance record
   */
  async getById(id) {
    const query = 'SELECT * FROM past_performance WHERE id = $1';

    try {
      const result = await this.pool.query(query, [id]);
      return result.rows.length > 0 ? this.formatPastPerformance(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Error getting past performance by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all past performance records with optional filtering
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Object} Past performance records with metadata
   */
  async getAll(filters = {}, pagination = {}) {
    const { limit = 50, offset = 0 } = pagination;
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (filters.customer) {
      conditions.push(`customer ILIKE $${paramIndex}`);
      values.push(`%${filters.customer}%`);
      paramIndex++;
    }

    if (filters.customerType) {
      conditions.push(`customer_type = $${paramIndex}`);
      values.push(filters.customerType);
      paramIndex++;
    }

    if (filters.contractType) {
      conditions.push(`contract_type = $${paramIndex}`);
      values.push(filters.contractType);
      paramIndex++;
    }

    if (filters.workType) {
      conditions.push(`work_type = $${paramIndex}`);
      values.push(filters.workType);
      paramIndex++;
    }

    if (filters.minValue) {
      conditions.push(`contract_value >= $${paramIndex}`);
      values.push(filters.minValue);
      paramIndex++;
    }

    if (filters.maxValue) {
      conditions.push(`contract_value <= $${paramIndex}`);
      values.push(filters.maxValue);
      paramIndex++;
    }

    if (filters.technologies && filters.technologies.length > 0) {
      conditions.push(`technologies_used ?| array[$${paramIndex}]`);
      values.push(filters.technologies);
      paramIndex++;
    }

    if (filters.domains && filters.domains.length > 0) {
      conditions.push(`domain_areas ?| array[$${paramIndex}]`);
      values.push(filters.domains);
      paramIndex++;
    }

    if (filters.startDateAfter) {
      conditions.push(`start_date >= $${paramIndex}`);
      values.push(filters.startDateAfter);
      paramIndex++;
    }

    if (filters.endDateBefore) {
      conditions.push(`end_date <= $${paramIndex}`);
      values.push(filters.endDateBefore);
      paramIndex++;
    }

    // Search in text fields
    if (filters.search) {
      conditions.push(`(
        project_name ILIKE $${paramIndex} OR
        summary ILIKE $${paramIndex} OR
        technical_approach ILIKE $${paramIndex}
      )`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build queries
    const countQuery = `SELECT COUNT(*) FROM past_performance ${whereClause}`;
    const dataQuery = `
      SELECT * FROM past_performance
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    try {
      const [countResult, dataResult] = await Promise.all([
        this.pool.query(countQuery, values.slice(0, -2)),
        this.pool.query(dataQuery, values)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const records = dataResult.rows.map(row => this.formatPastPerformance(row));

      return {
        records,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit),
          currentPage: Math.floor(offset / limit) + 1
        }
      };
    } catch (error) {
      logger.error(`Error getting past performance records: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update past performance record
   * @param {string} id - Past performance ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated past performance record
   */
  async update(id, updates) {
    const allowedFields = [
      'project_name', 'customer', 'customer_type', 'contract_number',
      'contract_value', 'contract_type', 'start_date', 'end_date',
      'work_type', 'dme_percentage', 'om_percentage', 'summary',
      'technical_approach', 'technologies_used', 'domain_areas',
      'key_personnel', 'performance_metrics', 'lessons_learned',
      'challenges_overcome', 'relevance_tags', 'confidence_score'
    ];

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(field => {
      const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = $${paramIndex}`);

        // Handle JSON fields
        if (['technologies_used', 'domain_areas', 'key_personnel', 'performance_metrics', 'relevance_tags'].includes(dbField)) {
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

    // Validate percentage totals if both are being updated
    if (updates.dmePercentage !== undefined && updates.omPercentage !== undefined) {
      if (updates.dmePercentage + updates.omPercentage !== 100) {
        throw new Error('DME and O&M percentages must total 100');
      }
    }

    updateFields.push('updated_at = NOW()');
    values.push(id);

    const query = `
      UPDATE past_performance
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Updated past performance record: ${id}`);
      return this.formatPastPerformance(result.rows[0]);
    } catch (error) {
      logger.error(`Error updating past performance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete past performance record
   * @param {string} id - Past performance ID
   * @returns {boolean} Success status
   */
  async delete(id) {
    const query = 'DELETE FROM past_performance WHERE id = $1 RETURNING id';

    try {
      const result = await this.pool.query(query, [id]);
      const deleted = result.rows.length > 0;

      if (deleted) {
        logger.info(`Deleted past performance record: ${id}`);
      }

      return deleted;
    } catch (error) {
      logger.error(`Error deleting past performance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search past performance using semantic similarity
   * @param {Array} queryEmbedding - Query embedding vector
   * @param {Object} filters - Additional filters
   * @param {number} limit - Number of results to return
   * @returns {Array} Relevant past performance records with similarity scores
   */
  async semanticSearch(queryEmbedding, filters = {}, limit = 10) {
    // This would integrate with the vector search system
    // For now, return text-based search as placeholder
    const searchTerm = filters.searchTerm || '';

    const results = await this.getAll({
      search: searchTerm,
      ...filters
    }, { limit, offset: 0 });

    // Add mock similarity scores
    const recordsWithScores = results.records.map(record => ({
      ...record,
      similarityScore: 0.7 + (Math.random() * 0.3), // Mock score 0.7-1.0
      relevanceReason: 'Text-based match (vector search not yet implemented)'
    }));

    return recordsWithScores.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  async getStatistics() {
    const queries = {
      total: 'SELECT COUNT(*) as count FROM past_performance',
      byCustomerType: `
        SELECT customer_type, COUNT(*) as count
        FROM past_performance
        GROUP BY customer_type
        ORDER BY count DESC
      `,
      byWorkType: `
        SELECT work_type, COUNT(*) as count
        FROM past_performance
        GROUP BY work_type
        ORDER BY count DESC
      `,
      byContractType: `
        SELECT contract_type, COUNT(*) as count
        FROM past_performance
        GROUP BY contract_type
        ORDER BY count DESC
      `,
      averageValue: `
        SELECT AVG(contract_value) as avg_value,
               MIN(contract_value) as min_value,
               MAX(contract_value) as max_value
        FROM past_performance
        WHERE contract_value > 0
      `,
      recentActivity: `
        SELECT DATE_TRUNC('month', created_at) as month,
               COUNT(*) as count
        FROM past_performance
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month
      `
    };

    try {
      const results = await Promise.all(
        Object.values(queries).map(query => this.pool.query(query))
      );

      return {
        total: parseInt(results[0].rows[0].count),
        byCustomerType: results[1].rows,
        byWorkType: results[2].rows,
        byContractType: results[3].rows,
        contractValues: results[4].rows[0],
        recentActivity: results[5].rows
      };
    } catch (error) {
      logger.error(`Error getting statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format past performance record for API response
   * @param {Object} row - Database row
   * @returns {Object} Formatted past performance record
   */
  formatPastPerformance(row) {
    return {
      id: row.id,
      projectName: row.project_name,
      customer: row.customer,
      customerType: row.customer_type,
      contractNumber: row.contract_number,
      contractValue: row.contract_value,
      contractType: row.contract_type,
      startDate: row.start_date,
      endDate: row.end_date,
      workType: row.work_type,
      dmePercentage: row.dme_percentage,
      omPercentage: row.om_percentage,
      summary: row.summary,
      technicalApproach: row.technical_approach,
      technologiesUsed: row.technologies_used || [],
      domainAreas: row.domain_areas || [],
      keyPersonnel: row.key_personnel || [],
      performanceMetrics: row.performance_metrics || {},
      lessonsLearned: row.lessons_learned,
      challengesOvercome: row.challenges_overcome,
      relevanceTags: row.relevance_tags || [],
      confidenceScore: row.confidence_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = PastPerformance;