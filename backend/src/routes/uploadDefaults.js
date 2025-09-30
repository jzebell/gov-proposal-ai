/**
 * Upload Defaults Configuration Routes
 * Manages admin-configurable upload defaults stored in database
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'govaiuser'}:${process.env.DB_PASSWORD || 'devpass123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'govai'}`
});

// Simple auth middleware placeholder - replace with proper auth when available
const requireAuth = (req, res, next) => {
  // For now, just pass through - in production, check JWT token
  req.user = { id: 1, email: 'admin@agency.gov' }; // Mock user
  next();
};

const requireAdmin = (req, res, next) => {
  // For now, just pass through - in production, check user role
  next();
};

// Simple logger placeholder
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug
};

/**
 * Get current upload defaults configuration
 * Available to all authenticated users
 */
router.get('/config', requireAuth, async (req, res) => {
  try {
    // Get the latest configuration from database
    const query = `
      SELECT
        id,
        default_document_type,
        default_subfolder,
        document_type_order,
        subfolder_order,
        file_settings,
        updated_at,
        updated_by
      FROM upload_defaults_config
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      // Return default configuration if none exists
      return res.json({
        success: true,
        data: {
          defaultDocumentType: 'solicitation',
          defaultSubfolder: 'Active',
          documentTypeOrder: [
            { value: 'solicitation', label: 'Solicitation' },
            { value: 'proposal', label: 'Proposal' },
            { value: 'past_performance', label: 'Past Performance' },
            { value: 'reference', label: 'Reference' },
            { value: 'media', label: 'Media' },
            { value: 'compliance', label: 'Compliance' }
          ],
          subfolderOrder: [
            { value: 'Active', label: 'Active' },
            { value: 'Archive', label: 'Archive' },
            { value: 'Reference', label: 'Reference' },
            { value: 'Templates', label: 'Templates' },
            { value: 'Working', label: 'Working' },
            { value: 'Final', label: 'Final' }
          ],
          fileSettings: {
            maxFileSize: 50,
            maxFiles: 10,
            allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xls', '.xlsx', '.ppt', '.pptx']
          }
        }
      });
    }

    const config = result.rows[0];

    res.json({
      success: true,
      data: {
        id: config.id,
        defaultDocumentType: config.default_document_type,
        defaultSubfolder: config.default_subfolder,
        documentTypeOrder: config.document_type_order,
        subfolderOrder: config.subfolder_order,
        fileSettings: config.file_settings,
        updatedAt: config.updated_at,
        updatedBy: config.updated_by
      }
    });

  } catch (error) {
    logger.error('Error fetching upload defaults:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upload defaults configuration'
    });
  }
});

/**
 * Update upload defaults configuration
 * Admin only
 */
router.post('/config', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      defaultDocumentType,
      defaultSubfolder,
      documentTypeOrder,
      subfolderOrder,
      fileSettings
    } = req.body;

    await client.query('BEGIN');

    // Check if configuration exists
    const checkQuery = 'SELECT id FROM upload_defaults_config LIMIT 1';
    const checkResult = await client.query(checkQuery);

    let query;
    let values;

    if (checkResult.rows.length > 0) {
      // Update existing configuration
      query = `
        UPDATE upload_defaults_config
        SET
          default_document_type = $1,
          default_subfolder = $2,
          document_type_order = $3,
          subfolder_order = $4,
          file_settings = $5,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $6
        WHERE id = $7
        RETURNING *
      `;
      values = [
        defaultDocumentType,
        defaultSubfolder,
        JSON.stringify(documentTypeOrder),
        JSON.stringify(subfolderOrder),
        JSON.stringify(fileSettings),
        req.user.id,
        checkResult.rows[0].id
      ];
    } else {
      // Insert new configuration
      query = `
        INSERT INTO upload_defaults_config (
          default_document_type,
          default_subfolder,
          document_type_order,
          subfolder_order,
          file_settings,
          created_by,
          updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $6)
        RETURNING *
      `;
      values = [
        defaultDocumentType,
        defaultSubfolder,
        JSON.stringify(documentTypeOrder),
        JSON.stringify(subfolderOrder),
        JSON.stringify(fileSettings),
        req.user.id
      ];
    }

    const result = await client.query(query, values);
    await client.query('COMMIT');

    // Log the configuration change
    logger.info(`Upload defaults updated by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Upload defaults configuration saved successfully',
      data: {
        id: result.rows[0].id,
        defaultDocumentType: result.rows[0].default_document_type,
        defaultSubfolder: result.rows[0].default_subfolder,
        documentTypeOrder: result.rows[0].document_type_order,
        subfolderOrder: result.rows[0].subfolder_order,
        fileSettings: result.rows[0].file_settings,
        updatedAt: result.rows[0].updated_at,
        updatedBy: result.rows[0].updated_by
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating upload defaults:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save upload defaults configuration'
    });
  } finally {
    client.release();
  }
});

/**
 * Get configuration history
 * Admin only - for audit purposes
 */
router.get('/history', requireAuth, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT
        udc.*,
        u.name as updated_by_name,
        u.email as updated_by_email
      FROM upload_defaults_config_history udc
      LEFT JOIN users u ON udc.updated_by = u.id
      ORDER BY udc.created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        defaultDocumentType: row.default_document_type,
        defaultSubfolder: row.default_subfolder,
        documentTypeOrder: row.document_type_order,
        subfolderOrder: row.subfolder_order,
        fileSettings: row.file_settings,
        updatedAt: row.updated_at,
        updatedBy: {
          id: row.updated_by,
          name: row.updated_by_name,
          email: row.updated_by_email
        }
      }))
    });

  } catch (error) {
    logger.error('Error fetching upload defaults history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration history'
    });
  }
});

module.exports = router;