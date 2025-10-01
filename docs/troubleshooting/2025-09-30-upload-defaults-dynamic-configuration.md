# Upload Defaults Dynamic Configuration

**Date:** 2025-09-30
**Feature:** Admin-configurable upload defaults
**Status:** ✅ Complete

## Problem Summary

Upload document modals had hardcoded default values for document type and subfolder selections. There was no way for administrators to configure these defaults without modifying code.

The application needed:
- Admin UI to configure default document type (e.g., "Solicitation")
- Admin UI to configure default subfolder (e.g., "Active")
- Dynamic loading of these defaults from database
- File upload limit configuration (max size, max files)

## What Was Already Implemented ✅

**Backend:**
- API routes at `/api/upload-defaults/config` (GET and POST)
- Route handlers in `backend/src/routes/uploadDefaults.js`
- Full CRUD operations for upload configuration
- Configuration history endpoint for audit trail

**Frontend:**
- Static configuration file at `frontend/src/config/uploadDefaults.js`
- Upload modals using static `UPLOAD_DEFAULTS` constant
- Helper functions: `getDocumentTypeOptions()`, `getOrderedSubfolders()`, `getDefaultClassification()`

## What Was Missing ❌

**Database:**
- No `upload_defaults_config` table existed
- No seed data for default configuration

**Frontend:**
- Configuration was hardcoded, not fetched from API
- No admin UI component to view/edit defaults
- No integration with AdminSettings component

**Integration:**
- Upload modals couldn't dynamically update when admins changed settings
- No cache management for configuration updates

## Solution Implemented

### Change 1: Create Database Table
**File:** Database migration

```sql
CREATE TABLE IF NOT EXISTS upload_defaults_config (
  id SERIAL PRIMARY KEY,
  default_document_type VARCHAR(50) DEFAULT 'solicitation',
  default_subfolder VARCHAR(50) DEFAULT 'Active',
  document_type_order JSONB DEFAULT '[]'::jsonb,
  subfolder_order JSONB DEFAULT '[]'::jsonb,
  file_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER
);

CREATE INDEX idx_upload_defaults_updated_at ON upload_defaults_config(updated_at DESC);
```

**Seed Data:**
```sql
INSERT INTO upload_defaults_config (
  default_document_type,
  default_subfolder,
  document_type_order,
  subfolder_order,
  file_settings
) VALUES (
  'solicitation',
  'Active',
  '[
    {"value": "solicitation", "label": "Solicitation"},
    {"value": "proposal", "label": "Proposal"},
    {"value": "past_performance", "label": "Past Performance"},
    {"value": "reference", "label": "Reference"},
    {"value": "media", "label": "Media"},
    {"value": "compliance", "label": "Compliance"}
  ]'::jsonb,
  '[
    {"value": "Active", "label": "Active"},
    {"value": "Archive", "label": "Archive"},
    {"value": "Reference", "label": "Reference"},
    {"value": "Templates", "label": "Templates"},
    {"value": "Working", "label": "Working"},
    {"value": "Final", "label": "Final"}
  ]'::jsonb,
  '{
    "maxFileSize": 50,
    "maxFiles": 10,
    "allowedExtensions": [".pdf", ".doc", ".docx", ".txt", ".rtf", ".xls", ".xlsx", ".ppt", ".pptx"]
  }'::jsonb
);
```

### Change 2: Create Admin UI Component
**File:** `frontend/src/components/UploadDefaultsConfig.js`

Created new component with:
- Fetch current configuration from API on load
- Editable selects for default document type and subfolder
- Number inputs for max file size (MB) and max files per upload
- Read-only display of current document type order
- Read-only display of current subfolder order
- Save/Reset buttons with success/error messaging
- Theme-aware styling matching existing admin panels

**Key Features:**
```javascript
const fetchConfig = async () => {
  const response = await fetch(`${API_BASE_URL}/api/upload-defaults/config`);
  const data = await response.json();
  // Updates form state with current configuration
};

const handleSave = async () => {
  const response = await fetch(`${API_BASE_URL}/api/upload-defaults/config`, {
    method: 'POST',
    body: JSON.stringify({
      defaultDocumentType,
      defaultSubfolder,
      documentTypeOrder,
      subfolderOrder,
      fileSettings
    })
  });
  // Shows success/error message
};
```

### Change 3: Integrate into AdminSettings
**File:** `frontend/src/components/AdminSettings.js`

**Added Import:**
```javascript
import UploadDefaultsConfig from './UploadDefaultsConfig';
```

**Added Tab Button (after Document Types):**
```javascript
<button
  onClick={() => setActiveTab('uploadDefaults')}
  style={{
    padding: '12px 20px',
    border: 'none',
    backgroundColor: activeTab === 'uploadDefaults' ? theme.primary : 'transparent',
    color: activeTab === 'uploadDefaults' ? 'white' : theme.text,
    cursor: 'pointer',
    borderRadius: '6px 6px 0 0',
    fontSize: '14px',
    fontWeight: '600'
  }}
>
  📤 Upload Defaults
</button>
```

