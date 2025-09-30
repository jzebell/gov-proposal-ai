import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

const DocumentPreviewPane = ({
  isOpen,
  onClose,
  documentId,
  initialChunkIndex = 0,
  highlightTerms = [],
  projectName,
  onNavigateChunk,
  className = '',
  apiUrl = API_BASE_URL
}) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(initialChunkIndex);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('content'); // 'content', 'navigation', 'metadata'

  // Load document preview
  const loadPreview = useCallback(async (chunkIndex = currentChunkIndex) => {
    if (!isOpen || !documentId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        contextLines: '5',
        highlightTerms: highlightTerms.join(','),
        includeMetadata: 'true'
      });

      const response = await fetch(
        `${apiUrl}/api/citations/preview/${documentId}/${chunkIndex}?${params}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setPreview(result.data);
        setCurrentChunkIndex(chunkIndex);

        // Track preview access
        fetch(`${apiUrl}/api/citations/track-access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            citationId: `preview_${documentId}_${chunkIndex}`,
            projectName: projectName || 'Unknown',
            accessType: 'preview',
            userId: 'user'
          })
        }).catch(console.error);

      } else {
        setError(result.message || 'Failed to load document preview');
      }

    } catch (err) {
      console.error('Error loading document preview:', err);
      setError('Failed to load document preview: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [documentId, currentChunkIndex, highlightTerms, isOpen, projectName, apiUrl]);

  // Load preview when component opens or document changes
  useEffect(() => {
    if (isOpen && documentId) {
      loadPreview(initialChunkIndex);
    }
  }, [isOpen, documentId, initialChunkIndex, loadPreview]);

  // Navigation handlers
  const handlePreviousChunk = useCallback(() => {
    if (preview?.content.navigation.hasPrevious) {
      const newIndex = currentChunkIndex - 1;
      loadPreview(newIndex);
      if (onNavigateChunk) onNavigateChunk(newIndex);
    }
  }, [currentChunkIndex, preview, loadPreview, onNavigateChunk]);

  const handleNextChunk = useCallback(() => {
    if (preview?.content.navigation.hasNext) {
      const newIndex = currentChunkIndex + 1;
      loadPreview(newIndex);
      if (onNavigateChunk) onNavigateChunk(newIndex);
    }
  }, [currentChunkIndex, preview, loadPreview, onNavigateChunk]);

  const handleJumpToChunk = useCallback((chunkIndex) => {
    loadPreview(chunkIndex);
    if (onNavigateChunk) onNavigateChunk(chunkIndex);
  }, [loadPreview, onNavigateChunk]);

  const handleSectionJump = useCallback((sectionType) => {
    if (preview?.content.navigation.sections[sectionType]) {
      const firstChunk = preview.content.navigation.sections[sectionType][0];
      handleJumpToChunk(firstChunk);
    }
  }, [preview, handleJumpToChunk]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          handlePreviousChunk();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          handleNextChunk();
          break;
        case 'Escape':
          onClose();
          break;
        default:
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, handlePreviousChunk, handleNextChunk, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`document-preview-pane ${className}`} style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '60%',
      maxWidth: '800px',
      backgroundColor: 'white',
      boxShadow: '-4px 0 6px -1px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s ease-in-out'
    }}>

      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            📄 Document Preview
          </h3>
          {preview && (
            <p style={{ margin: '0', fontSize: '13px', color: '#6b7280' }}>
              {preview.documentInfo.name} ({preview.documentInfo.category})
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#e5e7eb', borderRadius: '6px', padding: '2px' }}>
            {['content', 'navigation', 'metadata'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: viewMode === mode ? 'white' : 'transparent',
                  color: viewMode === mode ? '#1f2937' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: viewMode === mode ? '600' : '400',
                  transition: 'all 0.2s'
                }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      {preview && (
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePreviousChunk}
              disabled={!preview.content.navigation.hasPrevious}
              style={{
                padding: '4px 8px',
                backgroundColor: preview.content.navigation.hasPrevious ? '#3b82f6' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: preview.content.navigation.hasPrevious ? 'pointer' : 'not-allowed'
              }}
            >
              ← Previous
            </button>

            <span style={{ color: '#6b7280' }}>
              {currentChunkIndex + 1} / {preview.content.navigation.totalChunks}
            </span>

            <button
              onClick={handleNextChunk}
              disabled={!preview.content.navigation.hasNext}
              style={{
                padding: '4px 8px',
                backgroundColor: preview.content.navigation.hasNext ? '#3b82f6' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: preview.content.navigation.hasNext ? 'pointer' : 'not-allowed'
              }}
            >
              Next →
            </button>
          </div>

          <input
            type="text"
            placeholder="Search in document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '12px',
              width: '200px'
            }}
          />
        </div>
      )}

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: '#6b7280'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px'
              }} />
              Loading document preview...
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#dc2626'
          }}>
            <p>❌ {error}</p>
            <button
              onClick={() => loadPreview(currentChunkIndex)}
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {preview && !loading && viewMode === 'content' && (
          <div style={{ padding: '20px' }}>
            {/* Target Chunk */}
            <div style={{
              backgroundColor: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                Current Section: {preview.content.targetChunk.sectionType.replace('_', ' ').toUpperCase()}
              </div>
              <div
                style={{ fontSize: '14px', lineHeight: '1.6', color: '#1f2937' }}
                dangerouslySetInnerHTML={{
                  __html: preview.content.targetChunk.highlighted || preview.content.targetChunk.content
                }}
              />
            </div>

            {/* Context Chunks */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                Surrounding Context
              </h4>
              {preview.content.contextChunks.map((chunk, index) => (
                <div key={index} style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: chunk.index === currentChunkIndex ? '#eff6ff' : '#f9fafb',
                  border: chunk.index === currentChunkIndex ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: chunk.index !== currentChunkIndex ? 'pointer' : 'default'
                }} onClick={() => chunk.index !== currentChunkIndex && handleJumpToChunk(chunk.index)}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                    Chunk {chunk.index + 1} • {chunk.sectionType}
                  </div>
                  <div
                    style={{ fontSize: '13px', lineHeight: '1.5', color: '#374151' }}
                    dangerouslySetInnerHTML={{ __html: chunk.highlighted || chunk.content }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {preview && !loading && viewMode === 'navigation' && (
          <div style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
              Document Navigation
            </h4>

            {/* Section Navigation */}
            <div style={{ marginBottom: '24px' }}>
              <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                📑 Sections
              </h5>
              {Object.entries(preview.content.navigation.sections).map(([sectionType, chunks]) => (
                <div key={sectionType} style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#1f2937' }}>
                      {sectionType.replace('_', ' ').toUpperCase()}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      {chunks.length} chunks
                    </span>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {chunks.slice(0, 10).map(chunkIndex => (
                      <button
                        key={chunkIndex}
                        onClick={() => handleJumpToChunk(chunkIndex)}
                        style={{
                          padding: '2px 6px',
                          fontSize: '10px',
                          backgroundColor: chunkIndex === currentChunkIndex ? '#3b82f6' : '#e5e7eb',
                          color: chunkIndex === currentChunkIndex ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        {chunkIndex + 1}
                      </button>
                    ))}
                    {chunks.length > 10 && (
                      <span style={{ fontSize: '10px', color: '#6b7280', padding: '2px 6px' }}>
                        +{chunks.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Jump */}
            <div>
              <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                🎯 Quick Jump
              </h5>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  onClick={() => handleJumpToChunk(0)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  📍 Start
                </button>
                <button
                  onClick={() => handleJumpToChunk(Math.floor(preview.content.navigation.totalChunks / 2))}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🎯 Middle
                </button>
                <button
                  onClick={() => handleJumpToChunk(preview.content.navigation.totalChunks - 1)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🏁 End
                </button>
              </div>
            </div>
          </div>
        )}

        {preview && !loading && viewMode === 'metadata' && (
          <div style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
              Document Metadata
            </h4>

            {/* Document Info */}
            <div style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                📋 Document Information
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', fontSize: '13px' }}>
                <span style={{ fontWeight: '500', color: '#6b7280' }}>Name:</span>
                <span style={{ color: '#1f2937' }}>{preview.documentInfo.name}</span>

                <span style={{ fontWeight: '500', color: '#6b7280' }}>Category:</span>
                <span style={{ color: '#1f2937' }}>{preview.documentInfo.category}</span>

                <span style={{ fontWeight: '500', color: '#6b7280' }}>Project:</span>
                <span style={{ color: '#1f2937' }}>{preview.documentInfo.projectName}</span>

                <span style={{ fontWeight: '500', color: '#6b7280' }}>Size:</span>
                <span style={{ color: '#1f2937' }}>{(preview.documentInfo.size / 1024).toFixed(1)} KB</span>

                <span style={{ fontWeight: '500', color: '#6b7280' }}>Uploaded:</span>
                <span style={{ color: '#1f2937' }}>
                  {new Date(preview.documentInfo.uploadedAt).toLocaleDateString()}
                </span>

                <span style={{ fontWeight: '500', color: '#6b7280' }}>Total Chunks:</span>
                <span style={{ color: '#1f2937' }}>{preview.content.navigation.totalChunks}</span>
              </div>
            </div>

            {/* Preview Stats */}
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e', marginBottom: '12px' }}>
                📊 Preview Statistics
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', fontSize: '13px' }}>
                <span style={{ fontWeight: '500', color: '#075985' }}>Generated:</span>
                <span style={{ color: '#0c4a6e' }}>
                  {new Date(preview.previewMetadata.generatedAt).toLocaleString()}
                </span>

                <span style={{ fontWeight: '500', color: '#075985' }}>Context Lines:</span>
                <span style={{ color: '#0c4a6e' }}>{preview.previewMetadata.contextLines}</span>

                <span style={{ fontWeight: '500', color: '#075985' }}>Highlight Terms:</span>
                <span style={{ color: '#0c4a6e' }}>
                  {preview.previewMetadata.highlightTerms.length > 0
                    ? preview.previewMetadata.highlightTerms.join(', ')
                    : 'None'}
                </span>

                <span style={{ fontWeight: '500', color: '#075985' }}>Total Chunks:</span>
                <span style={{ color: '#0c4a6e' }}>{preview.previewMetadata.chunkCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with keyboard shortcuts */}
      <div style={{
        padding: '8px 20px',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        fontSize: '11px',
        color: '#6b7280',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Use ← → arrow keys to navigate chunks</span>
        <span>Press Esc to close</span>
      </div>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DocumentPreviewPane;