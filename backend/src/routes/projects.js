/**
 * Enhanced Project Management API Routes
 * Epic 2: Project collaboration and management endpoints
 */

const express = require('express');
const ProjectService = require('../services/ProjectService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Lazy initialization of project service
let projectService;
function getProjectService() {
  if (!projectService) {
    projectService = new ProjectService();
  }
  return projectService;
}

// =============================================================================
// REFERENCE DATA ENDPOINTS (must come before parameterized routes)
// =============================================================================

/**
 * @route GET /api/projects/roles
 * @desc Get available project roles
 * @access Public
 */
router.get('/roles', asyncHandler(async (req, res) => {
  logger.info('Getting project roles');

  const result = await getProjectService().pool.query(`
    SELECT * FROM project_roles ORDER BY permission_level ASC
  `);

  res.json({
    success: true,
    data: result.rows
  });
}));

/**
 * @route GET /api/projects/templates
 * @desc Get project templates
 * @access Public
 */
router.get('/templates', asyncHandler(async (req, res) => {
  logger.info('Getting project templates');

  const templates = {
    'rfp-response': {
      name: 'RFP Response Project',
      description: 'Standard template for responding to Request for Proposal',
      projectType: 'rfp_response',
      defaultRoles: ['proposal_lead', 'writer', 'solutions_architect', 'reviewer'],
      defaultDocuments: ['Technical Approach', 'Management Plan', 'Cost Proposal', 'Past Performance'],
      complianceFrameworks: ['FAR', 'NIST', 'SECTION508']
    },
    'past-performance': {
      name: 'Past Performance Documentation',
      description: 'Template for documenting past performance references',
      projectType: 'past_performance',
      defaultRoles: ['proposal_lead', 'writer', 'subject_matter_expert'],
      defaultDocuments: ['Project Summary', 'Client Reference', 'Performance Metrics', 'Lessons Learned'],
      complianceFrameworks: ['FAR']
    },
    'internal-research': {
      name: 'Internal Research Project',
      description: 'Template for internal research and development projects',
      projectType: 'internal',
      defaultRoles: ['proposal_lead', 'writer', 'solutions_architect'],
      defaultDocuments: ['Research Plan', 'Findings Report', 'Recommendations'],
      complianceFrameworks: []
    },
    'compliance-assessment': {
      name: 'Compliance Assessment',
      description: 'Template for regulatory compliance assessment projects',
      projectType: 'compliance',
      defaultRoles: ['compliance_officer', 'writer', 'reviewer'],
      defaultDocuments: ['Compliance Matrix', 'Gap Analysis', 'Remediation Plan'],
      complianceFrameworks: ['NIST', 'FISMA', 'SOC2', 'CMMC']
    }
  };

  res.json({
    success: true,
    data: templates
  });
}));

/**
 * @route GET /api/projects/hierarchy/departments
 * @desc Get department hierarchy options
 * @access Public
 */
router.get('/hierarchy/departments', asyncHandler(async (req, res) => {
  logger.info('Getting department hierarchy');

  const result = await getProjectService().pool.query(`
    SELECT d.*,
           COUNT(a.id) as agency_count,
           COUNT(p.id) as project_count
    FROM departments d
    LEFT JOIN agencies a ON d.id = a.department_id
    LEFT JOIN projects p ON d.id = p.department_id
    GROUP BY d.id, d.name, d.abbreviation, d.description, d.website_url, d.created_at
    ORDER BY d.name
  `);

  res.json({
    success: true,
    data: result.rows
  });
}));

/**
 * @route GET /api/projects/hierarchy/agencies/:departmentId
 * @desc Get agencies by department
 * @access Public
 */
router.get('/hierarchy/agencies/:departmentId', asyncHandler(async (req, res) => {
  const departmentId = parseInt(req.params.departmentId);

  if (isNaN(departmentId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid department ID is required'
    });
  }

  const result = await getProjectService().pool.query(`
    SELECT a.*,
           COUNT(sa.id) as sub_agency_count,
           COUNT(p.id) as project_count
    FROM agencies a
    LEFT JOIN sub_agencies sa ON a.id = sa.agency_id
    LEFT JOIN projects p ON a.id = p.agency_id
    WHERE a.department_id = $1
    GROUP BY a.id, a.department_id, a.name, a.abbreviation, a.description, a.parent_agency_id, a.created_at
    ORDER BY a.name
  `, [departmentId]);

  res.json({
    success: true,
    data: result.rows
  });
}));

