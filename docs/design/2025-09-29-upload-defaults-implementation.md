# Upload Document Defaults - Implementation Guide

**Document**: Upload Document Default Settings Implementation
**Date**: 2025-09-29
**Version**: 1.0
**Status**: Ready for Implementation
**Priority**: P1 - Critical Fix
**Author**: Senior Software Engineer

## Executive Summary

Set default values in all document upload modals to "Solicitation" document type with "Active" subfolder to reduce user clicks and streamline the most common workflow.

## Current State Analysis

### Problem
- Users must select document type and subfolder every time they upload
- 90% of uploads are Solicitations going to the Active folder
- Unnecessary friction in the primary user workflow

### Impact
- 2-3 extra clicks per document upload
- User frustration with repetitive selections
- Slower document processing workflow

## Implementation Plan

### Step 1: Create Centralized Defaults Configuration

Create new file: `frontend/src/utils/uploadDefaults.js`

```javascript
/**
 * Centralized upload default settings
 * These defaults optimize for the most common use case:
 * uploading active solicitation documents
 */

export const UPLOAD_DEFAULTS = {
  documentType: 'Solicitation',
  subfolder: 'Active',
  allowMultiple: true,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  acceptedFormats: '.pdf,.doc,.docx,.xls,.xlsx'
};

// Document type hierarchy with subfolders
export const DOCUMENT_HIERARCHY = {
  'Solicitation': {
    defaultSubfolder: 'Active',
    subfolders: ['Active', 'Archive', 'Draft', 'Reference']
  },
  'Proposal': {
    defaultSubfolder: 'Draft',
    subfolders: ['Draft', 'Submitted', 'Won', 'Lost']
  },
  'Past Performance': {
    defaultSubfolder: 'Current',
    subfolders: ['Current', 'Archive', 'Template']
  },
  'Supporting': {
    defaultSubfolder: 'General',
    subfolders: ['General', 'Technical', 'Management', 'Pricing']
  }
};

/**
 * Get default subfolder for a document type
 */
export const getDefaultSubfolder = (documentType) => {
  return DOCUMENT_HIERARCHY[documentType]?.defaultSubfolder || 'General';
};

/**
 * Get available subfolders for a document type
 */
export const getSubfolders = (documentType) => {
  return DOCUMENT_HIERARCHY[documentType]?.subfolders || ['General'];
};
```

### Step 2: Update Upload Modal Component

File: `frontend/src/components/DocumentUpload/UploadModal.js`

```javascript
import React, { useState, useEffect } from 'react';
import { UPLOAD_DEFAULTS, getDefaultSubfolder, getSubfolders } from '../../utils/uploadDefaults';

const UploadModal = ({ isOpen, onClose, onUpload, projectId }) => {
  // Initialize with defaults
  const [documentType, setDocumentType] = useState(UPLOAD_DEFAULTS.documentType);
  const [subfolder, setSubfolder] = useState(UPLOAD_DEFAULTS.subfolder);
  const [files, setFiles] = useState([]);

  // Update subfolder when document type changes
  useEffect(() => {
    const defaultSubfolder = getDefaultSubfolder(documentType);
    setSubfolder(defaultSubfolder);
  }, [documentType]);

  // Reset to defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setDocumentType(UPLOAD_DEFAULTS.documentType);
      setSubfolder(UPLOAD_DEFAULTS.subfolder);
      setFiles([]);
    }
  }, [isOpen]);

  const availableSubfolders = getSubfolders(documentType);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="upload-modal">
        <h2>Upload Documents</h2>

        {/* Document Type Selection - Default: Solicitation */}
        <div className="form-group">
          <label>Document Type</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="form-control"
          >
            <option value="Solicitation">Solicitation</option>
            <option value="Proposal">Proposal</option>
            <option value="Past Performance">Past Performance</option>
            <option value="Supporting">Supporting</option>
          </select>
        </div>

        {/* Subfolder Selection - Default: Active */}
        <div className="form-group">
          <label>Subfolder</label>
          <select
            value={subfolder}
            onChange={(e) => setSubfolder(e.target.value)}
            className="form-control"
          >
            {availableSubfolders.map(folder => (
              <option key={folder} value={folder}>{folder}</option>
            ))}
          </select>
        </div>

        {/* File Upload Area */}
        <div className="file-upload-area">
          <input
            type="file"
            multiple={UPLOAD_DEFAULTS.allowMultiple}
            accept={UPLOAD_DEFAULTS.acceptedFormats}
            onChange={handleFileSelect}
          />
        </div>

        {/* Selected Files Display */}
        {files.length > 0 && (
          <div className="selected-files">
            <h3>Selected Files:</h3>
            {files.map(file => (
              <div key={file.name} className="file-item">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="modal-actions">
          <button onClick={onClose} className="btn-cancel">Cancel</button>
          <button
            onClick={() => handleUpload(files, documentType, subfolder)}
            className="btn-upload"
            disabled={files.length === 0}
          >
            Upload {files.length} File{files.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </Modal>
  );
};
```

