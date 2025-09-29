# Enhanced Project CRUD System Design & Implementation

**Date**: September 25, 2025
**Status**: 🚀 **IN PROGRESS** - Designing enhanced project management system
**Priority**: High - Core infrastructure for team collaboration

---

## 🎯 **CURRENT SYSTEM ANALYSIS**

### ✅ **What Currently Exists**
- **Basic Project Creation**: `createProjectFolder()` method in DocumentManagerService
- **Project Listing**: `listProjects()` method with basic metadata
- **File System Based**: Projects stored as folders with `_project.json` metadata files
- **Document Association**: Projects linked to document uploads
- **Simple Structure**: Name, description, creation/modification dates

### 🚀 **What We Need to Build**
Based on your comprehensive requirements specification:

#### **Core Project Fields (Enhanced)**
- **Basic Info**: Title, description, status, due dates ✅ (partially exists)
- **Organization**: Agency hierarchy, department classification 🔄 **NEW**
- **Team Management**: Role assignments, permissions, access levels 🔄 **NEW**
- **Documentation**: Associated documents, templates, references ✅ (exists)
- **Compliance**: Requirement tracking, validation status 🔄 **NEW**
- **Analytics**: Usage metrics, progress tracking, performance data 🔄 **NEW**

#### **Team Management System (NEW)**
6 Project Roles with granular permissions:
- **Proposal Lead**: Overall project management and coordination
- **Writer**: Content creation and document drafting
- **Solutions Architect**: Technical approach and architecture
- **Reviewer**: Quality assurance and compliance checking
- **Subject Matter Expert**: Domain expertise and consultation
- **Compliance Officer**: Regulatory and requirement oversight

#### **Agency Hierarchy System (NEW)**
Multi-level classification:
- **Cabinet Level**: Department (e.g., Department of Defense)
- **Agency Level**: Agency (e.g., Army, Navy, Air Force)
- **Sub-Agency**: Directorate/Command level
- **Program Office**: Specific program or project office

---

## 🏗️ **ENHANCED PROJECT CRUD DESIGN**

### **1. Database Schema Architecture**

#### **A. Projects Table (Enhanced)**
```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Status and Timeline
  status VARCHAR(50) DEFAULT 'active',
  due_date TIMESTAMP,
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completion_date TIMESTAMP,

  -- Agency Hierarchy
  department_id INTEGER REFERENCES departments(id),
  agency_id INTEGER REFERENCES agencies(id),
  sub_agency_id INTEGER REFERENCES sub_agencies(id),
  program_office_id INTEGER REFERENCES program_offices(id),

  -- Project Classification
  project_type VARCHAR(100), -- RFP Response, Past Performance, Internal
  classification_level VARCHAR(50), -- Public, Internal, Confidential
  priority_level INTEGER DEFAULT 3, -- 1-5 scale

  -- Financial and Metrics
  estimated_value DECIMAL(12,2),
  contract_vehicle VARCHAR(100),
  client_poc_name VARCHAR(100),
  client_poc_email VARCHAR(100),

  -- Compliance Integration
  compliance_framework VARCHAR(100),
  compliance_score DECIMAL(5,2),
  last_compliance_check TIMESTAMP,

  -- Analytics
  progress_percentage INTEGER DEFAULT 0,
  health_status VARCHAR(50) DEFAULT 'green', -- green, yellow, red
  team_size INTEGER DEFAULT 1,
  document_count INTEGER DEFAULT 0,

  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP,
  archived_by INTEGER REFERENCES users(id)
);
```

#### **B. Team Management Tables**
```sql
-- Project team assignments
CREATE TABLE project_team_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  role_id INTEGER REFERENCES project_roles(id),

  -- Permissions and Access
  can_edit_documents BOOLEAN DEFAULT false,
  can_manage_team BOOLEAN DEFAULT false,
  can_view_compliance BOOLEAN DEFAULT true,
  can_approve_changes BOOLEAN DEFAULT false,

  -- Timeline
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER REFERENCES users(id),
  removed_at TIMESTAMP,
  removed_by INTEGER REFERENCES users(id),

  UNIQUE(project_id, user_id) -- One role per user per project
);

-- Project roles definition
CREATE TABLE project_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  permission_level INTEGER, -- 1-6 hierarchy level
  default_permissions JSONB, -- JSON object with permission defaults
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **C. Agency Hierarchy Tables**
```sql
-- Department level (Cabinet)
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  abbreviation VARCHAR(20),
  description TEXT,
  website_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agency level