/**
 * @route GET /api/projects/health
 * @desc Check project service health
 * @access Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    // Test database connection
    const result = await getProjectService().pool.query('SELECT COUNT(*) FROM projects');
    const projectCount = parseInt(result.rows[0].count);

    res.json({
      success: true,
      data: {
        available: true,
        service: 'Enhanced Project Management',
        database: 'Connected',
        totalProjects: projectCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: {
        available: false,
        service: 'Enhanced Project Management',
        database: 'Error',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}));

// =============================================================================
// CORE PROJECT CRUD ENDPOINTS
// =============================================================================

/**
 * @route POST /api/projects
 * @desc Create a new project
 * @access Public
 */
router.post('/', sanitizeInput, asyncHandler(async (req, res) => {
  const projectData = req.body;
  const createdBy = req.body.createdBy || 1; // TODO: Replace with actual user ID from auth

  if (!projectData.title) {
    return res.status(400).json({
      success: false,
      message: 'Project title is required'
    });
  }

  logger.info(`Creating new project: ${projectData.title}`);

  const result = await getProjectService().createProject(projectData, createdBy);

  res.status(201).json({
    success: true,
    data: result
  });
}));

/**
 * @route GET /api/projects
 * @desc List projects with filtering and pagination
 * @access Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    projectType: req.query.projectType,
    priorityLevel: req.query.priorityLevel ? parseInt(req.query.priorityLevel) : undefined,
    healthStatus: req.query.healthStatus,
    departmentId: req.query.departmentId ? parseInt(req.query.departmentId) : undefined,
    agencyId: req.query.agencyId ? parseInt(req.query.agencyId) : undefined,
    createdBy: req.query.createdBy ? parseInt(req.query.createdBy) : undefined,
    search: req.query.search,
    dueDateRange: req.query.dueDateStart && req.query.dueDateEnd ? {
      start: req.query.dueDateStart,
      end: req.query.dueDateEnd
    } : undefined,
    hasTeam: req.query.hasTeam !== undefined ? req.query.hasTeam === 'true' : null
  };

  const pagination = {
    page: req.query.page ? parseInt(req.query.page) : 1,
    limit: req.query.limit ? Math.min(parseInt(req.query.limit), 100) : 20,
    sortBy: req.query.sortBy || 'updated_at',
    sortOrder: req.query.sortOrder || 'DESC'
  };

  // Remove undefined filters
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });

  logger.info(`Listing projects with filters: ${JSON.stringify(filters)}`);

  const result = await getProjectService().listProjects(filters, pagination);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route GET /api/projects/archived
 * @desc Get archived projects (admin only)
 * @access Public
 */
router.get('/archived', asyncHandler(async (req, res) => {
  const {
    days = 30,
    page = 1,
    limit = 20,
    sortBy = 'archived_at',
    sortOrder = 'DESC'
  } = req.query;

  logger.info(`Getting archived projects for last ${days} days`);

  const daysInt = parseInt(days);
  const pageInt = parseInt(page);
  const limitInt = Math.min(parseInt(limit), 100);

  if (isNaN(daysInt) || daysInt < 1) {
    return res.status(400).json({
      success: false,
      message: 'Days must be a positive number'
    });
  }

  try {
    const result = await getProjectService().getArchivedProjects({
      days: daysInt,
      pagination: {
        page: pageInt,
        limit: limitInt,
        sortBy,
        sortOrder
      }
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error getting archived projects: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get archived projects'
    });
  }
}));

