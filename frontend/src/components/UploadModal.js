import React from 'react';
import DocumentUpload from './DocumentUpload';

const UploadModal = ({ isOpen, onClose, onProjectCreated, selectedProject = null, droppedFiles = [], theme }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleProjectCreated = () => {
    if (onProjectCreated) {
      onProjectCreated();
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          backgroundColor: theme?.surface || 'white',
          borderRadius: '12px',
          maxWidth: '900px',
          maxHeight: '90vh',
          width: '100%',
          overflow: 'auto',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: theme?.textSecondary || '#666',
            zIndex: 1001,
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = theme?.background || '#f0f0f0';
            e.target.style.color = theme?.text || '#333';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = theme?.textSecondary || '#666';
          }}
        >
          ×
        </button>

        {/* Modal content */}
        <div style={{ padding: '0' }}>
          <DocumentUpload
            onProjectCreated={handleProjectCreated}
            selectedProject={selectedProject}
            isModal={true}
            droppedFiles={droppedFiles}
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
};

export default UploadModal;