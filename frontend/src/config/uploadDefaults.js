/**
 * Upload Document Default Configuration
 *
 * This configuration defines the default settings for document uploads.
 * These settings should be configurable by admins in the future.
 *
 * Reasoning: Order is based on most frequently used document types
 */

export const UPLOAD_DEFAULTS = {
  // Default document type when upload modal opens
  defaultDocumentType: 'solicitation',

  // Default subfolder for all document types
  defaultSubfolder: 'Active',

  // Document type display order (most likely to be used first)
  documentTypeOrder: [
    { value: 'solicitation', label: 'Solicitation' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'past_performance', label: 'Past Performance' },
    { value: 'reference', label: 'Reference' },
    { value: 'media', label: 'Media' },
    { value: 'compliance', label: 'Compliance' }
  ],

  // Default subfolder order with Active always first
  subfolderOrder: [
    'Active',
    'Archive',
    'Draft',
    'Reference',
    'Completed',
    'In Progress',
    'Review'
  ],

  // Document classification defaults per type
  documentClassificationDefaults: {
    solicitation: 'rfp', // Default to RFP for solicitations
    proposal: 'draft',
    past_performance: 'current',
    reference: 'general',
    media: 'public',
    compliance: 'active'
  },

  // File upload settings
  fileSettings: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    allowedExtensions: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf'
  }
};

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
  UPLOAD_DEFAULTS.subfolderOrder.forEach(folder => {
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