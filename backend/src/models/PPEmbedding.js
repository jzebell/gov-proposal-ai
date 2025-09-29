const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

/**
 * Past Performance Embedding Model
 * Handles vector embeddings for semantic search functionality
 */
class PPEmbedding {
    /**
     * Create a new embedding
     * @param {Object} embeddingData - Embedding data
     * @returns {Object} Created embedding record
     */
    static async create(embeddingData) {
        const {
            ppId,
            chunkType,
            chunkText,
            chunkSummary,
            embedding,
            chunkMetadata = {},
            chunkOrder = 0,
            tokenCount
        } = embeddingData;

        // Validate required fields
        if (!ppId || !chunkType || !chunkText || !embedding) {
            throw new Error('PP ID, chunk type, chunk text, and embedding are required');
        }

        // Validate chunk type
        const validTypes = ['project_level', 'capability_level', 'outcome_level', 'technology_level'];
        if (!validTypes.includes(chunkType)) {
            throw new Error(`Invalid chunk type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate embedding dimension (assuming 1536 for OpenAI/Ollama)
        if (!Array.isArray(embedding) || embedding.length !== 1536) {
            throw new Error('Embedding must be an array of 1536 numbers');
        }

        const query = `
            INSERT INTO pp_embeddings (
                pp_id, chunk_type, chunk_text, chunk_summary, embedding,
                chunk_metadata, chunk_order, token_count, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            RETURNING id, pp_id, chunk_type, chunk_summary, chunk_metadata, chunk_order, token_count, created_at
        `;

        const values = [
            ppId, chunkType, chunkText, chunkSummary,
            JSON.stringify(embedding), // Convert array to JSON for storage
            JSON.stringify(chunkMetadata),
            chunkOrder, tokenCount
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error creating PP embedding:', error);
            throw new Error(`Failed to create embedding: ${error.message}`);
        }
    }

    /**
     * Get embeddings for a past performance
     * @param {number} ppId - Past performance ID
     * @param {Object} options - Query options
     * @returns {Array} Embedding records
     */
    static async findByPPId(ppId, options = {}) {
        const { chunkType, includeEmbeddings = false } = options;

        let whereConditions = ['pp_id = $1'];
        let queryParams = [ppId];
        let paramCounter = 2;

        if (chunkType) {
            whereConditions.push(`chunk_type = $${paramCounter}`);
            queryParams.push(chunkType);
            paramCounter++;
        }

        const whereClause = whereConditions.join(' AND ');

        // Only include embedding vectors if specifically requested (they're large)
        const embeddingSelect = includeEmbeddings ? 'embedding,' : '';

        const query = `
            SELECT id, pp_id, chunk_type, chunk_text, chunk_summary,
                   ${embeddingSelect} chunk_metadata, chunk_order, token_count, created_at
            FROM pp_embeddings
            WHERE ${whereClause}
            ORDER BY chunk_type, chunk_order
        `;

        try {
            const result = await pool.query(query, queryParams);

            // Parse JSON fields
            return result.rows.map(row => ({
                ...row,
                chunk_metadata: typeof row.chunk_metadata === 'string'
                    ? JSON.parse(row.chunk_metadata)
                    : row.chunk_metadata,
                embedding: row.embedding && typeof row.embedding === 'string'
                    ? JSON.parse(row.embedding)
                    : row.embedding
            }));
        } catch (error) {
            console.error('Error finding embeddings by PP ID:', error);
            throw new Error(`Failed to find embeddings: ${error.message}`);
        }
    }

    /**
     * Perform semantic search using cosine similarity
     * @param {Array} queryEmbedding - Query embedding vector
     * @param {Object} options - Search options
     * @returns {Array} Search results with similarity scores
     */
    static async semanticSearch(queryEmbedding, options = {}) {
        const {
            chunkTypes = ['project_level', 'capability_level'],
            limit = 10,
            minSimilarity = 0.1,
            ppFilters = {}
        } = options;

        // Validate query embedding
        if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 1536) {
            throw new Error('Query embedding must be an array of 1536 numbers');
        }

        // Build PP filters
        let ppJoinConditions = [];
        let queryParams = [JSON.stringify(queryEmbedding), chunkTypes, minSimilarity, limit];
        let paramCounter = 5;

        if (ppFilters.customer) {
            ppJoinConditions.push(`pp.customer ILIKE $${paramCounter}`);
            queryParams.push(`%${ppFilters.customer}%`);
            paramCounter++;
        }

        if (ppFilters.role) {
            ppJoinConditions.push(`pp.role = $${paramCounter}`);
            queryParams.push(ppFilters.role);
            paramCounter++;
        }

        if (ppFilters.minContractValue) {
            ppJoinConditions.push(`pp.contract_value >= $${paramCounter}`);
            queryParams.push(ppFilters.minContractValue);
            paramCounter++;
        }

        if (ppFilters.minPeriodEnd) {
            ppJoinConditions.push(`pp.period_end >= $${paramCounter}`);
            queryParams.push(ppFilters.minPeriodEnd);
            paramCounter++;
        }

        const ppFilterClause = ppJoinConditions.length > 0
            ? `AND ${ppJoinConditions.join(' AND ')}`
            : '';

        const query = `
            SELECT
                e.id,
                e.pp_id,
                e.chunk_type,
                e.chunk_text,
                e.chunk_summary,
                e.chunk_metadata,
                e.token_count,
                pp.name as pp_name,
                pp.customer,
                pp.contract_value,
                pp.period_start,
                pp.period_end,
                pp.role,
                1 - (e.embedding <=> $1::vector) as similarity_score
            FROM pp_embeddings e
            JOIN past_performances pp ON e.pp_id = pp.id
            WHERE pp.status = 'active'
            AND e.chunk_type = ANY($2)
            AND 1 - (e.embedding <=> $1::vector) >= $3
            ${ppFilterClause}
            ORDER BY similarity_score DESC
            LIMIT $4
        `;

        try {
            const result = await pool.query(query, queryParams);

            // Parse JSON fields and format results
            return result.rows.map(row => ({
                ...row,
                chunk_metadata: typeof row.chunk_metadata === 'string'
                    ? JSON.parse(row.chunk_metadata)
                    : row.chunk_metadata,
                similarity_score: parseFloat(row.similarity_score)
            }));
        } catch (error) {
            console.error('Error performing semantic search:', error);
            throw new Error(`Failed to perform semantic search: ${error.message}`);
        }
    }

    /**
     * Update embedding metadata
     * @param {number} id - Embedding ID
     * @param {Object} metadata - New metadata
     * @returns {Object} Updated embedding record
     */
    static async updateMetadata(id, metadata) {
        const query = `
            UPDATE pp_embeddings
            SET chunk_metadata = $2
            WHERE id = $1
            RETURNING id, pp_id, chunk_type, chunk_summary, chunk_metadata, chunk_order, token_count
        `;

        try {
            const result = await pool.query(query, [id, JSON.stringify(metadata)]);

            if (result.rows.length === 0) {
                throw new Error('Embedding not found');
            }

            const row = result.rows[0];
            return {
                ...row,
                chunk_metadata: typeof row.chunk_metadata === 'string'
                    ? JSON.parse(row.chunk_metadata)
                    : row.chunk_metadata
            };
        } catch (error) {
            console.error('Error updating embedding metadata:', error);
            throw new Error(`Failed to update embedding metadata: ${error.message}`);
        }
    }

    /**
     * Delete all embeddings for a past performance
     * @param {number} ppId - Past performance ID
     * @returns {number} Number of deleted embeddings
     */
    static async deleteByPPId(ppId) {
        const query = 'DELETE FROM pp_embeddings WHERE pp_id = $1 RETURNING id';

        try {
            const result = await pool.query(query, [ppId]);
            return result.rows.length;
        } catch (error) {
            console.error('Error deleting embeddings by PP ID:', error);
            throw new Error(`Failed to delete embeddings: ${error.message}`);
        }
    }

    /**
     * Get embedding statistics
     * @returns {Object} Embedding statistics
     */
    static async getStatistics() {
        const statsQuery = `
            SELECT
                chunk_type,
                COUNT(*) as count,
                AVG(token_count) as avg_token_count,
                MIN(token_count) as min_token_count,
                MAX(token_count) as max_token_count
            FROM pp_embeddings
            GROUP BY chunk_type
            ORDER BY chunk_type
        `;

        const recentQuery = `
            SELECT
                DATE_TRUNC('day', created_at) as date,
                COUNT(*) as embeddings_created
            FROM pp_embeddings
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY date
        `;

        try {
            const [statsResult, recentResult] = await Promise.all([
                pool.query(statsQuery),
                pool.query(recentQuery)
            ]);

            return {
                byChunkType: statsResult.rows,
                recentActivity: recentResult.rows
            };
        } catch (error) {
            console.error('Error getting embedding statistics:', error);
            throw new Error(`Failed to get embedding statistics: ${error.message}`);
        }
    }

    /**
     * Find similar embeddings to a given embedding
     * @param {number} embeddingId - Source embedding ID
     * @param {Object} options - Search options
     * @returns {Array} Similar embeddings
     */
    static async findSimilar(embeddingId, options = {}) {
        const { limit = 5, minSimilarity = 0.5, excludeSamePP = true } = options;

        let excludeCondition = '';
        if (excludeSamePP) {
            excludeCondition = 'AND e2.pp_id != e1.pp_id';
        }

        const query = `
            SELECT
                e2.id,
                e2.pp_id,
                e2.chunk_type,
                e2.chunk_summary,
                e2.chunk_metadata,
                pp.name as pp_name,
                pp.customer,
                1 - (e1.embedding <=> e2.embedding) as similarity_score
            FROM pp_embeddings e1
            JOIN pp_embeddings e2 ON e1.id != e2.id
            JOIN past_performances pp ON e2.pp_id = pp.id
            WHERE e1.id = $1
            AND pp.status = 'active'
            AND 1 - (e1.embedding <=> e2.embedding) >= $2
            ${excludeCondition}
            ORDER BY similarity_score DESC
            LIMIT $3
        `;

        try {
            const result = await pool.query(query, [embeddingId, minSimilarity, limit]);

            return result.rows.map(row => ({
                ...row,
                chunk_metadata: typeof row.chunk_metadata === 'string'
                    ? JSON.parse(row.chunk_metadata)
                    : row.chunk_metadata,
                similarity_score: parseFloat(row.similarity_score)
            }));
        } catch (error) {
            console.error('Error finding similar embeddings:', error);
            throw new Error(`Failed to find similar embeddings: ${error.message}`);
        }
    }

    /**
     * Bulk create embeddings for a past performance
     * @param {Array} embeddingsData - Array of embedding data objects
     * @returns {Array} Created embedding records
     */
    static async bulkCreate(embeddingsData) {
        if (!embeddingsData || embeddingsData.length === 0) {
            return [];
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const results = [];
            for (const embeddingData of embeddingsData) {
                const query = `
                    INSERT INTO pp_embeddings (
                        pp_id, chunk_type, chunk_text, chunk_summary, embedding,
                        chunk_metadata, chunk_order, token_count, created_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                    RETURNING id, pp_id, chunk_type, chunk_summary, chunk_metadata, chunk_order, token_count, created_at
                `;

                const values = [
                    embeddingData.ppId,
                    embeddingData.chunkType,
                    embeddingData.chunkText,
                    embeddingData.chunkSummary,
                    JSON.stringify(embeddingData.embedding),
                    JSON.stringify(embeddingData.chunkMetadata || {}),
                    embeddingData.chunkOrder || 0,
                    embeddingData.tokenCount
                ];

                const result = await client.query(query, values);
                results.push(result.rows[0]);
            }

            await client.query('COMMIT');
            return results;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error bulk creating embeddings:', error);
            throw new Error(`Failed to bulk create embeddings: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Regenerate embeddings for a past performance
     * @param {number} ppId - Past performance ID
     * @param {Array} newEmbeddingsData - New embedding data
     * @returns {Array} Created embedding records
     */
    static async regenerate(ppId, newEmbeddingsData) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Delete existing embeddings
            await client.query('DELETE FROM pp_embeddings WHERE pp_id = $1', [ppId]);

            // Create new embeddings
            const results = [];
            for (const embeddingData of newEmbeddingsData) {
                const query = `
                    INSERT INTO pp_embeddings (
                        pp_id, chunk_type, chunk_text, chunk_summary, embedding,
                        chunk_metadata, chunk_order, token_count, created_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                    RETURNING id, pp_id, chunk_type, chunk_summary, chunk_metadata, chunk_order, token_count, created_at
                `;

                const values = [
                    ppId,
                    embeddingData.chunkType,
                    embeddingData.chunkText,
                    embeddingData.chunkSummary,
                    JSON.stringify(embeddingData.embedding),
                    JSON.stringify(embeddingData.chunkMetadata || {}),
                    embeddingData.chunkOrder || 0,
                    embeddingData.tokenCount
                ];

                const result = await client.query(query, values);
                results.push(result.rows[0]);
            }

            await client.query('COMMIT');
            return results;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error regenerating embeddings:', error);
            throw new Error(`Failed to regenerate embeddings: ${error.message}`);
        } finally {
            client.release();
        }
    }
}

module.exports = PPEmbedding;