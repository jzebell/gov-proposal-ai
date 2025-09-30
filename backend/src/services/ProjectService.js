/**
 * Enhanced Project Service
 * Comprehensive project management with team collaboration, agency hierarchy, and analytics
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

class ProjectService {
  constructor(pool) {
    this.pool = pool || new Pool({
      connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'govaiuser'}:${process.env.DB_PASSWORD || 'devpass123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'govai'}`
    });
  }

  // =============================================================================
  // CORE PROJECT CRUD OPERATIONS
  // =============================================================================

  /**
   * Create a new project with comprehensive metadata
   */
  async createProject(projectData, createdBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const {
        title,
        description,
        status = 'active',
        dueDate,
        startDate,

        // Agency hierarchy
        departmentId,
        agencyId,
        subAgencyId,
        programOfficeId,

        // Project classification
        projectType = 'rfp_response',
        classificationLevel = 'internal',
        priorityLevel = 3,

        // Financial information
        estimatedValue,
        contractVehicle,
        solicitationNumber,

        // Client information
        clientPocName,
        clientPocEmail,
        clientPocPhone,
        clientOrganization,

        // Compliance
        complianceFramework,

        // Collaboration settings
        isCollaborative = true,
        maxTeamSize = 20,
        allowExternalCollaborators = false,

        // Template
        isTemplate = false,
        templateId,

        // Configuration
        configuration = {}
      } = projectData;

      // Validate required fields
      if (!title) {
        throw new Error('Project title is required');
      }

      // Insert main project record
      const projectResult = await client.query(`
        INSERT INTO projects (
          title, description, status, due_date, start_date,
          department_id, agency_id, sub_agency_id, program_office_id,
          project_type, classification_level, priority_level,
          estimated_value, contract_vehicle, solicitation_number,
          client_poc_name, client_poc_email, client_poc_phone, client_organization,
          compliance_framework,
          is_collaborative, max_team_size, allow_external_collaborators,
          is_template, template_id, configuration,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
        RETURNING *
      `, [
        title, description, status, dueDate, startDate,
        departmentId, agencyId, subAgencyId, programOfficeId,
        projectType, classificationLevel, priorityLevel,
        estimatedValue, contractVehicle, solicitationNumber,
        clientPocName, clientPocEmail, clientPocPhone, clientOrganization,
        complianceFramework,
        isCollaborative, maxTeamSize, allowExternalCollaborators,
        isTemplate, templateId, JSON.stringify(configuration),
        createdBy
      ]);

      const project = projectResult.rows[0];

      // Add creator as proposal lead
      const proposalLeadRole = await client.query(
        'SELECT id FROM project_roles WHERE name = $1',
        ['proposal_lead']
      );

      if (proposalLeadRole.rows.length > 0) {
        await client.query(`
          INSERT INTO project_team_members (project_id, user_id, role_id, assigned_by)
          VALUES ($1, $2, $3, $4)
        `, [project.id, createdBy, proposalLeadRole.rows[0].id, createdBy]);
      }

      // Log project creation activity
      await this.logActivity(
        project.id,
        createdBy,
        'project_created',
        'project',
        `Project "${title}" created`,
        { projectType, priorityLevel },
        null,
        { title, status, projectType },
        client
      );

      // Initialize project metrics
      await this.initializeProjectMetrics(project.id, client);

      await client.query('COMMIT');

      logger.info(`Project created: ${title} (ID: ${project.id})`);

      return await this.getProject(project.id);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Error creating project: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update project with change tracking
   */
  async updateProject(projectId, updates, updatedBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get current project data for change tracking
      const currentProject = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (currentProject.rows.length === 0) {
        throw new Error('Project not found');
      }

      const oldData = currentProject.rows[0];

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      const allowedFields = [
        'title', 'description', 'status', 'due_date', 'start_date', 'completion_date',
        'department_id', 'agency_id', 'sub_agency_id', 'program_office_id',
        'project_type', 'classification_level', 'priority_level',
        'estimated_value', 'contract_vehicle', 'solicitation_number',
        'client_poc_name', 'client_poc_email', 'client_poc_phone', 'client_organization',
        'compliance_framework', 'compliance_score',
        'progress_percentage', 'health_status',
        'is_collaborative', 'max_team_size', 'allow_external_collaborators',
        'configuration'
      ];

      Object.keys(updates).forEach(key => {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbKey)) {
          updateFields.push(`${dbKey} = $${paramIndex}`);
          updateValues.push(key === 'configuration' ? JSON.stringify(updates[key]) : updates[key]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_by and updated_at
      updateFields.push(`updated_by = $${paramIndex}`, `updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(updatedBy);

      const updateQuery = `
        UPDATE projects
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex + 1}
        RETURNING *
      `;
      updateValues.push(projectId);

      const result = await client.query(updateQuery, updateValues);
      const updatedProject = result.rows[0];

      // Log update activity
      await this.logActivity(
        projectId,
        updatedBy,
        'project_updated',
        'project',
        'Project updated',
        { fieldsChanged: Object.keys(updates) },
        this.extractRelevantFields(oldData, Object.keys(updates)),
        this.extractRelevantFields(updatedProject, Object.keys(updates)),
        client
      );

      // Update metrics if progress changed
      if (updates.progressPercentage !== undefined || updates.healthStatus !== undefined) {
        await this.updateProjectMetrics(projectId, client);
      }

      await client.query('COMMIT');

      logger.info(`Project updated: ${projectId}`);

      return await this.getProject(projectId);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Error updating project: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Archive project (soft delete)
   */
  async archiveProject(projectId, archivedBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(`
        UPDATE projects
        SET status = 'archived', archived_at = CURRENT_TIMESTAMP, archived_by = $1
        WHERE id = $2 AND archived_at IS NULL
        RETURNING *
      `, [archivedBy, projectId]);

      if (result.rows.length === 0) {
        throw new Error('Project not found or already archived');
      }

      const project = result.rows[0];

      // Log archive activity
      await this.logActivity(
        projectId,
        archivedBy,
        'project_archived',
        'project',
        `Project "${project.title}" archived`,
        {},
        { status: project.status },
        { status: 'archived', archived_at: project.archived_at },
        client
      );

      await client.query('COMMIT');

      logger.info(`Project archived: ${projectId}`);

      return project;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Error archiving project: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get archived projects within specified days
   */
  async getArchivedProjects({ days = 30, pagination = {} }) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'archived_at',
      sortOrder = 'DESC'
    } = pagination;

    const validSortColumns = ['archived_at', 'title', 'project_type', 'due_date', 'archived_by'];
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'archived_at';
    const finalSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const offset = (page - 1) * limit;

    try {
      // Get archived projects from the last X days
      const query = `
        SELECT
          p.*,
          u1.name as owner_name,
          u2.name as archived_by_name,
          COUNT(pt.id) as team_count
        FROM projects p
        LEFT JOIN users u1 ON p.owner_id = u1.id
        LEFT JOIN users u2 ON p.archived_by = u2.id
        LEFT JOIN project_team pt ON p.id = pt.project_id
        WHERE p.archived_at IS NOT NULL
          AND p.archived_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
        GROUP BY p.id, u1.name, u2.name
        ORDER BY ${finalSortBy} ${finalSortOrder}
        LIMIT $1 OFFSET $2
      `;

      const result = await this.pool.query(query, [limit, offset]);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM projects
        WHERE archived_at IS NOT NULL
          AND archived_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      `;

      const countResult = await this.pool.query(countQuery);
      const totalCount = parseInt(countResult.rows[0].total);

      return {
        projects: result.rows,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        },
        filters: {
          days,
          sortBy: finalSortBy,
          sortOrder: finalSortOrder
        }
      };
    } catch (error) {
      logger.error(`Error getting archived projects: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore archived project
   */
  async restoreProject(projectId, restoredBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if project exists and is archived
      const checkResult = await client.query(`
        SELECT * FROM projects
        WHERE id = $1 AND archived_at IS NOT NULL
      `, [projectId]);

      if (checkResult.rows.length === 0) {
        throw new Error('Project not found or not archived');
      }

      const project = checkResult.rows[0];

      // Restore project by clearing archive fields and setting status back to active
      const result = await client.query(`
        UPDATE projects
        SET
          status = 'active',
          archived_at = NULL,
          archived_by = NULL,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $1
        WHERE id = $2
        RETURNING *
      `, [restoredBy, projectId]);

      const restoredProject = result.rows[0];

      // Log restore activity
      await this.logActivity(
        projectId,
        restoredBy,
        'project_restored',
        'project',
        `Project "${restoredProject.title}" restored from archive`,
        {},
        { status: 'archived', archived_at: project.archived_at },
        { status: 'active', archived_at: null },
        client
      );

      await client.query('COMMIT');

      logger.info(`Project restored: ${projectId}`);

      return restoredProject;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Error restoring project: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get project with full details including team and hierarchy
   */
  async getProject(projectId) {
    try {
      const projectResult = await this.pool.query(`
        SELECT * FROM project_summary WHERE id = $1
      `, [projectId]);

      if (projectResult.rows.length === 0) {
        throw new Error('Project not found');
      }

      const project = projectResult.rows[0];

      // Get team members
      const teamResult = await this.pool.query(`
        SELECT * FROM project_team_view WHERE project_id = $1
        ORDER BY permission_level ASC
      `, [projectId]);

      project.team = teamResult.rows;

      // Get recent activities
      const activitiesResult = await this.pool.query(`
        SELECT pa.*, u.full_name as user_name, u.email as user_email
        FROM project_activities pa
        LEFT JOIN users u ON pa.user_id = u.id
        WHERE pa.project_id = $1
        ORDER BY pa.created_at DESC
        LIMIT 10
      `, [projectId]);

      project.recentActivities = activitiesResult.rows;

      // Get project metrics
      const metricsResult = await this.pool.query(`
        SELECT * FROM project_metrics
        WHERE project_id = $1 AND metric_type = 'daily'
        ORDER BY metric_date DESC
        LIMIT 1
      `, [projectId]);

      project.currentMetrics = metricsResult.rows[0] || null;

      return project;

    } catch (error) {
      logger.error(`Error getting project: ${error.message}`);
      throw error;
    }
  }

  /**
   * List projects with advanced filtering and pagination
   */
  async listProjects(filters = {}, pagination = {}) {
    try {
      const {
        status,
        projectType,
        priorityLevel,
        healthStatus,
        departmentId,
        agencyId,
        createdBy,
        search,
        dueDateRange,
        hasTeam = null
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'updated_at',
        sortOrder = 'DESC'
      } = pagination;

      // Build dynamic WHERE clause
      const conditions = ['archived_at IS NULL'];
      const params = [];
      let paramIndex = 1;

      if (status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (projectType) {
        conditions.push(`project_type = $${paramIndex}`);
        params.push(projectType);
        paramIndex++;
      }

      if (priorityLevel) {
        conditions.push(`priority_level = $${paramIndex}`);
        params.push(priorityLevel);
        paramIndex++;
      }

      if (healthStatus) {
        conditions.push(`health_status = $${paramIndex}`);
        params.push(healthStatus);
        paramIndex++;
      }

      if (departmentId) {
        conditions.push(`department_id = $${paramIndex}`);
        params.push(departmentId);
        paramIndex++;
      }

      if (agencyId) {
        conditions.push(`agency_id = $${paramIndex}`);
        params.push(agencyId);
        paramIndex++;
      }

      if (createdBy) {
        conditions.push(`created_by = $${paramIndex}`);
        params.push(createdBy);
        paramIndex++;
      }

      if (search) {
        conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (dueDateRange && dueDateRange.start && dueDateRange.end) {
        conditions.push(`due_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        params.push(dueDateRange.start, dueDateRange.end);
        paramIndex += 2;
      }

      if (hasTeam !== null) {
        if (hasTeam) {
          conditions.push(`team_size > 1`);
        } else {
          conditions.push(`team_size <= 1`);
        }
      }

      // Build main query
      const offset = (page - 1) * limit;
      const allowedSortColumns = ['title', 'created_at', 'updated_at', 'due_date', 'status', 'priority_level', 'progress_percentage'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'updated_at';
      const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const query = `
        SELECT p.*, u.email as created_by_email, u.full_name as created_by_name
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.${conditions.join(' AND p.')}
        ORDER BY p.${safeSortBy} ${safeSortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const result = await this.pool.query(query, params);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total FROM projects
        WHERE ${conditions.join(' AND ')}
      `;

      const countResult = await this.pool.query(countQuery, params.slice(0, -2)); // Remove LIMIT and OFFSET params

      return {
        projects: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          page: page,
          limit: limit,
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      };

    } catch (error) {
      logger.error(`Error listing projects: ${error.message}`);
      throw error;
    }
  }

  // =============================================================================
  // TEAM MANAGEMENT
  // =============================================================================

  /**
   * Add team member to project
   */
  async addTeamMember(projectId, userId, roleId, customPermissions = null, assignedBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if user is already on the team
      const existingMember = await client.query(`
        SELECT id FROM project_team_members
        WHERE project_id = $1 AND user_id = $2 AND removed_at IS NULL
      `, [projectId, userId]);

      if (existingMember.rows.length > 0) {
        throw new Error('User is already a member of this project');
      }

      // Check project team size limit
      const project = await client.query('SELECT max_team_size, team_size FROM projects WHERE id = $1', [projectId]);
      if (project.rows.length === 0) {
        throw new Error('Project not found');
      }

      const { max_team_size, team_size } = project.rows[0];
      if (team_size >= max_team_size) {
        throw new Error(`Project has reached maximum team size of ${max_team_size}`);
      }

      // Insert team member
      const insertFields = ['project_id', 'user_id', 'role_id', 'assigned_by'];
      const insertValues = [projectId, userId, roleId, assignedBy];
      let paramIndex = 5;

      // Add custom permissions if provided
      const permissionFields = [
        'can_edit_documents', 'can_manage_team', 'can_view_compliance',
        'can_approve_changes', 'can_delete_documents', 'can_manage_settings',
        'can_view_analytics', 'can_export_data'
      ];

      if (customPermissions) {
        permissionFields.forEach(field => {
          if (customPermissions[field] !== undefined) {
            insertFields.push(field);
            insertValues.push(customPermissions[field]);
          }
        });
      }

      const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(', ');

      const memberResult = await client.query(`
        INSERT INTO project_team_members (${insertFields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `, insertValues);

      // Update project team size
      await client.query('UPDATE projects SET team_size = team_size + 1 WHERE id = $1', [projectId]);

      // Get user and role info for logging
      const userResult = await client.query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
      const roleResult = await client.query('SELECT display_name FROM project_roles WHERE id = $1', [roleId]);

      const user = userResult.rows[0];
      const role = roleResult.rows[0];

      // Log activity
      await this.logActivity(
        projectId,
        assignedBy,
        'team_member_added',
        'team',
        `Added ${user.full_name} as ${role.display_name}`,
        { userId, roleId, userEmail: user.email },
        null,
        { teamMember: user.email, role: role.display_name },
        client
      );

      await client.query('COMMIT');

      logger.info(`Team member added: ${user.email} to project ${projectId}`);

      return memberResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Error adding team member: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove team member from project
   */
  async removeTeamMember(projectId, userId, removedBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(`
        UPDATE project_team_members
        SET removed_at = CURRENT_TIMESTAMP, removed_by = $1
        WHERE project_id = $2 AND user_id = $3 AND removed_at IS NULL
        RETURNING *
      `, [removedBy, projectId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Team member not found on this project');
      }

      // Update project team size
      await client.query('UPDATE projects SET team_size = team_size - 1 WHERE id = $1', [projectId]);

      // Get user info for logging
      const userResult = await client.query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];

      // Log activity
      await this.logActivity(
        projectId,
        removedBy,
        'team_member_removed',
        'team',
        `Removed ${user.full_name} from project`,
        { userId, userEmail: user.email },
        { teamMember: user.email, status: 'active' },
        { teamMember: user.email, status: 'removed' },
        client
      );

      await client.query('COMMIT');

      logger.info(`Team member removed: ${user.email} from project ${projectId}`);

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Error removing team member: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get project team with roles and permissions
   */
  async getProjectTeam(projectId) {
    try {
      const result = await this.pool.query(`
        SELECT * FROM project_team_view WHERE project_id = $1
        ORDER BY permission_level ASC, assigned_at ASC
      `, [projectId]);

      return result.rows;

    } catch (error) {
      logger.error(`Error getting project team: ${error.message}`);
      throw error;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Log project activity
   */
  async logActivity(projectId, userId, activityType, category, description, details = {}, oldValues = null, newValues = null, client = null) {
    const query = `
      INSERT INTO project_activities (
        project_id, user_id, activity_type, activity_category,
        description, details, old_values, new_values
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const params = [
      projectId, userId, activityType, category,
      description, JSON.stringify(details),
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null
    ];

    if (client) {
      await client.query(query, params);
    } else {
      await this.pool.query(query, params);
    }
  }

  /**
   * Initialize project metrics
   */
  async initializeProjectMetrics(projectId, client = null) {
    const query = `
      INSERT INTO project_metrics (
        project_id, metric_date, metric_type,
        documents_count, team_members_count, progress_percentage,
        documents_added_period, team_activity_score, collaboration_index
      ) VALUES ($1, CURRENT_DATE, 'daily', 0, 1, 0, 0, 100, 1.0)
    `;

    if (client) {
      await client.query(query, [projectId]);
    } else {
      await this.pool.query(query, [projectId]);
    }
  }

  /**
   * Update project metrics
   */
  async updateProjectMetrics(projectId, client = null) {
    const query = `
      UPDATE projects SET
        document_count = (SELECT COUNT(*) FROM project_documents WHERE project_id = $1 AND removed_at IS NULL),
        team_size = (SELECT COUNT(*) FROM project_team_members WHERE project_id = $1 AND removed_at IS NULL),
        last_activity = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    if (client) {
      await client.query(query, [projectId]);
    } else {
      await this.pool.query(query, [projectId]);
    }
  }

  /**
   * Extract relevant fields from object for change tracking
   */
  extractRelevantFields(obj, fields) {
    const result = {};
    fields.forEach(field => {
      const dbKey = field.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (obj[dbKey] !== undefined) {
        result[field] = obj[dbKey];
      }
    });
    return result;
  }
}

module.exports = ProjectService;