/**
 * @route GET /api/projects/:id
 * @desc Get specific project with full details
 * @access Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);

  if (isNaN(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid project ID is required'
    });
  }

  logger.info(`Getting project: ${projectId}`);

  const result = await getProjectService().getProject(projectId);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route PUT /api/projects/:id
 * @desc Update project
 * @access Public
 */
router.put('/:id', sanitizeInput, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const updates = req.body;
  const updatedBy = req.body.updatedBy || 1; // TODO: Replace with actual user ID from auth

  if (isNaN(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid project ID is required'
    });
  }

  // Remove updatedBy from updates to prevent it from being included in the update fields
  delete updates.updatedBy;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No fields to update provided'
    });
  }

  logger.info(`Updating project: ${projectId}`);

  const result = await getProjectService().updateProject(projectId, updates, updatedBy);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/projects/:id/archive
 * @desc Archive project (soft delete)
 * @access Public
 */
router.post('/:id/archive', sanitizeInput, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const archivedBy = req.body.archivedBy || 1; // TODO: Replace with actual user ID from auth

  if (isNaN(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid project ID is required'
    });
  }

  logger.info(`Archiving project: ${projectId}`);

  const result = await getProjectService().archiveProject(projectId, archivedBy);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/projects/:id/restore
 * @desc Restore archived project
 * @access Public
 */
router.post('/:id/restore', sanitizeInput, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const restoredBy = req.body.restoredBy || 1; // TODO: Replace with actual user ID from auth

  if (isNaN(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid project ID is required'
    });
  }

  logger.info(`Restoring archived project: ${projectId}`);

  try {
    const result = await getProjectService().restoreProject(projectId, restoredBy);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error restoring project: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore project'
    });
  }
}));

/**
 * @route POST /api/projects/:id/duplicate
 * @desc Duplicate project structure
 * @access Public
 */
router.post('/:id/duplicate', sanitizeInput, asyncHandler(async (req, res) => {
  const originalProjectId = parseInt(req.params.id);
  const createdBy = req.body.createdBy || 1; // TODO: Replace with actual user ID from auth
  const newTitle = req.body.title;

  if (isNaN(originalProjectId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid project ID is required'
    });
  }

  if (!newTitle) {
    return res.status(400).json({
      success: false,
      message: 'New project title is required'
    });
  }

  logger.info(`Duplicating project: ${originalProjectId}`);

  // Get original project
  const originalProject = await getProjectService().getProject(originalProjectId);

  // Create duplicate with new title
  const duplicateData = {
    title: newTitle,
    description: `${originalProject.description} (Copy)`,
    status: 'active',
    projectType: originalProject.project_type,
    classificationLevel: originalProject.classification_level,
    priorityLevel: originalProject.priority_level,
    departmentId: originalProject.department_id,
    agencyId: originalProject.agency_id,
    subAgencyId: originalProject.sub_agency_id,
    programOfficeId: originalProject.program_office_id,
    complianceFramework: originalProject.compliance_framework,
    isCollaborative: originalProject.is_collaborative,
    maxTeamSize: originalProject.max_team_size,
    allowExternalCollaborators: originalProject.allow_external_collaborators,
    configuration: originalProject.configuration
  };

  const result = await getProjectService().createProject(duplicateData, createdBy);

  res.status(201).json({
    success: true,
    data: result
  });
}));

// =============================================================================
// TEAM MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * @route GET /api/projects/:id/team
 * @desc Get project team members
 * @access Public
 */
router.get('/:id/team', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);

  if (isNaN(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid project ID is required'
    });
  }

  logger.info(`Getting team for project: ${projectId}`);

  const result = await getProjectService().getProjectTeam(projectId);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/projects/:id/team
 * @desc Add team member to project
 * @access Public
 */
