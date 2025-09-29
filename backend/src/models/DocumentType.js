/**
 * Enhanced Document Type Model
 * Supports dynamic document type management with admin configuration
 */

const { Pool } = require('pg');

class DocumentType {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'govaiuser'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'govai'}`
    });
    this.initializeTables();
  }

  async initializeTables() {
    try {
      // Create document_types table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS document_types (
          id SERIAL PRIMARY KEY,
          key VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          allowed_extensions TEXT[] DEFAULT '{}',
          max_size_mb INTEGER DEFAULT 50,
          subfolders TEXT[] DEFAULT '{}',
          is_system_type BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by VARCHAR(255) DEFAULT 'system',
          updated_by VARCHAR(255) DEFAULT 'system'
        )
      `);

      // Create document_type_metadata table for additional properties
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS document_type_metadata (
          id SERIAL PRIMARY KEY,
          document_type_id INTEGER REFERENCES document_types(id) ON DELETE CASCADE,
          key VARCHAR(100) NOT NULL,
          value JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(document_type_id, key)
        )
      `);

      // Create indexes for performance
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_document_types_key ON document_types(key);
        CREATE INDEX IF NOT EXISTS idx_document_types_active ON document_types(is_active);
        CREATE INDEX IF NOT EXISTS idx_document_type_metadata_type_key ON document_type_metadata(document_type_id, key);
      `);

      // Initialize default document types if table is empty
      await this.seedDefaultDocumentTypes();

      console.log('Document type tables initialized successfully');
    } catch (error) {
      console.error('Error initializing document type tables:', error);
    }
  }

  async seedDefaultDocumentTypes() {
    try {
      const countResult = await this.pool.query('SELECT COUNT(*) FROM document_types');
      const count = parseInt(countResult.rows[0].count);

      if (count === 0) {
        console.log('Seeding default document types...');

        const defaultTypes = [
          {
            key: 'solicitations',
            name: 'Solicitations',
            description: 'RFPs, RFIs, Sources Sought, and other government solicitations',
            allowed_extensions: ['.pdf', '.doc', '.docx', '.txt'],
            max_size_mb: 50,
            subfolders: ['active', 'archived', 'drafts'],
            is_system_type: true,
            metadata: {
              classifications: [
                { key: 'rfp', name: 'Request for Proposal (RFP)', description: 'Formal solicitation for proposals' },
                { key: 'rfi', name: 'Request for Information (RFI)', description: 'Information gathering solicitation' },
                { key: 'rfw', name: 'Request for White Paper (RFW)', description: 'Request for technical white papers' },
                { key: 'sources_sought', name: 'Sources Sought', description: 'Market research notice' },
                { key: 'sow', name: 'Statement of Work (SOW)', description: 'Work requirements document' },
                { key: 'pws', name: 'Performance Work Statement (PWS)', description: 'Performance-based work statement' },
                { key: 'other', name: 'Other Solicitation', description: 'Other types of government solicitations' }
              ]
            }
          },
          {
            key: 'past-performance',
            name: 'Past Performance',
            description: 'Project documentation, case studies, and performance records',
            allowed_extensions: ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx'],
            max_size_mb: 100,
            subfolders: ['federal', 'commercial', 'international', 'internal'],
            is_system_type: true,
            metadata: {
              classifications: [
                { key: 'project_summary', name: 'Project Summary', description: 'High-level project overview and outcomes' },
                { key: 'case_study', name: 'Case Study', description: 'Detailed project case study' },
                { key: 'performance_report', name: 'Performance Report', description: 'Formal performance evaluation' },
                { key: 'client_testimonial', name: 'Client Testimonial', description: 'Customer reference or testimonial' },
                { key: 'award_notification', name: 'Award Notification', description: 'Contract award documentation' },
                { key: 'project_deliverable', name: 'Project Deliverable', description: 'Sample work product or deliverable' }
              ]
            }
          },
          {
            key: 'proposals',
            name: 'Proposals',
            description: 'Draft and final proposal documents',
            allowed_extensions: ['.pdf', '.doc', '.docx'],
            max_size_mb: 200,
            subfolders: ['active', 'submitted', 'won', 'lost', 'templates'],
            is_system_type: true,
            metadata: {
              classifications: [
                { key: 'technical_proposal', name: 'Technical Proposal', description: 'Technical approach and solution' },
                { key: 'cost_proposal', name: 'Cost Proposal', description: 'Pricing and cost breakdown' },
                { key: 'management_proposal', name: 'Management Proposal', description: 'Management approach and team' },
                { key: 'executive_summary', name: 'Executive Summary', description: 'High-level proposal overview' },
                { key: 'full_proposal', name: 'Complete Proposal', description: 'Combined proposal document' },
                { key: 'proposal_template', name: 'Proposal Template', description: 'Reusable proposal template' }
              ]
            }
          },
          {
            key: 'compliance',
            name: 'Compliance Documents',
            description: 'Compliance certificates, audit reports, and regulatory documents',
            allowed_extensions: ['.pdf', '.doc', '.docx', '.txt'],
            max_size_mb: 25,
            subfolders: ['certificates', 'audits', 'policies', 'procedures'],
            is_system_type: true,
            metadata: {
              classifications: [
                { key: 'iso_certificate', name: 'ISO Certificate', description: 'ISO certification documents' },
                { key: 'soc_report', name: 'SOC 2 Report', description: 'SOC 2 compliance report' },
                { key: 'security_certificate', name: 'Security Certificate', description: 'Cybersecurity certifications' },
                { key: 'audit_report', name: 'Audit Report', description: 'Independent audit findings' },
                { key: 'policy_document', name: 'Policy Document', description: 'Corporate or compliance policy' },
                { key: 'procedure_manual', name: 'Procedure Manual', description: 'Standard operating procedures' }
              ]
            }
          },
          {
            key: 'references',
            name: 'Reference Materials',
            description: 'Templates, guidelines, and reference documents',
            allowed_extensions: ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx'],
            max_size_mb: 50,
            subfolders: ['templates', 'guidelines', 'standards', 'training'],
            is_system_type: true,
            metadata: {
              classifications: [
                { key: 'document_template', name: 'Document Template', description: 'Reusable document template' },
                { key: 'style_guide', name: 'Style Guide', description: 'Writing and formatting guidelines' },
                { key: 'training_material', name: 'Training Material', description: 'Educational or training content' },
                { key: 'best_practice', name: 'Best Practice Guide', description: 'Industry best practices' },
                { key: 'standard_document', name: 'Standard Document', description: 'Industry or regulatory standard' },
                { key: 'reference_guide', name: 'Reference Guide', description: 'Quick reference or cheat sheet' }
              ]
            }
          },
          {
            key: 'media',
            name: 'Media Files',
            description: 'Images, videos, and presentation materials',
            allowed_extensions: ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.ppt', '.pptx'],
            max_size_mb: 500,
            subfolders: ['images', 'videos', 'presentations', 'graphics'],
            is_system_type: true,
            metadata: {
              classifications: [
                { key: 'presentation', name: 'Presentation', description: 'PowerPoint or slide presentation' },
                { key: 'infographic', name: 'Infographic', description: 'Visual information graphic' },
                { key: 'diagram', name: 'Diagram', description: 'Technical or process diagram' },
                { key: 'photo', name: 'Photograph', description: 'Digital photograph' },
                { key: 'video', name: 'Video File', description: 'Video recording or animation' },
                { key: 'logo', name: 'Logo/Branding', description: 'Company logo or branding material' }
              ]
            }
          }
        ];

        for (const docType of defaultTypes) {
          const result = await this.pool.query(`
            INSERT INTO document_types (key, name, description, allowed_extensions, max_size_mb, subfolders, is_system_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [
            docType.key,
            docType.name,
            docType.description,
            docType.allowed_extensions,
            docType.max_size_mb,
            docType.subfolders,
            docType.is_system_type
          ]);

          const documentTypeId = result.rows[0].id;

          // Add metadata if provided
          if (docType.metadata && Object.keys(docType.metadata).length > 0) {
            for (const [metaKey, metaValue] of Object.entries(docType.metadata)) {
              await this.pool.query(`
                INSERT INTO document_type_metadata (document_type_id, key, value)
                VALUES ($1, $2, $3)
              `, [documentTypeId, metaKey, JSON.stringify(metaValue)]);
            }
          }
        }

        console.log(`Seeded ${defaultTypes.length} default document types`);
      }
    } catch (error) {
      console.error('Error seeding default document types:', error);
    }
  }

  // CRUD Operations

  async createDocumentType(data, createdBy = 'system') {
    const {
      key,
      name,
      description,
      allowed_extensions = [],
      max_size_mb = 50,
      subfolders = ['general'],
      metadata = {}
    } = data;

    try {
      // Validate required fields
      if (!key || !name) {
        throw new Error('Key and name are required');
      }

      // Validate key format (lowercase, alphanumeric + hyphens/underscores)
      if (!/^[a-z0-9-_]+$/.test(key)) {
        throw new Error('Key must contain only lowercase letters, numbers, hyphens, and underscores');
      }

      // Check if key already exists
      const existsResult = await this.pool.query('SELECT id FROM document_types WHERE key = $1', [key]);
      if (existsResult.rows.length > 0) {
        throw new Error('A document type with this key already exists');
      }

      // Validate file size
      if (max_size_mb < 1 || max_size_mb > 1000) {
        throw new Error('Max file size must be between 1 and 1000 MB');
      }

      // Ensure subfolders always includes 'general'
      const finalSubfolders = [...new Set(['general', ...subfolders])];

      const result = await this.pool.query(`
        INSERT INTO document_types
        (key, name, description, allowed_extensions, max_size_mb, subfolders, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        RETURNING *
      `, [key, name, description, allowed_extensions, max_size_mb, finalSubfolders, createdBy]);

      const documentType = result.rows[0];

      // Add metadata if provided
      if (Object.keys(metadata).length > 0) {
        for (const [metaKey, metaValue] of Object.entries(metadata)) {
          await this.pool.query(`
            INSERT INTO document_type_metadata (document_type_id, key, value)
            VALUES ($1, $2, $3)
          `, [documentType.id, metaKey, JSON.stringify(metaValue)]);
        }
      }

      return await this.getDocumentTypeById(documentType.id);
    } catch (error) {
      throw error;
    }
  }

  async updateDocumentType(id, data, updatedBy = 'system') {
    const {
      name,
      description,
      allowed_extensions,
      max_size_mb,
      subfolders,
      is_active,
      metadata
    } = data;

    try {
      // Check if document type exists and is not a system type (for certain operations)
      const existing = await this.getDocumentTypeById(id);
      if (!existing) {
        throw new Error('Document type not found');
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let valueIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${valueIndex++}`);
        values.push(name);
      }
      if (description !== undefined) {
        updates.push(`description = $${valueIndex++}`);
        values.push(description);
      }
      if (allowed_extensions !== undefined) {
        updates.push(`allowed_extensions = $${valueIndex++}`);
        values.push(allowed_extensions);
      }
      if (max_size_mb !== undefined) {
        if (max_size_mb < 1 || max_size_mb > 1000) {
          throw new Error('Max file size must be between 1 and 1000 MB');
        }
        updates.push(`max_size_mb = $${valueIndex++}`);
        values.push(max_size_mb);
      }
      if (subfolders !== undefined) {
        // Ensure subfolders always includes 'general'
        const finalSubfolders = [...new Set(['general', ...subfolders])];
        updates.push(`subfolders = $${valueIndex++}`);
        values.push(finalSubfolders);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${valueIndex++}`);
        values.push(is_active);
      }

      updates.push(`updated_by = $${valueIndex++}`);
      values.push(updatedBy);
      updates.push(`updated_at = NOW()`);

      if (updates.length === 2) { // Only updated_by and updated_at
        throw new Error('No valid fields to update');
      }

      values.push(id);

      await this.pool.query(`
        UPDATE document_types
        SET ${updates.join(', ')}
        WHERE id = $${valueIndex}
      `, values);

      // Handle metadata updates
      if (metadata !== undefined) {
        // Remove existing metadata
        await this.pool.query('DELETE FROM document_type_metadata WHERE document_type_id = $1', [id]);

        // Add new metadata
        for (const [metaKey, metaValue] of Object.entries(metadata)) {
          await this.pool.query(`
            INSERT INTO document_type_metadata (document_type_id, key, value)
            VALUES ($1, $2, $3)
          `, [id, metaKey, JSON.stringify(metaValue)]);
        }
      }

      return await this.getDocumentTypeById(id);
    } catch (error) {
      throw error;
    }
  }

  async getDocumentTypeById(id) {
    try {
      const result = await this.pool.query(`
        SELECT dt.*,
               COALESCE(
                 json_object_agg(dtm.key, dtm.value) FILTER (WHERE dtm.key IS NOT NULL),
                 '{}'::json
               ) as metadata
        FROM document_types dt
        LEFT JOIN document_type_metadata dtm ON dt.id = dtm.document_type_id
        WHERE dt.id = $1
        GROUP BY dt.id
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const docType = result.rows[0];

      // Parse metadata JSON values
      if (docType.metadata && typeof docType.metadata === 'object') {
        for (const [key, value] of Object.entries(docType.metadata)) {
          try {
            docType.metadata[key] = typeof value === 'string' ? JSON.parse(value) : value;
          } catch (e) {
            // Keep original value if JSON parsing fails
          }
        }
      }

      return docType;
    } catch (error) {
      throw error;
    }
  }

  async getDocumentTypeByKey(key) {
    try {
      const result = await this.pool.query(`
        SELECT dt.*,
               COALESCE(
                 json_object_agg(dtm.key, dtm.value) FILTER (WHERE dtm.key IS NOT NULL),
                 '{}'::json
               ) as metadata
        FROM document_types dt
        LEFT JOIN document_type_metadata dtm ON dt.id = dtm.document_type_id
        WHERE dt.key = $1
        GROUP BY dt.id
      `, [key]);

      if (result.rows.length === 0) {
        return null;
      }

      const docType = result.rows[0];

      // Parse metadata JSON values
      if (docType.metadata && typeof docType.metadata === 'object') {
        for (const [key, value] of Object.entries(docType.metadata)) {
          try {
            docType.metadata[key] = typeof value === 'string' ? JSON.parse(value) : value;
          } catch (e) {
            // Keep original value if JSON parsing fails
          }
        }
      }

      return docType;
    } catch (error) {
      throw error;
    }
  }

  async listDocumentTypes(filters = {}) {
    const {
      is_active = true,
      include_system = true,
      search,
      limit,
      offset = 0
    } = filters;

    try {
      let query = `
        SELECT dt.*,
               COALESCE(
                 json_object_agg(dtm.key, dtm.value) FILTER (WHERE dtm.key IS NOT NULL),
                 '{}'::json
               ) as metadata
        FROM document_types dt
        LEFT JOIN document_type_metadata dtm ON dt.id = dtm.document_type_id
        WHERE 1=1
      `;

      const values = [];
      let valueIndex = 1;

      if (is_active !== null) {
        query += ` AND dt.is_active = $${valueIndex++}`;
        values.push(is_active);
      }

      if (!include_system) {
        query += ` AND dt.is_system_type = false`;
      }

      if (search) {
        query += ` AND (dt.name ILIKE $${valueIndex++} OR dt.description ILIKE $${valueIndex++} OR dt.key ILIKE $${valueIndex++})`;
        const searchTerm = `%${search}%`;
        values.push(searchTerm, searchTerm, searchTerm);
      }

      query += ` GROUP BY dt.id ORDER BY dt.is_system_type DESC, dt.name ASC`;

      if (limit) {
        query += ` LIMIT $${valueIndex++}`;
        values.push(limit);
      }

      if (offset > 0) {
        query += ` OFFSET $${valueIndex++}`;
        values.push(offset);
      }

      const result = await this.pool.query(query, values);

      // Parse metadata for all results
      return result.rows.map(docType => {
        if (docType.metadata && typeof docType.metadata === 'object') {
          for (const [key, value] of Object.entries(docType.metadata)) {
            try {
              docType.metadata[key] = typeof value === 'string' ? JSON.parse(value) : value;
            } catch (e) {
              // Keep original value if JSON parsing fails
            }
          }
        }
        return docType;
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteDocumentType(id) {
    try {
      // Check if document type exists
      const existing = await this.getDocumentTypeById(id);
      if (!existing) {
        throw new Error('Document type not found');
      }

      // Prevent deletion of system types (unless forced)
      if (existing.is_system_type) {
        throw new Error('Cannot delete system document type');
      }

      // Check if any documents are using this type
      const documentsResult = await this.pool.query(`
        SELECT COUNT(*) FROM documents WHERE document_type = $1
      `, [existing.key]);

      const documentsCount = parseInt(documentsResult.rows[0].count);
      if (documentsCount > 0) {
        throw new Error(`Cannot delete document type: ${documentsCount} documents are using this type`);
      }

      // Delete metadata first (due to foreign key)
      await this.pool.query('DELETE FROM document_type_metadata WHERE document_type_id = $1', [id]);

      // Delete document type
      await this.pool.query('DELETE FROM document_types WHERE id = $1', [id]);

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Utility Methods

  async validateFileType(documentTypeKey, filename, fileSize) {
    try {
      const docType = await this.getDocumentTypeByKey(documentTypeKey);
      if (!docType) {
        throw new Error(`Invalid document type: ${documentTypeKey}`);
      }

      if (!docType.is_active) {
        throw new Error(`Document type '${docType.name}' is not active`);
      }

      // Check file extension
      const ext = filename.toLowerCase().match(/\.[^.]+$/);
      const fileExtension = ext ? ext[0] : '';

      if (docType.allowed_extensions.length > 0 && !docType.allowed_extensions.includes(fileExtension)) {
        throw new Error(`File type ${fileExtension} not allowed for ${docType.name}. Allowed: ${docType.allowed_extensions.join(', ')}`);
      }

      // Check file size (convert MB to bytes)
      const maxSizeBytes = docType.max_size_mb * 1024 * 1024;
      if (fileSize > maxSizeBytes) {
        throw new Error(`File size exceeds limit for ${docType.name}. Max: ${docType.max_size_mb}MB`);
      }

      return docType;
    } catch (error) {
      throw error;
    }
  }

  async getDocumentStructure() {
    try {
      const documentTypes = await this.listDocumentTypes({ is_active: true });

      const structure = {
        documentTypes: {},
        totalTypes: documentTypes.length
      };

      documentTypes.forEach(docType => {
        structure.documentTypes[docType.key] = {
          name: docType.name,
          description: docType.description,
          allowedExtensions: docType.allowed_extensions,
          maxSize: docType.max_size_mb,
          subfolders: docType.subfolders,
          isSystemType: docType.is_system_type,
          metadata: docType.metadata || {},
          // Include classifications from metadata for easier frontend access
          classifications: (docType.metadata && docType.metadata.classifications) || []
        };
      });

      return structure;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = DocumentType;