CREATE TABLE agencies (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id),
  name VARCHAR(200) NOT NULL,
  abbreviation VARCHAR(20),
  description TEXT,
  parent_agency_id INTEGER REFERENCES agencies(id), -- For nested agencies
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sub-agency level
CREATE TABLE sub_agencies (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER REFERENCES agencies(id),
  name VARCHAR(200) NOT NULL,
  abbreviation VARCHAR(20),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Program office level
CREATE TABLE program_offices (
  id SERIAL PRIMARY KEY,
  sub_agency_id INTEGER REFERENCES sub_agencies(id),
  name VARCHAR(200) NOT NULL,
  abbreviation VARCHAR(20),
  description TEXT,
  poc_name VARCHAR(100),
  poc_email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **D. Project Analytics Tables**
```sql
-- Project activity tracking
CREATE TABLE project_activities (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  user_id INTEGER REFERENCES users(id),
  activity_type VARCHAR(100), -- document_uploaded, member_added, status_changed
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project metrics snapshots
CREATE TABLE project_metrics (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  metric_date DATE,

  -- Progress metrics
  documents_count INTEGER,
  team_members_count INTEGER,
  compliance_score DECIMAL(5,2),
  progress_percentage INTEGER,

  -- Activity metrics
  documents_added_week INTEGER,
  team_activity_score INTEGER, -- 0-100
  last_major_activity TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **2. Service Layer Architecture**

#### **A. Enhanced ProjectService**
```javascript
class ProjectService {
  // Core CRUD operations
  async createProject(projectData, createdBy)
  async updateProject(projectId, updates, updatedBy)
  async deleteProject(projectId, deletedBy)
  async getProject(projectId)
  async listProjects(filters, pagination)

  // Team management
  async addTeamMember(projectId, userId, roleId, permissions, assignedBy)
  async removeTeamMember(projectId, userId, removedBy)
  async updateMemberRole(projectId, userId, newRoleId, updatedBy)
  async getProjectTeam(projectId)

  // Agency hierarchy
  async setProjectHierarchy(projectId, hierarchyData)
  async getProjectHierarchy(projectId)
  async getHierarchyOptions() // Get dropdown options

  // Analytics and reporting
  async getProjectAnalytics(projectId, timeRange)
  async updateProjectMetrics(projectId)
  async getProjectHealth(projectId)
  async getTeamPerformance(projectId)
}
```

#### **B. AgencyHierarchyService**
```javascript
class AgencyHierarchyService {
  // Hierarchy management
  async getDepartments()
  async getAgenciesByDepartment(departmentId)
  async getSubAgenciesByAgency(agencyId)
  async getProgramOfficesBySubAgency(subAgencyId)

  // Search and filtering
  async searchHierarchy(query)
  async getFullHierarchyPath(programOfficeId)

  // Administration
  async createDepartment(data)
  async createAgency(data)
  async createSubAgency(data)
  async createProgramOffice(data)
}
```

#### **C. ProjectAnalyticsService**
```javascript
class ProjectAnalyticsService {
  // Metrics calculation
  async calculateProjectHealth(projectId)
  async updateProgressMetrics(projectId)
  async generateProjectReport(projectId, format)

  // Team analytics
  async getTeamProductivity(projectId, timeRange)
  async getActivityTimeline(projectId)
  async getCollaborationMetrics(projectId)

  // Compliance integration
  async getComplianceMetrics(projectId)
  async updateComplianceScore(projectId, score)
}
```

### **3. API Endpoints Design**

#### **A. Project CRUD APIs**
```javascript
// Core project operations
POST   /api/projects                 - Create new project
GET    /api/projects                 - List projects with filtering/pagination
GET    /api/projects/:id            - Get specific project
PUT    /api/projects/:id            - Update project
DELETE /api/projects/:id            - Archive project

// Advanced project operations
POST   /api/projects/:id/duplicate   - Duplicate project structure
POST   /api/projects/:id/archive     - Archive project
POST   /api/projects/:id/restore     - Restore archived project
GET    /api/projects/:id/export      - Export project data
```

#### **B. Team Management APIs**
```javascript
// Team member management
GET    /api/projects/:id/team        - Get project team
POST   /api/projects/:id/team        - Add team member
PUT    /api/projects/:id/team/:userId - Update member role/permissions
DELETE /api/projects/:id/team/:userId - Remove team member

// Role management
GET    /api/project-roles            - Get available project roles
POST   /api/project-roles            - Create custom role (admin)
PUT    /api/project-roles/:id        - Update role permissions (admin)
```

#### **C. Agency Hierarchy APIs**
```javascript
// Hierarchy navigation
GET    /api/hierarchy/departments     - Get all departments
GET    /api/hierarchy/agencies/:deptId - Get agencies by department
GET    /api/hierarchy/search          - Search hierarchy

// Project hierarchy assignment
PUT    /api/projects/:id/hierarchy    - Set project agency hierarchy
GET    /api/projects/:id/hierarchy    - Get project hierarchy
```

#### **D. Analytics APIs**
```javascript
// Project analytics
GET    /api/projects/:id/analytics    - Get project analytics
GET    /api/projects/:id/health       - Get project health metrics
GET    /api/projects/:id/activity     - Get activity timeline
GET    /api/projects/:id/team-stats   - Get team performance stats
```

---

## 🎯 **PROJECT ROLE PERMISSIONS MATRIX**

| Role | Edit Docs | Manage Team | View Compliance | Approve Changes | Delete Project | Manage Settings |
|------|-----------|-------------|----------------|----------------|----------------|----------------|
| **Proposal Lead** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Solutions Architect** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Writer** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Reviewer** | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Subject Matter Expert** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Compliance Officer** | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |

---

## 📊 **IMPLEMENTATION PHASES**

### **Phase 1: Database Schema & Core Models (Week 1)**
1. ✅ Design database schema (Current task)
2. 🔄 Create database migration scripts
3. 🔄 Build enhanced Project model
4. 🔄 Create agency hierarchy models
5. 🔄 Build team management models

### **Phase 2: Core Project Service (Week 2)**
1. 🔄 Enhanced ProjectService with full CRUD
2. 🔄 Team management functionality
3. 🔄 Agency hierarchy integration
4. 🔄 Permission system implementation
5. 🔄 Analytics foundation

### **Phase 3: API Layer (Week 2)**
1. 🔄 Enhanced project API endpoints
2. 🔄 Team management APIs
3. 🔄 Agency hierarchy APIs
4. 🔄 Analytics APIs
5. 🔄 Search and filtering

### **Phase 4: Frontend Integration (Week 3)**
1. 🔄 Enhanced project creation/editing forms
2. 🔄 Team management interface
3. 🔄 Agency hierarchy dropdowns
4. 🔄 Project analytics dashboard
5. 🔄 Advanced project listing with filtering

### **Phase 5: Advanced Features (Week 4)**
1. 🔄 Project templates system
2. 🔄 Bulk operations
3. 🔄 Advanced analytics and reporting
4. 🔄 Integration with compliance system
5. 🔄 Performance optimization

---

## 🎯 **SUCCESS METRICS**

### **Functional Goals**
- **Team Collaboration**: 5x improvement in multi-user project management
- **Organization**: Clear agency hierarchy with 4-level classification
- **Analytics**: Real-time project health and team performance metrics
- **Compliance Integration**: Automatic compliance scoring integration
- **User Experience**: Intuitive project management with role-based permissions

### **Technical Goals**
- **Performance**: Project listing < 200ms response time
- **Scalability**: Support 100+ projects with 20+ team members each
- **Data Integrity**: Complete audit trail for all project changes
- **Integration**: Seamless integration with document management and compliance systems

---

**🚀 NEXT STEP**: Create database migration scripts and enhanced Project models

**Current Progress**: Design phase complete, ready for implementation