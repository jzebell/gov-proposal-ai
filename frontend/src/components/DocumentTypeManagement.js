import React, { useState, useEffect } from 'react';

const DocumentTypeManagement = ({ theme }) => {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    allowed_extensions: ['.pdf'],
    max_size_mb: 50,
    subfolders: ['general']
  });

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  useEffect(() => {
    loadDocumentTypes();
  }, []);

  const loadDocumentTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/document-types`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setDocumentTypes(result.data || []);
      } else {
        setError('Failed to load document types');
      }
    } catch (error) {
      console.error('Error loading document types:', error);
      setError('Network error loading document types');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocumentType = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/document-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadDocumentTypes();
        setShowCreateModal(false);
        resetForm();
        setError('');
      } else {
        const errorResult = await response.json();
        setError(errorResult.message || 'Failed to create document type');
      }
    } catch (error) {
      console.error('Error creating document type:', error);
      setError('Network error creating document type');
    }
  };

  const handleUpdateDocumentType = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/document-types/${editingType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadDocumentTypes();
        setEditingType(null);
        resetForm();
        setError('');
      } else {
        const errorResult = await response.json();
        setError(errorResult.message || 'Failed to update document type');
      }
    } catch (error) {
      console.error('Error updating document type:', error);
      setError('Network error updating document type');
    }
  };

  const handleDeleteDocumentType = async (docType) => {
    if (!window.confirm(`Are you sure you want to delete "${docType.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/document-types/${docType.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await loadDocumentTypes();
        setError('');
      } else {
        const errorResult = await response.json();
        setError(errorResult.message || 'Failed to delete document type');
      }
    } catch (error) {
      console.error('Error deleting document type:', error);
      setError('Network error deleting document type');
    }
  };

  const handleAddSubfolder = async (docType, subfolder) => {
    if (!subfolder.trim()) return;

    try {
      const response = await fetch(`${apiUrl}/api/document-types/${docType.id}/subfolders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ subfolder: subfolder.trim() })
      });

      if (response.ok) {
        await loadDocumentTypes();
        setError('');
      } else {
        const errorResult = await response.json();
        setError(errorResult.message || 'Failed to add subfolder');
      }
    } catch (error) {
      console.error('Error adding subfolder:', error);
      setError('Network error adding subfolder');
    }
  };

  const handleRemoveSubfolder = async (docType, subfolder) => {
    if (subfolder === 'general') {
      setError('Cannot remove the default "general" subfolder');
      return;
    }

    if (!window.confirm(`Remove subfolder "${subfolder}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/document-types/${docType.id}/subfolders/${subfolder}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await loadDocumentTypes();
        setError('');
      } else {
        const errorResult = await response.json();
        setError(errorResult.message || 'Failed to remove subfolder');
      }
    } catch (error) {
      console.error('Error removing subfolder:', error);
      setError('Network error removing subfolder');
    }
  };

  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      allowed_extensions: ['.pdf'],
      max_size_mb: 50,
      subfolders: ['general']
    });
  };

  const startEdit = (docType) => {
    setEditingType(docType);
    setFormData({
      key: docType.key,
      name: docType.name,
      description: docType.description || '',
      allowed_extensions: docType.allowed_extensions || ['.pdf'],
      max_size_mb: docType.max_size_mb || 50,
      subfolders: docType.subfolders || ['general']
    });
  };

  const cancelEdit = () => {
    setEditingType(null);
    resetForm();
  };

  const handleExtensionChange = (extensions) => {
    const extensionArray = extensions.split(',').map(ext => ext.trim()).filter(ext => ext);
    setFormData(prev => ({ ...prev, allowed_extensions: extensionArray }));
  };

  const handleSubfoldersChange = (subfolders) => {
    const subfoldersArray = subfolders.split(',').map(sf => sf.trim()).filter(sf => sf);
    // Always ensure 'general' is included
    const finalSubfolders = ['general', ...subfoldersArray.filter(sf => sf !== 'general')];
    setFormData(prev => ({ ...prev, subfolders: finalSubfolders }));
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ margin: 0, color: theme.text }}>Document Type Management</h2>
          <p style={{
            margin: '4px 0 0 0',
            color: theme.textSecondary,
            fontSize: '14px'
          }}>
            Configure document types, file restrictions, and folder organization
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            backgroundColor: theme.primary,
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ➕ Add Document Type
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#ffe6e6',
          border: '1px solid #ff9999',
          color: '#d63384',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#d63384',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          color: theme.textSecondary
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: `3px solid ${theme.border}`,
            borderTop: `3px solid ${theme.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ marginLeft: '12px' }}>Loading document types...</span>
        </div>
      )}

      {/* Document Types Grid */}
      {!loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: '20px'
        }}>
          {documentTypes.map((docType) => (
            <DocumentTypeCard
              key={docType.id}
              docType={docType}
              theme={theme}
              onEdit={startEdit}
              onDelete={handleDeleteDocumentType}
              onAddSubfolder={handleAddSubfolder}
              onRemoveSubfolder={handleRemoveSubfolder}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingType) && (
        <DocumentTypeModal
          isOpen={true}
          onClose={() => {
            setShowCreateModal(false);
            cancelEdit();
          }}
          onSave={editingType ? handleUpdateDocumentType : handleCreateDocumentType}
          formData={formData}
          setFormData={setFormData}
          isEditing={!!editingType}
          theme={theme}
          onExtensionChange={handleExtensionChange}
          onSubfoldersChange={handleSubfoldersChange}
        />
      )}
    </div>
  );
};

// Document Type Card Component
const DocumentTypeCard = ({ docType, theme, onEdit, onDelete, onAddSubfolder, onRemoveSubfolder }) => {
  const [newSubfolder, setNewSubfolder] = useState('');

  const handleAddSubfolder = () => {
    if (newSubfolder.trim()) {
      onAddSubfolder(docType, newSubfolder);
      setNewSubfolder('');
    }
  };

  return (
    <div style={{
      backgroundColor: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: '12px',
      padding: '20px',
      transition: 'all 0.2s ease'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}>
            <h3 style={{
              margin: 0,
              color: theme.text,
              fontSize: '18px'
            }}>
              {docType.name}
            </h3>
            {docType.is_system_type && (
              <span style={{
                backgroundColor: theme.primary,
                color: 'white',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: '600'
              }}>
                SYSTEM
              </span>
            )}
          </div>
          <div style={{
            color: theme.textSecondary,
            fontSize: '12px',
            fontFamily: 'monospace',
            marginBottom: '8px'
          }}>
            Key: {docType.key}
          </div>
          <p style={{
            margin: 0,
            color: theme.textSecondary,
            fontSize: '14px',
            lineHeight: '1.4'
          }}>
            {docType.description}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onEdit(docType)}
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${theme.border}`,
              color: theme.text,
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ✏️ Edit
          </button>
          {!docType.is_system_type && (
            <button
              onClick={() => onDelete(docType)}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #dc3545',
                color: '#dc3545',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🗑️ Delete
            </button>
          )}
        </div>
      </div>

      {/* File Restrictions */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: theme.textSecondary,
          marginBottom: '8px'
        }}>
          FILE RESTRICTIONS
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          fontSize: '14px'
        }}>
          <div>
            <strong style={{ color: theme.text }}>Extensions:</strong>
            <div style={{ color: theme.textSecondary, fontSize: '13px' }}>
              {docType.allowed_extensions?.join(', ') || 'Any'}
            </div>
          </div>
          <div>
            <strong style={{ color: theme.text }}>Max Size:</strong>
            <div style={{ color: theme.textSecondary, fontSize: '13px' }}>
              {docType.max_size_mb} MB
            </div>
          </div>
        </div>
      </div>

      {/* Subfolders */}
      <div>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: theme.textSecondary,
          marginBottom: '8px'
        }}>
          SUBFOLDERS
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '12px'
        }}>
          {(docType.subfolders || []).map((subfolder) => (
            <div
              key={subfolder}
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: theme.border,
                color: theme.text,
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '12px',
                gap: '4px'
              }}
            >
              <span>📁 {subfolder}</span>
              {subfolder !== 'general' && (
                <button
                  onClick={() => onRemoveSubfolder(docType, subfolder)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.textSecondary,
                    cursor: 'pointer',
                    fontSize: '10px',
                    padding: '0',
                    marginLeft: '2px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Subfolder */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newSubfolder}
            onChange={(e) => setNewSubfolder(e.target.value)}
            placeholder="Add subfolder..."
            style={{
              flex: 1,
              padding: '6px 10px',
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              backgroundColor: theme.background,
              color: theme.text,
              fontSize: '12px'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddSubfolder();
              }
            }}
          />
          <button
            onClick={handleAddSubfolder}
            style={{
              backgroundColor: theme.primary,
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

// Document Type Modal Component
const DocumentTypeModal = ({
  isOpen,
  onClose,
  onSave,
  formData,
  setFormData,
  isEditing,
  theme,
  onExtensionChange,
  onSubfoldersChange
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: theme.background,
        borderRadius: '12px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: theme.text }}>
            {isEditing ? 'Edit Document Type' : 'Create Document Type'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: theme.textSecondary
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div style={{
          padding: '20px',
          maxHeight: 'calc(90vh - 140px)',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Key */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '600',
                color: theme.text
              }}>
                Key *
              </label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') }))}
                disabled={isEditing}
                placeholder="e.g., technical-documents"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  backgroundColor: isEditing ? theme.border : theme.background,
                  color: theme.text,
                  fontSize: '14px'
                }}
              />
              <small style={{ color: theme.textSecondary, fontSize: '12px' }}>
                Lowercase letters, numbers, hyphens, and underscores only
              </small>
            </div>

            {/* Name */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '600',
                color: theme.text
              }}>
                Display Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Technical Documents"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  backgroundColor: theme.background,
                  color: theme.text,
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '600',
                color: theme.text
              }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what types of documents belong in this category..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  backgroundColor: theme.background,
                  color: theme.text,
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* File Settings */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              {/* Extensions */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  Allowed Extensions
                </label>
                <input
                  type="text"
                  value={formData.allowed_extensions.join(', ')}
                  onChange={(e) => onExtensionChange(e.target.value)}
                  placeholder=".pdf, .doc, .docx"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: '14px'
                  }}
                />
                <small style={{ color: theme.textSecondary, fontSize: '12px' }}>
                  Comma-separated, include dots (e.g., .pdf, .doc)
                </small>
              </div>

              {/* Max Size */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.max_size_mb}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_size_mb: parseInt(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Subfolders */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '600',
                color: theme.text
              }}>
                Subfolders
              </label>
              <input
                type="text"
                value={formData.subfolders.filter(sf => sf !== 'general').join(', ')}
                onChange={(e) => onSubfoldersChange(e.target.value)}
                placeholder="active, archived, drafts"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  backgroundColor: theme.background,
                  color: theme.text,
                  fontSize: '14px'
                }}
              />
              <small style={{ color: theme.textSecondary, fontSize: '12px' }}>
                Comma-separated. "general" folder is always included
              </small>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: `1px solid ${theme.border}`,
              backgroundColor: 'transparent',
              color: theme.text,
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            style={{
              padding: '10px 20px',
              border: 'none',
              backgroundColor: theme.primary,
              color: 'white',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentTypeManagement;