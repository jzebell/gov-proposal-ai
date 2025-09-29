const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

/**
 * Technology Model
 * Manages the self-growing technology taxonomy and PP technology associations
 */
class Technology {
    /**
     * Create a new technology (pending approval if not auto-approved)
     * @param {Object} techData - Technology data
     * @returns {Object} Created technology record
     */
    static async create(techData) {
        const {
            name,
            category,
            description,
            aliases = [],
            approved = false,
            confidenceThreshold = 0.7
        } = techData;

        // Validate required fields
        if (!name || !category) {
            throw new Error('Name and category are required fields');
        }

        // Validate category
        const validCategories = ['platform', 'language', 'framework', 'tool', 'database', 'cloud', 'methodology'];
        if (!validCategories.includes(category)) {
            throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
        }

        // Check for existing technology with same name
        const existingQuery = 'SELECT id FROM technologies WHERE LOWER(name) = LOWER($1)';
        const existingResult = await pool.query(existingQuery, [name]);

        if (existingResult.rows.length > 0) {
            throw new Error(`Technology '${name}' already exists`);
        }

        const query = `
            INSERT INTO technologies (
                name, category, description, aliases, approved,
                confidence_threshold, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING *
        `;

        const values = [
            name.trim(),
            category,
            description,
            aliases,
            approved,
            confidenceThreshold
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error creating technology:', error);
            throw new Error(`Failed to create technology: ${error.message}`);
        }
    }

