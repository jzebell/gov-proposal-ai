import React from 'react';

/**
 * Simple AI Status Indicator Component
 * Shows red/green status with optional model information
 */
const AIStatusIndicator = ({
  systemStatus,
  aiHealth,
  models = [],
  showDetails = false,
  compact = false
}) => {
  // Determine overall status
  const getDisplayStatus = () => {
    // If AI service is not available, show red
    if (!aiHealth?.available) {
      return {
        color: '#dc3545', // red
        backgroundColor: '#f8d7da',
        borderColor: '#f5c6cb',
        icon: '❌',
        label: 'AI Offline',
        details: 'Ollama service not available'
      };
    }

    // If system is warming up, show orange
    if (systemStatus?.status === 'warming') {
      return {
        color: '#fd7e14', // orange
        backgroundColor: '#fff3cd',
        borderColor: '#ffeaa7',
        icon: '🔄',
        label: systemStatus.label || 'Warming up...',
        details: `${systemStatus.activeWarmups || 0} models warming`
      };
    }

    // If models are ready, show green
    if (systemStatus?.status === 'ready') {
      return {
        color: '#28a745', // green
        backgroundColor: '#d4edda',
        borderColor: '#c3e6cb',
        icon: '✅',
        label: systemStatus.label || 'AI Ready',
        details: `${models.length} models available`
      };
    }

    // Default cold state
    return {
      color: '#6c757d', // gray
      backgroundColor: '#f8f9fa',
      borderColor: '#dee2e6',
      icon: '⏸️',
      label: 'AI Cold',
      details: 'Models need warming'
    };
  };

  const status = getDisplayStatus();

  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 8px',
          borderRadius: '12px',
          backgroundColor: status.backgroundColor,
          border: `1px solid ${status.borderColor}`,
          fontSize: '12px',
          color: status.color,
          fontWeight: '500'
        }}
        title={status.details}
      >
        <span style={{ marginRight: '4px' }}>{status.icon}</span>
        <span>AI</span>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: compact ? '6px 12px' : '10px',
        marginBottom: showDetails ? '15px' : '20px',
        borderRadius: '5px',
        backgroundColor: status.backgroundColor,
        border: `1px solid ${status.borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ marginRight: '8px', fontSize: '16px' }}>{status.icon}</span>
        <div>
          <strong style={{ color: status.color }}>AI Service Status:</strong>{' '}
          <span style={{ color: status.color }}>{status.label}</span>
          {showDetails && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              {status.details}
            </div>
          )}
        </div>
      </div>

      {showDetails && models.length > 0 && (
        <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
          <div>Models: {models.slice(0, 3).map(m => m.name || m).join(', ')}</div>
          {models.length > 3 && (
            <div>+{models.length - 3} more</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIStatusIndicator;