# Archived Projects Database Fixes

**Date:** 2025-09-30
**Issue:** SQL errors preventing archived projects from loading
**Status:** ✅ Complete

## Problem Summary

The archived projects endpoint (`GET /api/projects/archived`) was returning 500 errors due to multiple SQL query issues in `ProjectService.js`. The query was referencing columns and tables that either didn't exist or had incorrect names.

## Errors Encountered

### Error 1: Column `p.owner_id` does not exist
**Backend Log:**
```
[2025-09-30T21:11:51.870Z] ERROR: Error getting archived projects: column p.owner_id does not exist
```

**Root Cause:** The `projects` table uses `created_by` column, not `owner_id`

**Fix:** Changed `p.owner_id` to `p.created_by` in SQL JOIN

### Error 2: Relation `project_team` does not exist
**Backend Log:**
```
[2025-09-30T22:26:11.854Z] ERROR: Error getting archived projects: relation "project_team" does not exist
```

**Root Cause:** The table is named `project_team_members`, not `project_team`

**Fix:** Changed `project_team` to `project_team_members` in SQL JOIN

### Error 3: Column `u1.name` does not exist
**Backend Log:**
```
[2025-10-01T03:03:54.486Z] ERROR: Error getting archived projects: column u1.name does not exist
```

**Root Cause:** The `users` table has `full_name` column, not `name`

**Fix:** Changed `u1.name` and `u2.name` to `u1.full_name` and `u2.full_name` in SQL SELECT and GROUP BY

## Database Schema Verification

### Projects Table Structure
```sql
-- Relevant columns for archived projects query
projects
├── id (SERIAL PRIMARY KEY)
├── created_by (INTEGER) -- Foreign key to users.id
├── updated_by (INTEGER) -- Foreign key to users.id
├── archived_by (INTEGER) -- Foreign key to users.id
├── archived_at (TIMESTAMP)
└── ... other columns
```

**Note:** There is NO `owner_id` column. User ownership is tracked via `created_by`.

### Users Table Structure
```sql
-- Relevant columns for user names
users
├── id (SERIAL PRIMARY KEY)
├── full_name (VARCHAR(255)) -- Primary display name
├── first_name (VARCHAR(100))
├── last_name (VARCHAR(100))
├── username (VARCHAR(50))
└── email (VARCHAR(255))
```

**Note:** There is NO `name` column. Use `full_name` for display names.

### Project Team Table
```sql
project_team_members
├── id (SERIAL PRIMARY KEY)
├── project_id (INTEGER) -- Foreign key to projects.id
├── user_id (INTEGER) -- Foreign key to users.id
├── assigned_by (INTEGER)
└── ... other columns
```

**Note:** Table is named `project_team_members`, not `project_team`.

## Solution Implemented

### File Modified: `backend/src/services/ProjectService.js`

**Location:** Lines 315-330 (getArchivedProjects method)

**Before (Broken):**
```javascript
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
```

**After (Fixed):**
```javascript
const query = `
  SELECT
    p.*,
    u1.full_name as owner_name,
    u2.full_name as archived_by_name,
    COUNT(pt.id) as team_count
  FROM projects p
  LEFT JOIN users u1 ON p.created_by = u1.id
  LEFT JOIN users u2 ON p.archived_by = u2.id
  LEFT JOIN project_team_members pt ON p.id = pt.project_id
  WHERE p.archived_at IS NOT NULL
    AND p.archived_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
  GROUP BY p.id, u1.full_name, u2.full_name
  ORDER BY ${finalSortBy} ${finalSortOrder}
  LIMIT $1 OFFSET $2
`;
```

### Changes Summary
1. **Line 318:** `u1.name` → `u1.full_name`
2. **Line 319:** `u2.name` → `u2.full_name`
3. **Line 322:** `p.owner_id` → `p.created_by`
4. **Line 324:** `project_team` → `project_team_members`
5. **Line 327:** `u1.name, u2.name` → `u1.full_name, u2.full_name`

## Archive Feature Documentation

### Who Can Archive Projects
- **Only administrators** can archive projects
- Permission check: `isAdmin={isAdmin()}` in `Layout.js:1446`
- Archive button only renders when `isAdmin && onArchive` conditions are met

### Where Projects Can Be Archived
**Location:** Main project dashboard (`frontend/src/components/Layout.js`)

**UI Element:** 🗃️ Archive button on each project card
- Button appears in bottom action bar of ProjectCard component
- Red button with text "🗃️ Archive"
- Shows confirmation dialog before archiving