    /**
     * Get technology by ID
     * @param {number} id - Technology ID
     * @returns {Object|null} Technology record
     */
    static async findById(id) {
        const query = `
            SELECT t.*, u.username as approved_by_username
            FROM technologies t
            LEFT JOIN users u ON t.approved_by = u.id
            WHERE t.id = $1
        `;

        try {
            const result = await pool.query(query, [id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Error finding technology by ID:', error);
            throw new Error(`Failed to find technology: ${error.message}`);
        }
    }

    /**
     * Get technology by name (case-insensitive)
     * @param {string} name - Technology name
     * @returns {Object|null} Technology record
     */
    static async findByName(name) {
        const query = `
            SELECT * FROM technologies
            WHERE LOWER(name) = LOWER($1) OR $1 = ANY(SELECT LOWER(unnest(aliases)))
        `;

        try {
            const result = await pool.query(query, [name.trim()]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Error finding technology by name:', error);
            throw new Error(`Failed to find technology: ${error.message}`);
        }
    }

    /**
     * Get all technologies with optional filtering
     * @param {Object} filters - Filter criteria
     * @returns {Array} Technology records
     */
    static async findAll(filters = {}) {
        const {
            category,
            approved,
            includeUnApproved = false
        } = filters;

        let whereConditions = [];
        let queryParams = [];
        let paramCounter = 1;

        // Filter by category
        if (category) {
            whereConditions.push(`category = $${paramCounter}`);
            queryParams.push(category);
            paramCounter++;
        }

        // Filter by approval status
        if (approved !== undefined) {
            whereConditions.push(`approved = $${paramCounter}`);
            queryParams.push(approved);
            paramCounter++;
        } else if (!includeUnApproved) {
            whereConditions.push('approved = true');
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT t.*, u.username as approved_by_username
            FROM technologies t
            LEFT JOIN users u ON t.approved_by = u.id
            ${whereClause}
            ORDER BY t.category, t.name
        `;

        try {
            const result = await pool.query(query, queryParams);
            return result.rows;
        } catch (error) {
            console.error('Error finding technologies:', error);
            throw new Error(`Failed to find technologies: ${error.message}`);
        }
    }

    /**
     * Get technologies grouped by category
     * @param {boolean} approvedOnly - Only return approved technologies
     * @returns {Object} Technologies grouped by category
     */
    static async getGroupedByCategory(approvedOnly = true) {
        const approvalCondition = approvedOnly ? 'WHERE approved = true' : '';

        const query = `
            SELECT category,
                   json_agg(
                       json_build_object(
                           'id', id,
                           'name', name,
                           'description', description,
                           'aliases', aliases,
                           'approved', approved
                       ) ORDER BY name
                   ) as technologies
            FROM technologies
            ${approvalCondition}
            GROUP BY category
            ORDER BY category
        `;

        try {
            const result = await pool.query(query);

            // Convert to object format
            const grouped = {};
            result.rows.forEach(row => {
                grouped[row.category] = row.technologies;
            });

            return grouped;
        } catch (error) {
            console.error('Error getting grouped technologies:', error);
            throw new Error(`Failed to get grouped technologies: ${error.message}`);
        }
    }

    /**
     * Approve technology
     * @param {number} id - Technology ID
     * @param {number} approvedBy - User ID approving the technology
     * @returns {Object} Updated technology record
     */
    static async approve(id, approvedBy) {
        const query = `
            UPDATE technologies
            SET approved = true,
                approved_at = CURRENT_TIMESTAMP,
                approved_by = $2
            WHERE id = $1 AND approved = false
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [id, approvedBy]);

            if (result.rows.length === 0) {
                throw new Error('Technology not found or already approved');
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error approving technology:', error);
            throw new Error(`Failed to approve technology: ${error.message}`);
        }
    }

    /**
     * Bulk approve multiple technologies
     * @param {Array} technologyIds - Array of technology IDs
     * @param {number} approvedBy - User ID approving the technologies
     * @returns {number} Number of approved technologies
     */
    static async bulkApprove(technologyIds, approvedBy) {
        if (!technologyIds || technologyIds.length === 0) {
            return 0;
        }

        const query = `
            UPDATE technologies
            SET approved = true,
                approved_at = CURRENT_TIMESTAMP,
                approved_by = $1
            WHERE id = ANY($2) AND approved = false
            RETURNING id
        `;

        try {
            const result = await pool.query(query, [approvedBy, technologyIds]);
            return result.rows.length;
        } catch (error) {
            console.error('Error bulk approving technologies:', error);
            throw new Error(`Failed to bulk approve technologies: ${error.message}`);
        }
    }

    /**
     * Update technology details
     * @param {number} id - Technology ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated technology record
     */
    static async update(id, updateData) {
        const allowedFields = ['name', 'category', 'description', 'aliases', 'confidence_threshold'];

        const updates = Object.keys(updateData)
            .filter(key => allowedFields.includes(key))
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        const values = Object.keys(updateData)
            .filter(key => allowedFields.includes(key))
            .map(key => updateData[key]);

        const query = `
            UPDATE technologies
            SET ${updates}
            WHERE id = $1
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [id, ...values]);

            if (result.rows.length === 0) {
                throw new Error('Technology not found');
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error updating technology:', error);
            throw new Error(`Failed to update technology: ${error.message}`);
        }
    }

    /**
     * Delete technology (only if not used in any PP)
     * @param {number} id - Technology ID
     * @returns {boolean} Success status
     */
    static async delete(id) {
        // Check if technology is used in any past performance
        const usageQuery = 'SELECT COUNT(*) FROM pp_technologies WHERE technology_id = $1';
        const usageResult = await pool.query(usageQuery, [id]);

        if (parseInt(usageResult.rows[0].count) > 0) {
            throw new Error('Cannot delete technology that is used in past performances');
        }

        const deleteQuery = 'DELETE FROM technologies WHERE id = $1 RETURNING id';

        try {
            const result = await pool.query(deleteQuery, [id]);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Error deleting technology:', error);
            throw new Error(`Failed to delete technology: ${error.message}`);
        }
    }

    /**
     * Associate technology with past performance
     * @param {Object} associationData - Association data
     * @returns {Object} Created association record
     */
    static async associateWithPP(associationData) {
        const {
            ppId,
            technologyId,
            versionSpecific,
            confidenceScore,
            contextSnippet,
            documentSource,
            detectionMethod = 'ai_extraction',
            validatedBy
        } = associationData;

        // Validate required fields
        if (!ppId || !technologyId || confidenceScore === undefined) {
            throw new Error('PP ID, technology ID, and confidence score are required');
        }

        // Validate confidence score
        if (confidenceScore < 0.0 || confidenceScore > 1.0) {
            throw new Error('Confidence score must be between 0.0 and 1.0');
        }

        const query = `
            INSERT INTO pp_technologies (
                pp_id, technology_id, version_specific, confidence_score,
                context_snippet, document_source, detection_method,
                validated_by, detected_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            ON CONFLICT (pp_id, technology_id, version_specific)
            DO UPDATE SET
                confidence_score = EXCLUDED.confidence_score,
                context_snippet = EXCLUDED.context_snippet,
                document_source = EXCLUDED.document_source,
                detection_method = EXCLUDED.detection_method,
                validated_by = EXCLUDED.validated_by,
                detected_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const values = [
            ppId, technologyId, versionSpecific, confidenceScore,
            contextSnippet, documentSource, detectionMethod, validatedBy
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error associating technology with PP:', error);
            throw new Error(`Failed to associate technology: ${error.message}`);
        }
    }

    /**
     * Get technology associations for a past performance
     * @param {number} ppId - Past performance ID
     * @param {Object} options - Query options
     * @returns {Array} Technology associations
     */
    static async getPPTechnologies(ppId, options = {}) {
        const { minConfidence = 0.0, includeVersions = true } = options;

        const versionSelect = includeVersions ? 'pt.version_specific,' : '';

        const query = `
            SELECT pt.id, pt.pp_id, pt.technology_id, ${versionSelect}
                   pt.confidence_score, pt.context_snippet, pt.detection_method,
                   pt.detected_at, t.name as technology_name, t.category,
                   t.description, u.username as validated_by_username
            FROM pp_technologies pt
            JOIN technologies t ON pt.technology_id = t.id
            LEFT JOIN users u ON pt.validated_by = u.id
            WHERE pt.pp_id = $1 AND pt.confidence_score >= $2
            ORDER BY pt.confidence_score DESC, t.category, t.name
        `;

        try {
            const result = await pool.query(query, [ppId, minConfidence]);
            return result.rows;
        } catch (error) {
            console.error('Error getting PP technologies:', error);
            throw new Error(`Failed to get PP technologies: ${error.message}`);
        }
    }

    /**
     * Search technologies by name or alias
     * @param {string} searchTerm - Search term
     * @param {number} limit - Maximum results to return
     * @returns {Array} Matching technologies
     */
    static async search(searchTerm, limit = 10) {
        const query = `
            SELECT *,
                   CASE
                       WHEN LOWER(name) = LOWER($1) THEN 100
                       WHEN LOWER(name) LIKE LOWER($1 || '%') THEN 90
                       WHEN LOWER(name) LIKE LOWER('%' || $1 || '%') THEN 80
                       WHEN $1 = ANY(SELECT LOWER(unnest(aliases))) THEN 85
                       ELSE 70
                   END as relevance_score
            FROM technologies
            WHERE approved = true
            AND (
                LOWER(name) LIKE LOWER('%' || $1 || '%')
                OR $1 = ANY(SELECT LOWER(unnest(aliases)))
                OR LOWER(description) LIKE LOWER('%' || $1 || '%')
            )
            ORDER BY relevance_score DESC, name
            LIMIT $2
        `;

        try {
            const result = await pool.query(query, [searchTerm.trim(), limit]);
            return result.rows;
        } catch (error) {
            console.error('Error searching technologies:', error);
            throw new Error(`Failed to search technologies: ${error.message}`);
        }
    }

    /**
     * Get technology usage statistics
     * @returns {Object} Usage statistics
     */
    static async getUsageStats() {
        const statsQuery = `
            SELECT
                t.category,
                t.name,
                COUNT(pt.id) as usage_count,
                AVG(pt.confidence_score) as avg_confidence,
                MAX(pt.detected_at) as last_used
            FROM technologies t
            LEFT JOIN pp_technologies pt ON t.id = pt.technology_id
            WHERE t.approved = true
            GROUP BY t.id, t.category, t.name
            ORDER BY usage_count DESC, t.category, t.name
        `;

        const categoryStatsQuery = `
            SELECT
                t.category,
                COUNT(DISTINCT t.id) as total_technologies,
                COUNT(pt.id) as total_usage
            FROM technologies t
            LEFT JOIN pp_technologies pt ON t.id = pt.technology_id
            WHERE t.approved = true
            GROUP BY t.category
            ORDER BY t.category
        `;

        try {
            const [statsResult, categoryResult] = await Promise.all([
                pool.query(statsQuery),
                pool.query(categoryStatsQuery)
            ]);

            return {
                technologyStats: statsResult.rows,
                categoryStats: categoryResult.rows
            };
        } catch (error) {
            console.error('Error getting usage stats:', error);
            throw new Error(`Failed to get usage statistics: ${error.message}`);
        }
    }
}

module.exports = Technology;