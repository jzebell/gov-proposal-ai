const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

/**
 * Past Performance Document Model
 * Handles document uploads and processing for past performance projects
 */
class PPDocument {
    /**
     * Create a new past performance document
     * @param {Object} docData - Document data
     * @returns {Object} Created document record
     */
    static async create(docData) {
        const {
            ppId,
            documentType,
            fileName,
            filePath,
            fileSize,
            contentText,
            weightFactor = 1.0
        } = docData;

        // Validate required fields
        if (!ppId || !fileName || !filePath) {
            throw new Error('PP ID, file name, and file path are required');
        }

        // Validate document type
        const validTypes = ['narrative', 'pws_sow', 'qasp', 'govt_review', 'cpars', 'contract_history', 'other'];
        if (documentType && !validTypes.includes(documentType)) {
            throw new Error(`Invalid document type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate weight factor
        if (weightFactor < 0.1 || weightFactor > 2.0) {
            throw new Error('Weight factor must be between 0.1 and 2.0');
        }

        const query = `
            INSERT INTO pp_documents (
                pp_id, document_type, file_name, file_path, file_size,
                content_text, weight_factor, processing_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING *
        `;

        const values = [
            ppId, documentType || 'other', fileName, filePath, fileSize,
            contentText, weightFactor
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error creating PP document:', error);
            throw new Error(`Failed to create PP document: ${error.message}`);
        }
    }

    /**
     * Get document by ID
     * @param {number} id - Document ID
     * @returns {Object|null} Document record
     */
    static async findById(id) {
        const query = `
            SELECT pd.*, pp.name as pp_name, pp.customer
            FROM pp_documents pd
            JOIN past_performances pp ON pd.pp_id = pp.id
            WHERE pd.id = $1
        `;

        try {
            const result = await pool.query(query, [id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Error finding PP document by ID:', error);
            throw new Error(`Failed to find PP document: ${error.message}`);
        }
    }

    /**
     * Get all documents for a past performance
     * @param {number} ppId - Past performance ID
     * @returns {Array} Document records
     */
    static async findByPPId(ppId) {
        const query = `
            SELECT * FROM pp_documents
            WHERE pp_id = $1
            ORDER BY
                CASE document_type
                    WHEN 'narrative' THEN 1
                    WHEN 'pws_sow' THEN 2
                    WHEN 'qasp' THEN 3
                    WHEN 'govt_review' THEN 4
                    WHEN 'cpars' THEN 5
                    WHEN 'contract_history' THEN 6
                    ELSE 7
                END,
                uploaded_at DESC
        `;

        try {
            const result = await pool.query(query, [ppId]);
            return result.rows;
        } catch (error) {
            console.error('Error finding PP documents by PP ID:', error);
            throw new Error(`Failed to find PP documents: ${error.message}`);
        }
    }

    /**
     * Update document content and processing status
     * @param {number} id - Document ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated document
     */
    static async updateContent(id, updateData) {
        const {
            contentText,
            processingStatus,
            errorMessage,
            processedAt
        } = updateData;

        const query = `
            UPDATE pp_documents
            SET
                content_text = COALESCE($2, content_text),
                processing_status = COALESCE($3, processing_status),
                error_message = $4,
                processed_at = COALESCE($5, processed_at)
            WHERE id = $1
            RETURNING *
        `;

        const values = [
            id, contentText, processingStatus, errorMessage,
            processedAt || (processingStatus === 'completed' ? new Date() : null)
        ];

        try {
            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                throw new Error('Document not found');
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error updating PP document content:', error);
            throw new Error(`Failed to update PP document: ${error.message}`);
        }
    }

    /**
     * Update document weight factor
     * @param {number} id - Document ID
     * @param {number} weightFactor - New weight factor
     * @returns {Object} Updated document
     */
    static async updateWeight(id, weightFactor) {
        if (weightFactor < 0.1 || weightFactor > 2.0) {
            throw new Error('Weight factor must be between 0.1 and 2.0');
        }

        const query = `
            UPDATE pp_documents
            SET weight_factor = $2
            WHERE id = $1
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [id, weightFactor]);

            if (result.rows.length === 0) {
                throw new Error('Document not found');
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error updating PP document weight:', error);
            throw new Error(`Failed to update document weight: ${error.message}`);
        }
    }

    /**
     * Delete document and create version history
     * @param {number} id - Document ID
     * @param {number} replacedBy - User ID replacing the document
     * @returns {boolean} Success status
     */
    static async archive(id, replacedBy) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get current document data
            const docQuery = 'SELECT * FROM pp_documents WHERE id = $1';
            const docResult = await client.query(docQuery, [id]);

            if (docResult.rows.length === 0) {
                throw new Error('Document not found');
            }

            const doc = docResult.rows[0];

            // Create version history entry
            const versionQuery = `
                INSERT INTO pp_document_versions (
                    document_id, version_number, file_path_historical,
                    content_text_historical, version_notes, replaced_by
                )
                SELECT $1,
                       COALESCE(MAX(version_number), 0) + 1,
                       $2, $3, $4, $5
                FROM pp_document_versions
                WHERE document_id = $1
            `;

            await client.query(versionQuery, [
                id,
                doc.file_path,
                doc.content_text,
                'Document archived',
                replacedBy
            ]);

            // Delete the document
            const deleteQuery = 'DELETE FROM pp_documents WHERE id = $1';
            await client.query(deleteQuery, [id]);

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error archiving PP document:', error);
            throw new Error(`Failed to archive document: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Get documents by processing status
     * @param {string} status - Processing status
     * @returns {Array} Document records
     */
    static async findByStatus(status) {
        const validStatuses = ['pending', 'processing', 'completed', 'error'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        const query = `
            SELECT pd.*, pp.name as pp_name, pp.customer
            FROM pp_documents pd
            JOIN past_performances pp ON pd.pp_id = pp.id
            WHERE pd.processing_status = $1
            ORDER BY pd.uploaded_at ASC
        `;

        try {
            const result = await pool.query(query, [status]);
            return result.rows;
        } catch (error) {
            console.error('Error finding documents by status:', error);
            throw new Error(`Failed to find documents by status: ${error.message}`);
        }
    }

    /**
     * Get document processing statistics
     * @returns {Object} Processing statistics
     */
    static async getProcessingStats() {
        const statsQuery = `
            SELECT
                processing_status,
                COUNT(*) as count,
                AVG(EXTRACT(EPOCH FROM (processed_at - uploaded_at))) as avg_processing_time_seconds
            FROM pp_documents
            WHERE uploaded_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY processing_status
        `;

        const errorQuery = `
            SELECT error_message, COUNT(*) as count
            FROM pp_documents
            WHERE processing_status = 'error'
            AND uploaded_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY error_message
            ORDER BY count DESC
            LIMIT 10
        `;

        try {
            const [statsResult, errorResult] = await Promise.all([
                pool.query(statsQuery),
                pool.query(errorQuery)
            ]);

            return {
                statusCounts: statsResult.rows,
                recentErrors: errorResult.rows
            };
        } catch (error) {
            console.error('Error getting processing stats:', error);
            throw new Error(`Failed to get processing statistics: ${error.message}`);
        }
    }

    /**
     * Get document version history
     * @param {number} documentId - Document ID
     * @returns {Array} Version history records
     */
    static async getVersionHistory(documentId) {
        const query = `
            SELECT pdv.*, u.username as replaced_by_username
            FROM pp_document_versions pdv
            LEFT JOIN users u ON pdv.replaced_by = u.id
            WHERE pdv.document_id = $1
            ORDER BY pdv.version_number DESC
        `;

        try {
            const result = await pool.query(query, [documentId]);
            return result.rows;
        } catch (error) {
            console.error('Error getting version history:', error);
            throw new Error(`Failed to get version history: ${error.message}`);
        }
    }

    /**
     * Bulk update processing status for multiple documents
     * @param {Array} documentIds - Array of document IDs
     * @param {string} status - New processing status
     * @returns {number} Number of updated documents
     */
    static async bulkUpdateStatus(documentIds, status) {
        if (!documentIds || documentIds.length === 0) {
            return 0;
        }

        const validStatuses = ['pending', 'processing', 'completed', 'error'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        const query = `
            UPDATE pp_documents
            SET processing_status = $1,
                processed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE processed_at END
            WHERE id = ANY($2)
            RETURNING id
        `;

        try {
            const result = await pool.query(query, [status, documentIds]);
            return result.rows.length;
        } catch (error) {
            console.error('Error bulk updating document status:', error);
            throw new Error(`Failed to bulk update status: ${error.message}`);
        }
    }
}

module.exports = PPDocument;