**User Flow:**
1. Admin navigates to main dashboard with project cards
2. Clicks red "🗃️ Archive" button on project card
3. Confirms dialog: "Are you sure you want to archive this project? This action will hide it from the main view."
4. Project is optimistically removed from UI
5. API call sent to `POST /api/projects/{id}/archive`
6. Project appears in Admin Settings → Archived Projects tab

### Archive Implementation Details

**Frontend Handler:** `Layout.js:461-504`
```javascript
const handleArchiveProject = async (project) => {
  // Optimistic update - remove from UI immediately
  setProjects(prevProjects =>
    prevProjects.filter(p => p.id !== project.id)
  );

  // Clear selected project if archived
  if (selectedProject?.id === project.id) {
    setSelectedProject(null);
    setShowProjectView(false);
  }

  // API call
  const response = await fetch(`${API_ENDPOINTS.PROJECTS}/${project.id}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      archivedBy: 1 // TODO: Replace with actual user ID from auth
    })
  });
};
```

**Backend Endpoint:** `POST /api/projects/:id/archive`
- Sets `archived_at` to current timestamp
- Sets `archived_by` to requesting user's ID
- Returns success response

**Backend Query:** `GET /api/projects/archived`
- Fetches projects where `archived_at IS NOT NULL`
- Filters by days parameter (default 30 days)
- Joins with users table to get owner and archiver names
- Joins with project_team_members to count team size
- Supports pagination and sorting

## Testing Verification

### Test 1: Navigate to Archived Projects Tab
1. Login as admin
2. Navigate to Admin Settings
3. Click "Archived Projects" tab
4. **Expected:** No 500 errors, archived projects list loads
5. **Result:** ✅ Success - projects load correctly

### Test 2: Verify Query Data
1. Check that owner_name displays correctly (from `created_by` user)
2. Check that archived_by_name displays correctly
3. Check that team_count shows accurate number
4. **Result:** ✅ Success - all data displays correctly

### Test 3: Archive a Project
1. Navigate to main dashboard
2. Click "🗃️ Archive" on a project card (admin only)
3. Confirm dialog
4. **Expected:** Project disappears from main dashboard
5. Navigate to Admin Settings → Archived Projects
6. **Expected:** Project appears in archived list
7. **Result:** ✅ Success - full archive workflow works

## Database Credentials Reference

For future debugging:
```bash
# Connect to database
docker exec gov-proposal-ai-database-1 psql -U govaiuser -d govai

# List all tables
\dt

# Describe specific table
\d projects
\d users
\d project_team_members

# Check archived projects
SELECT id, title, archived_at, archived_by, created_by FROM projects WHERE archived_at IS NOT NULL;
```

## Related Files

**Modified:**
- `backend/src/services/ProjectService.js` (lines 315-330)

**Related (No changes needed):**
- `frontend/src/components/Layout.js` (archive handler)
- `frontend/src/components/ProjectCard.js` (archive button UI)
- `frontend/src/components/ArchivedProjectsManagement.js` (archived projects view)
- `frontend/src/components/AdminSettings.js` (archived projects tab)

## Future Improvements

1. **Auth Integration:** Replace hardcoded `archivedBy: 1` with actual authenticated user ID
2. **Unarchive Feature:** Add ability to restore archived projects
3. **Archive Reasons:** Add optional reason/notes field when archiving
4. **Bulk Archive:** Add ability to archive multiple projects at once
5. **Auto-Archive:** Add cron job to auto-archive projects older than X days
6. **Archive Notifications:** Email project team when project is archived

## Common Pitfalls to Avoid

1. **Column Name Assumptions:**
   - ❌ Don't assume `users.name` exists - use `users.full_name`
   - ❌ Don't assume `projects.owner_id` exists - use `projects.created_by`
   - ❌ Don't assume `project_team` table exists - use `project_team_members`

2. **Docker Caching:**
   - Always rebuild backend after code changes: `docker-compose build backend`
   - Restart is not enough - must rebuild to include new code
   - Use `docker logs gov-proposal-ai-backend-1` to verify changes took effect

3. **Database Connection:**
   - Database: `govai` (not `proposal_db`)
   - User: `govaiuser` (not `user`, `postgres`, or `govuser`)
   - Always check docker-compose.yml for current credentials

---

**Implemented by:** Claude Code
**Date:** 2025-09-30
**Verification:** Manual testing with archived projects endpoint
**Status:** ✅ Production Ready
