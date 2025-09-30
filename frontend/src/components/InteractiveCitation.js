import React, { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

const InteractiveCitation = ({
  citation,
  onCitationClick,
  onPreviewRequest,
  showPreview = false,
  compactMode = false,
  className = '',
  apiUrl = API_BASE_URL
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCitationClick = useCallback(async (e) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      // Track citation access
      await fetch(`${apiUrl}/api/citations/track-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citationId: citation.id,
          projectName: citation.projectName || 'Unknown',
          accessType: 'click',
          userId: 'user' // TODO: Get from auth context
        })
      });

      // Trigger citation click handler
      if (onCitationClick) {
        await onCitationClick(citation);
      }

    } catch (err) {
      console.error('Error tracking citation click:', err);
      setError('Failed to load citation details');
    } finally {
      setLoading(false);
    }
  }, [citation, onCitationClick, apiUrl]);

  const handlePreviewRequest = useCallback(async () => {
    if (!onPreviewRequest) return;

    setLoading(true);
    setError(null);

    try {
      await onPreviewRequest(citation.documentId, citation.chunkIndex);
    } catch (err) {
      console.error('Error loading preview:', err);
      setError('Failed to load document preview');
    } finally {
      setLoading(false);
    }
  }, [citation.documentId, citation.chunkIndex, onPreviewRequest]);

  if (compactMode) {
    return (
      <span
        className={`inline-citation ${className}`}
        onClick={handleCitationClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          cursor: 'pointer',
          color: '#2563eb',
          textDecoration: isHovered ? 'underline' : 'none',
          fontWeight: '500',
          position: 'relative'
        }}
      >
        [{citation.citationNumber}]

        {isHovered && (
          <div className="citation-tooltip" style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            marginBottom: '4px'
          }}>
            {citation.documentName}
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              border: '4px solid transparent',
              borderTopColor: '#1f2937'
            }} />
          </div>
        )}
      </span>
    );
  }

  return (
    <div className={`interactive-citation ${className}`} style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      margin: '8px 0',
      backgroundColor: '#f9fafb',
      transition: 'all 0.2s ease-in-out',
      ...(isHovered ? {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      } : {})
    }}>

      {/* Citation Header */}
      <div className="citation-header" style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div className="citation-info" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '50%',
              fontSize: '12px',
              fontWeight: 'bold',
              marginRight: '8px'
            }}>
              {citation.citationNumber}
            </span>
            <h4 style={{
              margin: '0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937',
              cursor: 'pointer'
            }} onClick={handleCitationClick}>
              {citation.documentName}
            </h4>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              {citation.documentType}
            </span>

            {citation.sectionType && (
              <span style={{
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '500'
              }}>
                {citation.sectionType.replace('_', ' ')}
              </span>
            )}

            <span style={{
              backgroundColor: '#fef3c7',
              color: '#92400e',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              {citation.relevanceScore}% relevant
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handlePreviewRequest}
            disabled={loading}
            style={{
              padding: '6px 12px',
              backgroundColor: loading ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#2563eb')}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3b82f6')}
          >
            {loading ? (
              <>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #ffffff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Loading...
              </>
            ) : (
              <>📄 Preview</>
            )}
          </button>

          <button
            onClick={handleCitationClick}
            disabled={loading}
            style={{
              padding: '6px 12px',
              backgroundColor: loading ? '#d1d5db' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#059669')}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#10b981')}
          >
            🔗 Navigate
          </button>
        </div>
      </div>

      {/* Citation Content Preview */}
      <div className="citation-content" style={{
        fontSize: '13px',
        color: '#4b5563',
        lineHeight: '1.5',
        marginBottom: '12px'
      }}>
        <p style={{ margin: '0', fontStyle: 'italic' }}>
          "{citation.contentPreview}"
        </p>
      </div>

      {/* Citation Metadata */}
      <div className="citation-metadata" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: '#6b7280',
        borderTop: '1px solid #e5e7eb',
        paddingTop: '8px'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {citation.pageNumber && (
            <span>Page {citation.pageNumber}</span>
          )}
          <span>{citation.wordCount} words</span>
          {citation.sectionTitle && (
            <span>Section: {citation.sectionTitle}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {citation.accessCount > 0 && (
            <span>👁 {citation.accessCount} views</span>
          )}
          <span>🕒 {new Date(citation.createdAt).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          backgroundColor: '#fef2f2',
          borderLeft: '3px solid #dc2626',
          fontSize: '12px',
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      {/* Quick Preview (if enabled) */}
      {showPreview && citation.contextPreview && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '6px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
            Context Preview
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>
            {citation.contextPreview.beforeContent && (
              <div style={{ opacity: 0.7, marginBottom: '4px' }}>
                {citation.contextPreview.beforeContent}
              </div>
            )}
            <div style={{ backgroundColor: '#fef3c7', padding: '2px 4px', borderRadius: '3px' }}>
              {citation.contextPreview.currentContent}
            </div>
            {citation.contextPreview.afterContent && (
              <div style={{ opacity: 0.7, marginTop: '4px' }}>
                {citation.contextPreview.afterContent}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add spinning animation for loading states */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .citation-header h4:hover {
          color: #2563eb;
        }

        .interactive-citation:hover {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default InteractiveCitation;