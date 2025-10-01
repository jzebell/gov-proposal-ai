import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

const UploadDefaultsConfig = ({ theme }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state
  const [defaultDocumentType, setDefaultDocumentType] = useState('solicitation');
  const [defaultSubfolder, setDefaultSubfolder] = useState('Active');
  const [documentTypeOrder, setDocumentTypeOrder] = useState([]);
  const [subfolderOrder, setSubfolderOrder] = useState([]);
  const [maxFileSize, setMaxFileSize] = useState(50);
  const [maxFiles, setMaxFiles] = useState(10);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload-defaults/config`);
      const data = await response.json();

      if (data.success) {
        setConfig(data.data);
        setDefaultDocumentType(data.data.defaultDocumentType);
        setDefaultSubfolder(data.data.defaultSubfolder);
        setDocumentTypeOrder(data.data.documentTypeOrder);
        setSubfolderOrder(data.data.subfolderOrder);
        setMaxFileSize(data.data.fileSettings?.maxFileSize || 50);
        setMaxFiles(data.data.fileSettings?.maxFiles || 10);
      }
    } catch (error) {
      console.error('Error fetching upload defaults:', error);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload-defaults/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          defaultDocumentType,
          defaultSubfolder,
          documentTypeOrder,
          subfolderOrder,
          fileSettings: {
            maxFileSize,
            maxFiles,
            allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xls', '.xlsx', '.ppt', '.pptx']
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Configuration saved successfully!' });
        setConfig(data.data);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save configuration' });
      }
    } catch (error) {
      console.error('Error saving upload defaults:', error);
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setDefaultDocumentType(config.defaultDocumentType);
      setDefaultSubfolder(config.defaultSubfolder);
      setDocumentTypeOrder(config.documentTypeOrder);
      setSubfolderOrder(config.subfolderOrder);
      setMaxFileSize(config.fileSettings?.maxFileSize || 50);
      setMaxFiles(config.fileSettings?.maxFiles || 10);
      setMessage(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: theme.textSecondary }}>Loading configuration...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: theme.text, margin: 0, fontSize: '24px', marginBottom: '8px' }}>
          📤 Upload Defaults Configuration
        </h2>
        <p style={{ color: theme.textSecondary, margin: 0, fontSize: '14px' }}>
          Configure default settings for document upload modals across the application
        </p>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            fontSize: '14px'
          }}
        >
          {message.text}
        </div>
      )}

      {/* Default Document Type */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            fontWeight: '600',
            color: theme.text,
            marginBottom: '8px',
            fontSize: '14px'
          }}
        >
          Default Document Type
        </label>
        <select
          value={defaultDocumentType}
          onChange={(e) => setDefaultDocumentType(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            backgroundColor: theme.surface,
            color: theme.text,
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          {documentTypeOrder.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <p style={{ color: theme.textSecondary, fontSize: '12px', marginTop: '4px', margin: 0 }}>
          This will be pre-selected in all upload modals
        </p>
      </div>

      {/* Default Subfolder */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            fontWeight: '600',
            color: theme.text,
            marginBottom: '8px',
            fontSize: '14px'
          }}
        >
          Default Subfolder
        </label>
        <select
          value={defaultSubfolder}
          onChange={(e) => setDefaultSubfolder(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            backgroundColor: theme.surface,
            color: theme.text,
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          {subfolderOrder.map((folder) => (
            <option key={folder.value} value={folder.value}>
              {folder.label}
            </option>
          ))}
        </select>
        <p style={{ color: theme.textSecondary, fontSize: '12px', marginTop: '4px', margin: 0 }}>
          This will be pre-selected in all upload modals
        </p>
      </div>

      {/* File Settings */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: theme.text, fontSize: '16px', marginBottom: '16px', fontWeight: '600' }}>
          File Upload Limits
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '8px',
                fontSize: '14px'
              }}
            >
              Max File Size (MB)
            </label>
            <input
              type="number"
              value={maxFileSize}
              onChange={(e) => setMaxFileSize(parseInt(e.target.value))}
              min="1"
              max="500"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                backgroundColor: theme.surface,
                color: theme.text,
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '8px',
                fontSize: '14px'
              }}
            >
              Max Files Per Upload
            </label>
            <input
              type="number"
              value={maxFiles}
              onChange={(e) => setMaxFiles(parseInt(e.target.value))}
              min="1"
              max="100"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                backgroundColor: theme.surface,
                color: theme.text,
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Document Types Order Info */}
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: theme.surface, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
        <h4 style={{ color: theme.text, fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>
          📋 Current Document Types (in order)
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {documentTypeOrder.map((type, index) => (
            <div
              key={type.value}
              style={{
                padding: '6px 12px',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                fontSize: '13px',
                color: theme.text
              }}
            >
              {index + 1}. {type.label}
            </div>
          ))}
        </div>
        <p style={{ color: theme.textSecondary, fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
          To reorder or manage document types, use the "Document Types" tab
        </p>
      </div>

      {/* Subfolders Order Info */}
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: theme.surface, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
        <h4 style={{ color: theme.text, fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>
          📁 Current Subfolders (in order)
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {subfolderOrder.map((folder, index) => (
            <div
              key={folder.value}
              style={{
                padding: '6px 12px',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                fontSize: '13px',
                color: theme.text
              }}
            >
              {index + 1}. {folder.label}
            </div>
          ))}
        </div>
        <p style={{ color: theme.textSecondary, fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
          These folders are used for organizing documents within projects
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 24px',
            backgroundColor: theme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
        >
          {saving ? 'Saving...' : '💾 Save Configuration'}
        </button>

        <button
          onClick={handleReset}
          disabled={saving}
          style={{
            padding: '12px 24px',
            backgroundColor: theme.surface,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
        >
          🔄 Reset
        </button>
      </div>

      {/* Last Updated Info */}
      {config?.updatedAt && (
        <div style={{ marginTop: '24px', padding: '12px', backgroundColor: theme.surface, borderRadius: '6px', fontSize: '12px', color: theme.textSecondary }}>
          Last updated: {new Date(config.updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default UploadDefaultsConfig;