router.post('/:id/team', sanitizeInput, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { userId, roleId, customPermissions } = req.body;
  const assignedBy = req.body.assignedBy || 1; // TODO: Replace with actual user ID from auth

  if (isNaN(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid project ID is required'
    });
  }

  if (!userId || !roleId) {
    return res.status(400).json({
      success: false,
      message: 'User ID and role ID are required'
    });
  }

  logger.info(`Adding team member ${userId} to project ${projectId}`);

  const result = await getProjectService().addTeamMember(
    projectId,
    parseInt(userId),
    parseInt(roleId),
    customPermissions,
    assignedBy
  );

  res.status(201).json({
    success: true,
    data: result
  });
}));

/**
 * @route PUT /api/projects/:id/team/:userId
 * @desc Update team member role or permissions
 * @access Public
 */
router.put('/:id/team/:userId', sanitizeInput, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const userId = parseInt(req.params.userId);
  const { roleId, customPermissions } = req.body;
  const updatedBy = req.body.updatedBy || 1; // TODO: Replace with actual user ID from auth

  if (isNaN(projectId) || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid project ID and user ID are required'
    });
  }

  logger.info(`Updating team member ${userId} in project ${projectId}`);

  // Remove and re-add team member with new role/permissions
  await getProjectService().removeTeamMember(projectId, userId, updatedBy);
  const result = await getProjectService().addTeamMember(
    projectId,
    userId,
    parseInt(roleId),
    customPermissions,
    updatedBy
  );

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route DELETE /api/projects/:id/team/:userId
 * @desc Remove team member from project
 * @access Public
 */
router.delete('/:id/team/:userId', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const userId = parseInt(req.params.userId);
  const removedBy = req.body.removedBy || 1; // TODO: Replace with actual user ID from auth

  if (isNaN(projectId) || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid project ID and user ID are required'
    });
  }

  logger.info(`Removing team member ${userId} from project ${projectId}`);

  const result = await getProjectService().removeTeamMember(projectId, userId, removedBy);

  res.json({
    success: true,
    data: result
  });
}));

// =============================================================================
// PROJECT ANALYTICS ENDPOINTS
// =============================================================================

/**
 * @route GET /api/projects/:id/analytics
 * @desc Get project analytics and metrics
 * @access Public
 */
router.get('/:id/analytics', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const timeRange = req.query.timeRange || '30d';

  if (isNaN(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid project ID is required'
    });
  }

  logger.info(`Getting analytics for project: ${projectId}`);

  // Get project metrics
  const metricsQuery = `
    SELECT
      metric_date,
      documents_count,
      team_members_count,
      progress_percentage,
      documents_added_period,
      team_activity_score,
      collaboration_index
    FROM project_metrics
    WHERE project_id = $1 AND metric_type = 'daily'
    ORDER BY metric_date DESC
    LIMIT 30
  `;

  const metricsResult = await getProjectService().pool.query(metricsQuery, [projectId]);

  // Get activity breakdown
  const activityQuery = `
    SELECT
      activity_type,
      COUNT(*) as count,
      DATE(created_at) as activity_date
    FROM project_activities
    WHERE project_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY activity_type, DATE(created_at)
    ORDER BY activity_date DESC
  `;

  const activityResult = await getProjectService().pool.query(activityQuery, [projectId]);

  const analytics = {
    metrics: metricsResult.rows,
    activityBreakdown: activityResult.rows,
    timeRange: timeRange,
    generatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: analytics
  });
}));

/**
 * @route GET /api/projects/:id/activity
 * @desc Get project activity timeline
 * @access Public
 */
router.get('/:id/activity', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 100) : 50;

  if (isNaN(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid project ID is required'
    });
  }

  logger.info(`Getting activity timeline for project: ${projectId}`);

  const result = await getProjectService().pool.query(`
    SELECT
      pa.*,
      u.full_name as user_name,
      u.email as user_email
    FROM project_activities pa
    LEFT JOIN users u ON pa.user_id = u.id
    WHERE pa.project_id = $1
    ORDER BY pa.created_at DESC
    LIMIT $2
  `, [projectId, limit]);

  res.json({
    success: true,
    data: result.rows
  });
}));

module.exports = router;