### Step 3: Update Project Document Upload Dialog

File: `frontend/src/components/ProjectDocuments/DocumentUploadDialog.js`

```javascript
import { UPLOAD_DEFAULTS } from '../../utils/uploadDefaults';

// Similar updates as UploadModal
// Ensure consistent default behavior across all upload interfaces
```

### Step 4: Find and Update Other Upload Components

```bash
# Search for all upload-related components
grep -r "documentType\|document-type\|DocumentType" frontend/src/components/
grep -r "subfolder\|sub-folder\|Subfolder" frontend/src/components/

# Components likely needing updates:
# - QuickUploadButton.js
# - DragDropUpload.js
# - BulkUploadModal.js
```

### Step 5: Update Backend to Handle Defaults

File: `backend/src/routes/documents.js`

```javascript
// Ensure backend accepts and validates default values
router.post('/upload', upload.array('files'), async (req, res) => {
  const {
    projectId,
    documentType = 'Solicitation', // Default if not provided
    subfolder = 'Active' // Default if not provided
  } = req.body;

  // Validate document type and subfolder
  const validDocumentTypes = ['Solicitation', 'Proposal', 'Past Performance', 'Supporting'];
  if (!validDocumentTypes.includes(documentType)) {
    return res.status(400).json({ error: 'Invalid document type' });
  }

  // Process upload with defaults...
});
```

## Testing Checklist

### Functional Tests
- [ ] Upload modal opens with "Solicitation" pre-selected
- [ ] Subfolder defaults to "Active" for Solicitations
- [ ] Changing document type updates subfolder to appropriate default
- [ ] Upload completes successfully with default values
- [ ] All upload entry points use same defaults

### Regression Tests
- [ ] Manual selection of other document types still works
- [ ] Manual selection of other subfolders still works
- [ ] Multiple file upload still functions
- [ ] File type validation still enforced

### User Experience Tests
- [ ] Reduced clicks from 5 to 2 for standard upload
- [ ] No confusion about pre-selected values
- [ ] Clear indication of selected defaults

## Rollback Plan

If issues arise:
1. Remove default values from state initialization
2. Revert to empty/null initial selections
3. No database changes required (UI only)

## Future Enhancements

### Phase 2: User Preference Memory
```javascript
// Store user's last selection in localStorage
const saveUserPreference = (documentType, subfolder) => {
  localStorage.setItem('uploadPreferences', JSON.stringify({
    documentType,
    subfolder,
    timestamp: Date.now()
  }));
};

// Load user's preference or use defaults
const getUserPreference = () => {
  const saved = localStorage.getItem('uploadPreferences');
  if (saved) {
    const prefs = JSON.parse(saved);
    // Use saved preference if less than 30 days old
    if (Date.now() - prefs.timestamp < 30 * 24 * 60 * 60 * 1000) {
      return prefs;
    }
  }
  return UPLOAD_DEFAULTS;
};
```

### Phase 3: Smart Defaults
- Analyze user's upload patterns
- Suggest document type based on file name
- Auto-detect solicitation numbers
- Context-aware subfolder selection

## Success Metrics

### Immediate (Week 1)
- 100% of upload modals show defaults
- 0 console errors related to defaults
- User feedback positive

### Short-term (Month 1)
- 50% reduction in time to upload
- 80% of uploads use default values
- Support tickets about upload process decrease

## Implementation Time Estimate

- **Development**: 2-3 hours
- **Testing**: 1-2 hours
- **Deployment**: 30 minutes
- **Total**: ~0.5 day

---

**Next Steps**:
1. Implement Step 1 - Create defaults configuration
2. Update primary upload modal (Step 2)
3. Propagate to all upload interfaces
4. Test thoroughly
5. Deploy to development environment