**Added Component Rendering:**
```javascript
{/* Upload Defaults Tab */}
{activeTab === 'uploadDefaults' && !loading && (
  <UploadDefaultsConfig theme={theme} />
)}
```

### Change 4: Make Frontend Config Dynamic
**File:** `frontend/src/config/uploadDefaults.js`

**Before:** Static hardcoded values
```javascript
export const UPLOAD_DEFAULTS = {
  defaultDocumentType: 'solicitation',
  defaultSubfolder: 'Active',
  // ... hardcoded arrays
};
```

**After:** Fetched from API with fallback
```javascript
import { API_BASE_URL } from './api';

// Fallback defaults in case API is unavailable
const FALLBACK_DEFAULTS = { /* ... */ };

// In-memory cache
let cachedDefaults = null;
let cachePromise = null;

export const fetchUploadDefaults = async () => {
  if (cachedDefaults) return cachedDefaults;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload-defaults/config`);
      const data = await response.json();

      if (data.success) {
        cachedDefaults = {
          defaultDocumentType: data.data.defaultDocumentType,
          defaultSubfolder: data.data.defaultSubfolder,
          documentTypeOrder: data.data.documentTypeOrder,
          subfolderOrder: data.data.subfolderOrder,
          fileSettings: { /* ... */ }
        };
        return cachedDefaults;
      }
    } catch (error) {
      console.warn('Failed to fetch upload defaults, using fallback:', error);
    }

    cachedDefaults = FALLBACK_DEFAULTS;
    return cachedDefaults;
  })();

  return cachePromise;
};

// Initialize with fallback, will be replaced by API call
export let UPLOAD_DEFAULTS = FALLBACK_DEFAULTS;

// Fetch defaults on module load
fetchUploadDefaults().then(defaults => {
  UPLOAD_DEFAULTS = defaults;
});
```

**Updated Helper Function:**
```javascript
export const getOrderedSubfolders = (availableSubfolders = []) => {
  const ordered = ['Active'];

  UPLOAD_DEFAULTS.subfolderOrder.forEach(folderObj => {
    const folder = typeof folderObj === 'string' ? folderObj : folderObj.value;
    if (folder !== 'Active' && availableSubfolders.includes(folder)) {
      ordered.push(folder);
    }
  });

  availableSubfolders.forEach(folder => {
    if (!ordered.includes(folder)) {
      ordered.push(folder);
    }
  });

  return ordered;
};
```

## Behavior After Implementation

### Data Flow
1. **Page Load:**
   - `uploadDefaults.js` module loads
   - Immediately fetches from `/api/upload-defaults/config`
   - Caches result in memory
   - Updates `UPLOAD_DEFAULTS` export

2. **Upload Modal Opens:**
   - `DocumentUpload` component reads `UPLOAD_DEFAULTS.defaultDocumentType`
   - Pre-selects document type (e.g., "Solicitation")
   - `DocumentUpload` reads `UPLOAD_DEFAULTS.defaultSubfolder`
   - Pre-selects subfolder (e.g., "Active")

3. **Admin Changes Configuration:**
   - Navigate to Admin Settings → Upload Defaults
   - Change default document type to "Proposal"
   - Change max file size to 100 MB
   - Click "Save Configuration"
   - POST to `/api/upload-defaults/config`
   - Database updated with new values

4. **Next Page Load:**
   - Fresh fetch from API gets new configuration
   - Upload modals now default to "Proposal" and 100 MB limit

### Admin UI Features

**Editable Settings:**
- Default Document Type (dropdown)
- Default Subfolder (dropdown)
- Max File Size in MB (number input, 1-500)
- Max Files Per Upload (number input, 1-100)

**Read-Only Information:**
- Current Document Types (in order) - displayed as chips
- Current Subfolders (in order) - displayed as chips
- Last updated timestamp

**Actions:**
- 💾 Save Configuration - Saves to database
- 🔄 Reset - Reverts form to last saved values

**Feedback:**
- Success message: "Configuration saved successfully!"
- Error message: "Failed to save configuration"
- Loading states during save operation

## Cache Behavior

**Current Implementation:**
- In-memory cache that persists for page session
- Fetched once on module load
- Subsequent imports use cached value
- Cache cleared on page reload/refresh

**Cache Invalidation:**
- Automatic: Page reload
- Manual: Not yet implemented
- Future: Could add "Reload Config" button or WebSocket updates

## Testing Verification

1. **Initial Load Test:**
   - Navigate to Admin Settings → Upload Defaults
   - Verify "Solicitation" is default document type
   - Verify "Active" is default subfolder
   - Verify max file size is 50 MB

2. **Edit Configuration Test:**
   - Change default document type to "Proposal"
   - Change default subfolder to "Archive"
   - Change max file size to 100 MB
   - Click "Save Configuration"
   - Verify success message appears

3. **Upload Modal Test:**
   - Reload page (to clear cache)
   - Open any upload modal
   - Verify "Proposal" is pre-selected (not Solicitation)
   - Verify "Archive" is pre-selected (not Active)

4. **Reset Test:**
   - Change values in form
   - Click "Reset" button
   - Verify form reverts to last saved values

5. **Fallback Test:**
   - Stop backend container
   - Reload page
   - Verify fallback defaults are used
   - No JavaScript errors in console

## Files Created/Modified

**Created:**
1. `frontend/src/components/UploadDefaultsConfig.js` - Admin UI component (360 lines)
2. Database table: `upload_defaults_config`
3. `docs/troubleshooting/2025-09-30-upload-defaults-dynamic-configuration.md` - This file

**Modified:**
1. `frontend/src/components/AdminSettings.js`
   - Added import for `UploadDefaultsConfig`
   - Added "Upload Defaults" tab button
   - Added component rendering

2. `frontend/src/config/uploadDefaults.js`
   - Converted from static export to dynamic fetch
   - Added `fetchUploadDefaults()` function
   - Added in-memory cache management
   - Updated `getOrderedSubfolders()` for object/string compatibility
   - Added fallback defaults for offline scenarios

**Unchanged (uses existing):**
- `backend/src/routes/uploadDefaults.js` - Already existed
- `backend/src/app.js` - Route already registered
- `frontend/src/components/DocumentUpload.js` - Already uses `UPLOAD_DEFAULTS`
- `frontend/src/components/UploadModal.js` - Just passes props

## Database Schema

```sql
upload_defaults_config
├── id (SERIAL PRIMARY KEY)
├── default_document_type (VARCHAR(50)) - e.g., 'solicitation'
├── default_subfolder (VARCHAR(50)) - e.g., 'Active'
├── document_type_order (JSONB) - Array of {value, label} objects
├── subfolder_order (JSONB) - Array of {value, label} objects
├── file_settings (JSONB) - {maxFileSize, maxFiles, allowedExtensions}
├── created_at (TIMESTAMP)
├── created_by (INTEGER)
├── updated_at (TIMESTAMP)
└── updated_by (INTEGER)
```

**Indexes:**
- `idx_upload_defaults_updated_at` - For fetching latest configuration

## API Endpoints

### GET `/api/upload-defaults/config`
**Purpose:** Fetch current upload configuration
**Auth:** Required (any authenticated user)
**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "defaultDocumentType": "solicitation",
    "defaultSubfolder": "Active",
    "documentTypeOrder": [
      {"value": "solicitation", "label": "Solicitation"},
      {"value": "proposal", "label": "Proposal"}
    ],
    "subfolderOrder": [
      {"value": "Active", "label": "Active"},
      {"value": "Archive", "label": "Archive"}
    ],
    "fileSettings": {
      "maxFileSize": 50,
      "maxFiles": 10,
      "allowedExtensions": [".pdf", ".doc", ".docx"]
    },
    "updatedAt": "2025-09-30T20:32:49.500621Z",
    "updatedBy": 1
  }
}
```

