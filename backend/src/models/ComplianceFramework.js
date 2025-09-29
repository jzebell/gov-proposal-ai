/**
 * Compliance Framework Model
 * Database-driven compliance framework management for project creation
 * Extends the existing ComplianceService infrastructure
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

class ComplianceFramework {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/dbname'
    });
  }

  /**
   * Initialize database tables for compliance frameworks
   */
  async initializeTables() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Compliance framework categories table
      await client.query(`
        CREATE TABLE IF NOT EXISTS compliance_categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          display_name VARCHAR(200) NOT NULL,
          description TEXT,
          color_code VARCHAR(7) DEFAULT '#007bff',
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Compliance frameworks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS compliance_frameworks (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          category_id INTEGER REFERENCES compliance_categories(id),
          agency_specific BOOLEAN DEFAULT false,
          target_agencies TEXT[], -- Array of agency IDs/names
          is_active BOOLEAN DEFAULT true,
          is_default BOOLEAN DEFAULT false,
          sort_order INTEGER DEFAULT 0,
          documentation_url TEXT,
          version VARCHAR(50),
          effective_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Agency compliance mappings (smart defaults by agency)
      await client.query(`
        CREATE TABLE IF NOT EXISTS agency_compliance_mappings (
          id SERIAL PRIMARY KEY,
          agency_id VARCHAR(100) NOT NULL,
          agency_name VARCHAR(200) NOT NULL,
          department_id VARCHAR(100),
          framework_id INTEGER REFERENCES compliance_frameworks(id),
          is_default BOOLEAN DEFAULT false,
          is_suggested BOOLEAN DEFAULT true,
          priority INTEGER DEFAULT 1, -- 1=highest, 5=lowest
          reason TEXT, -- Why this framework applies to this agency
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(agency_id, framework_id)
        )
      `);

      // Project compliance requirements (many-to-many)
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_compliance_frameworks (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL,
          framework_id INTEGER REFERENCES compliance_frameworks(id),
          is_required BOOLEAN DEFAULT false,
          is_suggested BOOLEAN DEFAULT true,
          compliance_status VARCHAR(50) DEFAULT 'pending', -- pending, partial, compliant, non-compliant
          evidence_provided TEXT,
          notes TEXT,
          assigned_to VARCHAR(100),
          due_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, framework_id)
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_category
        ON compliance_frameworks(category_id, is_active)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_agency_compliance_mappings_agency
        ON agency_compliance_mappings(agency_id, is_default, priority)
      `);

      await client.query('COMMIT');
      logger.info('Compliance framework tables initialized successfully');

      // Seed default data
      await this.seedDefaultData();

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error initializing compliance framework tables:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Seed default compliance framework data
   */
  async seedDefaultData() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert default categories
      const categories = [
        { name: 'acquisition', display_name: 'Acquisition & Procurement', description: 'Federal acquisition regulations and procurement requirements', color_code: '#28a745', sort_order: 1 },
        { name: 'security', display_name: 'Security & Cybersecurity', description: 'Information security and cybersecurity frameworks', color_code: '#dc3545', sort_order: 2 },
        { name: 'standards', display_name: 'Standards & Compliance', description: 'Industry standards and compliance certifications', color_code: '#007bff', sort_order: 3 },
        { name: 'accessibility', display_name: 'Accessibility', description: 'Accessibility and disability compliance requirements', color_code: '#6f42c1', sort_order: 4 },
        { name: 'industry', display_name: 'Industry-Specific', description: 'Industry or agency-specific compliance requirements', color_code: '#fd7e14', sort_order: 5 }
      ];

      for (const category of categories) {
        await client.query(`
          INSERT INTO compliance_categories (name, display_name, description, color_code, sort_order)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            color_code = EXCLUDED.color_code,
            sort_order = EXCLUDED.sort_order,
            updated_at = CURRENT_TIMESTAMP
        `, [category.name, category.display_name, category.description, category.color_code, category.sort_order]);
      }

      // Get category IDs
      const categoryIds = {};
      const categoryResult = await client.query('SELECT id, name FROM compliance_categories');
      categoryResult.rows.forEach(row => {
        categoryIds[row.name] = row.id;
      });

      // Insert default frameworks
      const frameworks = [
        // Acquisition & Procurement
        { code: 'FAR', name: 'Federal Acquisition Regulation', description: 'Primary regulation for use by all Federal Executive agencies in their acquisition of supplies and services', category: 'acquisition', is_default: true, sort_order: 1 },
        { code: 'DFARS', name: 'Defense Federal Acquisition Regulation Supplement', description: 'DoD supplement to the Federal Acquisition Regulation', category: 'acquisition', agency_specific: true, target_agencies: ['1'], sort_order: 2 },
        { code: 'GSA_SCHEDULES', name: 'GSA Multiple Award Schedules', description: 'GSA contracting vehicles for government-wide acquisition', category: 'acquisition', sort_order: 3 },

        // Security & Cybersecurity
        { code: 'FISMA', name: 'Federal Information Security Modernization Act', description: 'Federal information security management requirements', category: 'security', is_default: true, sort_order: 1 },
        { code: 'NIST_CSF', name: 'NIST Cybersecurity Framework', description: 'Framework for improving critical infrastructure cybersecurity', category: 'security', is_default: true, sort_order: 2 },
        { code: 'FEDRAMP', name: 'Federal Risk and Authorization Management Program', description: 'Government-wide program for cloud product security assessment', category: 'security', sort_order: 3 },
        { code: 'CMMC', name: 'Cybersecurity Maturity Model Certification', description: 'DoD cybersecurity standard for defense contractors', category: 'security', agency_specific: true, target_agencies: ['1'], sort_order: 4 },
        { code: 'FIPS140', name: 'Federal Information Processing Standards 140', description: 'Security requirements for cryptographic modules', category: 'security', sort_order: 5 },

        // Standards & Compliance
        { code: 'SOC2', name: 'Service Organization Control 2', description: 'Trust services criteria for service organizations', category: 'standards', sort_order: 1 },
        { code: 'ISO27001', name: 'ISO/IEC 27001', description: 'International standard for information security management', category: 'standards', sort_order: 2 },
        { code: 'NIST800_53', name: 'NIST SP 800-53', description: 'Security and Privacy Controls for Information Systems', category: 'standards', sort_order: 3 },

        // Accessibility
        { code: 'SECTION508', name: 'Section 508', description: 'Federal accessibility requirements for ICT', category: 'accessibility', is_default: true, sort_order: 1 },
        { code: 'WCAG21', name: 'WCAG 2.1', description: 'Web Content Accessibility Guidelines', category: 'accessibility', sort_order: 2 },

        // Industry-Specific
        { code: 'HIPAA', name: 'Health Insurance Portability and Accountability Act', description: 'Healthcare information privacy and security', category: 'industry', agency_specific: true, target_agencies: ['3'], sort_order: 1 },
        { code: 'ITAR', name: 'International Traffic in Arms Regulations', description: 'Export control regulations for defense articles', category: 'industry', agency_specific: true, target_agencies: ['1'], sort_order: 2 },
        { code: 'EAR', name: 'Export Administration Regulations', description: 'Export control regulations for dual-use items', category: 'industry', sort_order: 3 }
      ];

      for (const framework of frameworks) {
        await client.query(`
          INSERT INTO compliance_frameworks (code, name, description, category_id, agency_specific, target_agencies, is_default, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category_id = EXCLUDED.category_id,
            agency_specific = EXCLUDED.agency_specific,
            target_agencies = EXCLUDED.target_agencies,
            is_default = EXCLUDED.is_default,
            sort_order = EXCLUDED.sort_order,
            updated_at = CURRENT_TIMESTAMP
        `, [
          framework.code,
          framework.name,
          framework.description,
          categoryIds[framework.category],
          framework.agency_specific || false,
          framework.target_agencies || null,
          framework.is_default || false,
          framework.sort_order
        ]);
      }

      // Insert agency mappings (smart defaults)
      const agencyMappings = [
        // Department of Defense
        { agency_id: '1', agency_name: 'Department of Defense (DoD)', frameworks: ['FAR', 'DFARS', 'FISMA', 'CMMC', 'NIST_CSF', 'SECTION508', 'ITAR'] },
        // Department of Homeland Security
        { agency_id: '2', agency_name: 'Department of Homeland Security (DHS)', frameworks: ['FAR', 'FISMA', 'NIST_CSF', 'FEDRAMP', 'SECTION508'] },
        // Department of Health and Human Services
        { agency_id: '3', agency_name: 'Department of Health and Human Services (HHS)', frameworks: ['FAR', 'FISMA', 'SECTION508', 'HIPAA', 'SOC2'] },
        // Department of Energy
        { agency_id: '4', agency_name: 'Department of Energy (DOE)', frameworks: ['FAR', 'FISMA', 'NIST_CSF', 'SECTION508', 'NIST800_53'] },
        // General Services Administration
        { agency_id: '8', agency_name: 'General Services Administration (GSA)', frameworks: ['FAR', 'GSA_SCHEDULES', 'FISMA', 'FEDRAMP', 'SECTION508'] }
      ];

      for (const mapping of agencyMappings) {
        for (let i = 0; i < mapping.frameworks.length; i++) {
          const frameworkCode = mapping.frameworks[i];
          const priority = i + 1; // First frameworks have higher priority
          const isDefault = i < 3; // First 3 are defaults

          await client.query(`
            INSERT INTO agency_compliance_mappings (agency_id, agency_name, framework_id, is_default, priority, reason)
            SELECT $1, $2, f.id, $3, $4, $5
            FROM compliance_frameworks f
            WHERE f.code = $6
            ON CONFLICT (agency_id, framework_id) DO UPDATE SET
              is_default = EXCLUDED.is_default,
              priority = EXCLUDED.priority,
              reason = EXCLUDED.reason,
              updated_at = CURRENT_TIMESTAMP
          `, [
            mapping.agency_id,
            mapping.agency_name,
            isDefault,
            priority,
            `Standard compliance requirement for ${mapping.agency_name}`,
            frameworkCode
          ]);
        }
      }

      await client.query('COMMIT');
      logger.info('Compliance framework default data seeded successfully');

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error seeding compliance framework data:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all compliance framework categories
   */
  async getCategories() {
    try {
      const result = await this.pool.query(`
        SELECT * FROM compliance_categories
        WHERE is_active = true
        ORDER BY sort_order, name
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching compliance categories:', error);
      throw error;
    }
  }

  /**
   * Get compliance frameworks organized by category
   */
  async getFrameworksByCategory() {
    try {
      const result = await this.pool.query(`
        SELECT
          c.id as category_id,
          c.name as category_name,
          c.display_name as category_display_name,
          c.description as category_description,
          c.color_code as category_color,
          c.sort_order as category_sort_order,
          f.id,
          f.code,
          f.name,
          f.description,
          f.agency_specific,
          f.target_agencies,
          f.is_default,
          f.sort_order,
          f.documentation_url,
          f.version,
          f.effective_date
        FROM compliance_categories c
        LEFT JOIN compliance_frameworks f ON c.id = f.category_id AND f.is_active = true
        WHERE c.is_active = true
        ORDER BY c.sort_order, c.name, f.sort_order, f.name
      `);

      const categorized = {};
      result.rows.forEach(row => {
        const categoryKey = row.category_name;

        if (!categorized[categoryKey]) {
          categorized[categoryKey] = {
            id: row.category_id,
            name: row.category_name,
            displayName: row.category_display_name,
            description: row.category_description,
            colorCode: row.category_color,
            sortOrder: row.category_sort_order,
            frameworks: []
          };
        }

        if (row.id) { // Only add if framework exists
          categorized[categoryKey].frameworks.push({
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description,
            agencySpecific: row.agency_specific,
            targetAgencies: row.target_agencies,
            isDefault: row.is_default,
            sortOrder: row.sort_order,
            documentationUrl: row.documentation_url,
            version: row.version,
            effectiveDate: row.effective_date
          });
        }
      });

      return categorized;
    } catch (error) {
      logger.error('Error fetching frameworks by category:', error);
      throw error;
    }
  }

  /**
   * Get frameworks suggested for specific agency
   */
  async getFrameworksForAgency(agencyId, departmentId = null) {
    try {
      const result = await this.pool.query(`
        SELECT
          f.id,
          f.code,
          f.name,
          f.description,
          c.name as category_name,
          c.display_name as category_display_name,
          c.color_code as category_color,
          m.is_default,
          m.priority,
          m.reason
        FROM compliance_frameworks f
        JOIN compliance_categories c ON f.category_id = c.id
        LEFT JOIN agency_compliance_mappings m ON f.id = m.framework_id AND m.agency_id = $1
        WHERE f.is_active = true AND c.is_active = true
        AND (
          m.agency_id IS NOT NULL OR
          f.is_default = true OR
          f.agency_specific = false OR
          f.target_agencies IS NULL OR
          $1 = ANY(f.target_agencies)
        )
        ORDER BY
          CASE WHEN m.is_default THEN 0 ELSE 1 END,
          m.priority NULLS LAST,
          c.sort_order,
          f.sort_order,
          f.name
      `, [agencyId]);

      return result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        categoryName: row.category_name,
        categoryDisplayName: row.category_display_name,
        categoryColor: row.category_color,
        isDefault: row.is_default || false,
        priority: row.priority || 999,
        reason: row.reason
      }));
    } catch (error) {
      logger.error('Error fetching frameworks for agency:', error);
      throw error;
    }
  }

  /**
   * Save project compliance frameworks
   */
  async saveProjectCompliance(projectId, frameworkIds, requiredFrameworkIds = []) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing mappings
      await client.query(
        'DELETE FROM project_compliance_frameworks WHERE project_id = $1',
        [projectId]
      );

      // Insert new mappings
      for (const frameworkId of frameworkIds) {
        const isRequired = requiredFrameworkIds.includes(frameworkId);
        await client.query(`
          INSERT INTO project_compliance_frameworks (project_id, framework_id, is_required, compliance_status)
          VALUES ($1, $2, $3, 'pending')
        `, [projectId, frameworkId, isRequired]);
      }

      await client.query('COMMIT');
      logger.info(`Saved compliance frameworks for project ${projectId}`);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error saving project compliance:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get project compliance frameworks
   */
  async getProjectCompliance(projectId) {
    try {
      const result = await this.pool.query(`
        SELECT
          pcf.*,
          f.code,
          f.name,
          f.description,
          c.name as category_name,
          c.display_name as category_display_name,
          c.color_code as category_color
        FROM project_compliance_frameworks pcf
        JOIN compliance_frameworks f ON pcf.framework_id = f.id
        JOIN compliance_categories c ON f.category_id = c.id
        WHERE pcf.project_id = $1
        ORDER BY c.sort_order, f.sort_order, f.name
      `, [projectId]);

      return result.rows.map(row => ({
        id: row.id,
        frameworkId: row.framework_id,
        code: row.code,
        name: row.name,
        description: row.description,
        categoryName: row.category_name,
        categoryDisplayName: row.category_display_name,
        categoryColor: row.category_color,
        isRequired: row.is_required,
        complianceStatus: row.compliance_status,
        evidenceProvided: row.evidence_provided,
        notes: row.notes,
        assignedTo: row.assigned_to,
        dueDate: row.due_date
      }));
    } catch (error) {
      logger.error('Error fetching project compliance:', error);
      throw error;
    }
  }

  /**
   * Admin methods for managing frameworks
   */
  async createFramework(data) {
    try {
      const result = await this.pool.query(`
        INSERT INTO compliance_frameworks (code, name, description, category_id, agency_specific, target_agencies, documentation_url, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [data.code, data.name, data.description, data.categoryId, data.agencySpecific, data.targetAgencies, data.documentationUrl, data.version]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating compliance framework:', error);
      throw error;
    }
  }

  async updateFramework(id, data) {
    try {
      const result = await this.pool.query(`
        UPDATE compliance_frameworks
        SET name = $2, description = $3, category_id = $4, agency_specific = $5,
            target_agencies = $6, documentation_url = $7, version = $8, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id, data.name, data.description, data.categoryId, data.agencySpecific, data.targetAgencies, data.documentationUrl, data.version]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating compliance framework:', error);
      throw error;
    }
  }

  async deleteFramework(id) {
    try {
      await this.pool.query('UPDATE compliance_frameworks SET is_active = false WHERE id = $1', [id]);
      logger.info(`Deactivated compliance framework ${id}`);
    } catch (error) {
      logger.error('Error deleting compliance framework:', error);
      throw error;
    }
  }
}

module.exports = ComplianceFramework;