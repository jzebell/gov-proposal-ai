import { API_BASE_URL } from './api';

/**
 * Upload Document Default Configuration
 *
 * This configuration is fetched from the backend API and cached.
 * Admins can configure these settings through Admin Settings > Upload Defaults.
 */

// Fallback defaults in case API is unavailable
const FALLBACK_DEFAULTS = {
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
  documentClassificationDefaults: {
    solicitation: 'rfp',
    proposal: 'draft',
    past_performance: 'current',
    reference: 'general',
    media: 'public',
    compliance: 'active'
  },
  fileSettings: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    allowedExtensions: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf'
  }
};

// In-memory cache of upload defaults
let cachedDefaults = null;
let cachePromise = null;

/**
 * Fetch upload defaults from backend API
 * Uses in-memory cache to avoid repeated API calls
 */
export const fetchUploadDefaults = async () => {
  // Return cached value if available
  if (cachedDefaults) {
    return cachedDefaults;
  }

  // Return existing promise if fetch is in progress
  if (cachePromise) {
    return cachePromise;
  }

  // Start new fetch
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
          fileSettings: {
            maxFileSize: (data.data.fileSettings?.maxFileSize || 50) * 1024 * 1024,
            maxFiles: data.data.fileSettings?.maxFiles || 10,
            allowedExtensions: (data.data.fileSettings?.allowedExtensions || []).join(',')
          },
          documentClassificationDefaults: FALLBACK_DEFAULTS.documentClassificationDefaults
        };
        return cachedDefaults;
      }
    } catch (error) {
      console.warn('Failed to fetch upload defaults, using fallback:', error);
    }

    // Use fallback if API fails
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

/**
 * Get ordered document types for dropdown
 * In the future, this will pull from admin configuration
 */
export const getDocumentTypeOptions = () => {
  return UPLOAD_DEFAULTS.documentTypeOrder;
};

/**
 * Get ordered subfolders, ensuring Active is always first
 * @param {Array} availableSubfolders - Subfolders from backend
 * @returns {Array} Ordered subfolder list
 */
export const getOrderedSubfolders = (availableSubfolders = []) => {
  const ordered = ['Active']; // Always start with Active

  // Add other subfolders from config order if they exist
  UPLOAD_DEFAULTS.subfolderOrder.forEach(folderObj => {
    const folder = typeof folderObj === 'string' ? folderObj : folderObj.value;
    if (folder !== 'Active' && availableSubfolders.includes(folder)) {
      ordered.push(folder);
    }
  });

  // Add any remaining subfolders not in our order config
  availableSubfolders.forEach(folder => {
    if (!ordered.includes(folder)) {
      ordered.push(folder);
    }
  });

  return ordered;
};

/**
 * Get default document classification for a document type
 * @param {string} documentType
 * @returns {string} Default classification
 */
export const getDefaultClassification = (documentType) => {
  return UPLOAD_DEFAULTS.documentClassificationDefaults[documentType] || '';
};

/**
 * Admin configuration structure for future implementation
 * This will be stored in database and editable through admin UI
 */
export const ADMIN_CONFIG_SCHEMA = {
  uploadDefaults: {
    documentTypeOrder: {
      type: 'sortable-list',
      label: 'Document Type Order',
      description: 'Drag to reorder document types by frequency of use'
    },
    defaultDocumentType: {
      type: 'select',
      label: 'Default Document Type',
      description: 'Which document type to select by default'
    },
    defaultSubfolder: {
      type: 'select',
      label: 'Default Subfolder',
      description: 'Which subfolder to select by default (typically Active)'
    },
    subfolderOrder: {
      type: 'sortable-list',
      label: 'Subfolder Order',
      description: 'Default order for subfolder dropdown'
    }
  }
};