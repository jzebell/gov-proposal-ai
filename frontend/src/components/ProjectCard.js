import React from 'react';

const ProjectCard = ({
  title,
  dueDate,
  documentType,
  status = 'active',
  owner,
  theme,
  project,
  agency,
  department,
  teamSize = 1,
  progressPercentage = 0,
  healthStatus = 'green',
  documentCount = 0,
  priorityLevel = 3,
  classificationLevel,
  complianceFramework,
  estimatedValue,
  onView,
  onEdit,
  onProjectClick,
  onManageTeam,
  onArchive,
  isAdmin = false
}) => {
  const getDocumentIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'rfp': return '📋';
      case 'rfi': return '❓';
      case 'sow': return '📝';
      case 'pws': return '📄';
      default: return '📄';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'draft': return '#ffc107';
      case 'submitted': return '#007bff';
      case 'overdue': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const getHealthStatusColor = (health) => {
    switch (health) {
      case 'green': return '#28a745';
      case 'yellow': return '#ffc107';
      case 'red': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getPriorityIcon = (priority) => {
    if (priority <= 1) return '⚡'; // High priority
    if (priority <= 2) return '🔥'; // Medium-high
    if (priority <= 3) return '⭐'; // Normal
    if (priority <= 4) return '❄️'; // Low
    return '💤'; // Very low
  };

  const formatCurrency = (value) => {
    if (!value) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div style={{
      backgroundColor: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: '12px',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}
    onClick={() => onProjectClick && onProjectClick(project)}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    }}
    >
      {/* Document Preview Area */}
      <div style={{
        height: '120px',
        backgroundColor: theme.primary + '10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderBottom: `1px solid ${theme.border}`
      }}>
        {/* Document Icon */}
        <div style={{
          fontSize: '48px',
          opacity: 0.6
        }}>
          {getDocumentIcon(documentType)}
        </div>

        {/* Document Type Badge */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          backgroundColor: theme.primary,
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          {documentType}
        </div>

        {/* Status Badge */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          backgroundColor: getStatusColor(status),
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          textTransform: 'capitalize'
        }}>
          {status}
        </div>

        {/* Health Status & Priority Indicators */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          {/* Priority */}
          <div title={`Priority Level ${priorityLevel}`}>
            {getPriorityIcon(priorityLevel)}
          </div>

          {/* Health Status */}
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: getHealthStatusColor(healthStatus),
            border: '2px solid white',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }} title={`Health: ${healthStatus}`}>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
        {/* Content wrapper with flex-grow to push buttons to bottom */}
        <div style={{ flex: 1, minHeight: '240px' }}>
          {/* Project Title */}
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: theme.text,
            lineHeight: '1.4',
            height: '44.8px', // Reserve space for exactly 2 lines (16px * 1.4 * 2)
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {title}
          </h3>

        {/* Agency & Department */}
        {(agency || department) && (
          <div style={{
            marginBottom: '8px',
            fontSize: '12px',
            color: theme.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>🏛️</span>
            <span style={{
              fontWeight: '500',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {agency || department}
            </span>
          </div>
        )}

        {/* Progress Bar */}
        {progressPercentage > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '12px',
                color: theme.textSecondary,
                fontWeight: '500'
              }}>
                Progress
              </span>
              <span style={{
                fontSize: '12px',
                color: theme.text,
                fontWeight: '600'
              }}>
                {progressPercentage}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: theme.border,
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: progressPercentage >= 75 ? '#28a745' :
                                progressPercentage >= 50 ? '#ffc107' :
                                progressPercentage >= 25 ? '#fd7e14' : '#dc3545',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* Due Date */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px' }}>📅</span>
          <span style={{
            fontSize: '14px',
            color: isOverdue(dueDate) ? '#dc3545' : theme.textSecondary,
            fontWeight: isOverdue(dueDate) ? '600' : '400'
          }}>
            Due: {formatDate(dueDate)}
            {isOverdue(dueDate) && ' (Overdue)'}
          </span>
        </div>

        {/* Owner */}
        {owner && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: owner.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                {owner.avatar}
              </div>
              <span style={{
                fontSize: '14px',
                color: theme.textSecondary,
                fontWeight: '400'
              }}>
                {owner.name}
              </span>
            </div>
          </div>
        )}

        {/* Project Stats */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '12px',
          fontSize: '12px',
          color: theme.textSecondary
        }}>
          {/* Team Size */}
          {teamSize > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>👥</span>
              <span>{teamSize} members</span>
            </div>
          )}

          {/* Document Count */}
          {documentCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>📄</span>
              <span>{documentCount} docs</span>
            </div>
          )}

          {/* Estimated Value */}
          {estimatedValue && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: theme.primary,
              fontWeight: '600'
            }}>
              <span>💰</span>
              <span>{formatCurrency(estimatedValue)}</span>
            </div>
          )}
        </div>

        {/* Compliance Frameworks */}
        {complianceFramework && (
          <div style={{
            marginBottom: '8px',
            fontSize: '11px',
            color: theme.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexWrap: 'wrap'
          }}>
            <span>🛡️</span>
            {/* Handle both old single framework format and new array format */}
            {Array.isArray(complianceFramework) ? (
              complianceFramework.slice(0, 3).map((framework, index) => (
                <span
                  key={framework.id || framework.code || index}
                  style={{
                    backgroundColor: theme.border,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    fontSize: '10px'
                  }}
                >
                  {framework.code || framework.name || framework}
                </span>
              ))
            ) : (
              <span style={{
                backgroundColor: theme.border,
                padding: '2px 6px',
                borderRadius: '8px',
                textTransform: 'uppercase',
                fontWeight: '600'
              }}>
                {complianceFramework}
              </span>
            )}
            {/* Show +N more if there are additional frameworks */}
            {Array.isArray(complianceFramework) && complianceFramework.length > 3 && (
              <span style={{
                fontSize: '10px',
                color: theme.textSecondary,
                fontStyle: 'italic'
              }}>
                +{complianceFramework.length - 3} more
              </span>
            )}
          </div>
        )}
        </div>
        {/* End of content wrapper */}

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isAdmin && onArchive ?
            (teamSize > 1 ? '1fr 1fr' : '1fr') :
            (teamSize > 1 ? '1fr' : '1fr'),
          gap: '6px',
          paddingTop: '12px',
          borderTop: `1px solid ${theme.border}`
        }}>
          {onManageTeam && (
            <button style={{
              padding: '6px 8px',
              border: `1px solid #28a745`,
              backgroundColor: '#28a745',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onManageTeam) onManageTeam(project);
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              👥 Team ({teamSize})
            </button>
          )}

          {isAdmin && onArchive && (
            <button style={{
              padding: '6px 8px',
              border: `1px solid #dc3545`,
              backgroundColor: 'transparent',
              color: '#dc3545',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px'
            }}
            onClick={(e) => {
              e.stopPropagation();

              if (window.confirm('Are you sure you want to archive this project? This action will hide it from the main view.')) {
                onArchive(project);
              }
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#dc3545';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#dc3545';
            }}
            >
              🗃️ Archive
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;