### POST `/api/upload-defaults/config`
**Purpose:** Update upload configuration
**Auth:** Required (admin only)
**Request Body:**
```json
{
  "defaultDocumentType": "proposal",
  "defaultSubfolder": "Archive",
  "documentTypeOrder": [...],
  "subfolderOrder": [...],
  "fileSettings": {
    "maxFileSize": 100,
    "maxFiles": 20,
    "allowedExtensions": [".pdf", ".doc", ".docx"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Upload defaults configuration saved successfully",
  "data": { /* updated configuration */ }
}
```

### GET `/api/upload-defaults/history`
**Purpose:** Get configuration change history (audit trail)
**Auth:** Required (admin only)
**Response:** Array of historical configurations

## Future Enhancements

### Potential Improvements:
1. **Cache Invalidation:**
   - Add "Reload Config" button in admin UI
   - Broadcast configuration updates via WebSocket
   - Auto-invalidate cache when admin saves changes

2. **Advanced Configuration:**
   - Per-project upload defaults
   - Role-based default configurations
   - Document type-specific file size limits

3. **Validation:**
   - Frontend validation for max file size (reasonable limits)
   - Backend validation for allowed extensions
   - Duplicate detection for document types/subfolders

4. **Reordering:**
   - Drag-and-drop to reorder document types
   - Drag-and-drop to reorder subfolders
   - Preview how upload modal will look

5. **Import/Export:**
   - Export configuration as JSON
   - Import configuration from file
   - Configuration templates/presets

## Related Documentation

- Upload defaults backend routes: `backend/src/routes/uploadDefaults.js`
- Frontend configuration module: `frontend/src/config/uploadDefaults.js`
- Admin UI component: `frontend/src/components/UploadDefaultsConfig.js`
- Document upload component: `frontend/src/components/DocumentUpload.js`

---

**Implemented by:** Senior Software Engineer
**Date:** 2025-09-30
**Verification:** Manual testing - configuration saves to database and modals use updated defaults
**Status:** ✅ Production Ready
