import React, { useState, useEffect } from 'react';

const ArchivedProjectsManagement = ({ theme }) => {
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archiveDays, setArchiveDays] = useState(30);
  const [archivePage, setArchivePage] = useState(1);
  const [archivePagination, setArchivePagination] = useState({});
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Load archived projects when component mounts or filters change
  useEffect(() => {
    loadArchivedProjects();
  }, [archiveDays, archivePage]);

  const loadArchivedProjects = async () => {
    setArchivedLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/projects/archived?days=${archiveDays}&page=${archivePage}&limit=20`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setArchivedProjects(result.data.projects || []);
        setArchivePagination(result.data.pagination || {});
        setError(null);
      } else {
        setError('Failed to load archived projects');
      }
    } catch (err) {
      setError('Network error loading archived projects');
    } finally {
      setArchivedLoading(false);
    }
  };

  const handleRestoreProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to restore this project? It will be moved back to active projects.')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/projects/${projectId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ restoredBy: 1 }) // TODO: Replace with actual user ID
      });

      if (response.ok) {
        setSuccessMessage('Project restored successfully');
        loadArchivedProjects(); // Reload the list
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to restore project');
      }
    } catch (err) {
      setError('Network error restoring project');
    }
  };

  const handleArchiveDaysChange = (newDays) => {
    setArchiveDays(newDays);
    setArchivePage(1); // Reset to first page
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{
          margin: 0,
          color: theme.text,
          fontSize: '24px'
        }}>
          🗃️ Archived Projects Management
        </h2>

        {/* Days Filter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <label style={{
            color: theme.text,
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Show projects archived in the last:
          </label>
          <select
            value={archiveDays}
            onChange={(e) => handleArchiveDaysChange(parseInt(e.target.value))}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.surface,
              color: theme.text,
              fontSize: '14px'
            }}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>6 months</option>
            <option value={365}>1 year</option>
          </select>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '12px 16px',
          borderRadius: '4px',
          marginBottom: '16px',
          border: '1px solid #c3e6cb'
        }}>
          ✅ {successMessage}
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px 16px',
          borderRadius: '4px',
          marginBottom: '16px',
          border: '1px solid #f5c6cb'
        }}>
          ❌ {error}
        </div>
      )}

      {archivedLoading ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: theme.textSecondary
        }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          Loading archived projects...
        </div>
      ) : archivedProjects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          backgroundColor: theme.surface,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
          <h3 style={{ margin: '0 0 8px 0', color: theme.text }}>No Archived Projects</h3>
          <p style={{ margin: '0', color: theme.textSecondary }}>
            No projects have been archived in the last {archiveDays} days.
          </p>
        </div>
      ) : (
        <div>
          {/* Projects List */}
          <div style={{
            backgroundColor: theme.surface,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            overflow: 'hidden'
          }}>
            {archivedProjects.map((project, index) => (
              <div
                key={project.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: index < archivedProjects.length - 1 ? `1px solid ${theme.border}` : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: theme.surface
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <h4 style={{
                      margin: 0,
                      color: theme.text,
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      {project.title}
                    </h4>
                    <span style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      Archived
                    </span>
                    {project.project_type && (
                      <span style={{
                        backgroundColor: theme.border,
                        color: theme.text,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '500'
                      }}>
                        {project.project_type}
                      </span>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '13px',
                    color: theme.textSecondary
                  }}>
                    <span>
                      📅 Due: {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'No due date'}
                    </span>
                    <span>
                      👤 Owner: {project.owner_name || 'Unknown'}
                    </span>
                    <span>
                      🗃️ Archived: {new Date(project.archived_at).toLocaleDateString()} by {project.archived_by_name || 'Unknown'}
                    </span>
                    {project.team_count > 0 && (
                      <span>
                        👥 Team: {project.team_count} member{project.team_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {project.description && (
                    <p style={{
                      margin: '8px 0 0 0',
                      color: theme.textSecondary,
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {project.description}
                    </p>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginLeft: '20px'
                }}>
                  <button
                    onClick={() => handleRestoreProject(project.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                  >
                    ↩️ Restore
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {archivePagination.totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '20px',
              padding: '16px',
              backgroundColor: theme.surface,
              borderRadius: '8px',
              border: `1px solid ${theme.border}`
            }}>
              <button
                onClick={() => setArchivePage(archivePage - 1)}
                disabled={!archivePagination.hasPrev}
                style={{
                  padding: '8px 12px',
                  backgroundColor: archivePagination.hasPrev ? theme.primary : theme.border,
                  color: archivePagination.hasPrev ? 'white' : theme.textSecondary,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: archivePagination.hasPrev ? 'pointer' : 'not-allowed',
                  fontSize: '14px'
                }}
              >
                ← Previous
              </button>

              <span style={{ color: theme.text, fontSize: '14px' }}>
                Page {archivePage} of {archivePagination.totalPages}
              </span>

              <button
                onClick={() => setArchivePage(archivePage + 1)}
                disabled={!archivePagination.hasNext}
                style={{
                  padding: '8px 12px',
                  backgroundColor: archivePagination.hasNext ? theme.primary : theme.border,
                  color: archivePagination.hasNext ? 'white' : theme.textSecondary,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: archivePagination.hasNext ? 'pointer' : 'not-allowed',
                  fontSize: '14px'
                }}
              >
                Next →
              </button>
            </div>
          )}

          {/* Summary Info */}
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: theme.background,
            borderRadius: '6px',
            border: `1px solid ${theme.border}`,
            fontSize: '13px',
            color: theme.textSecondary,
            textAlign: 'center'
          }}>
            Showing {archivedProjects.length} of {archivePagination.total || 0} archived projects from the last {archiveDays} days
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivedProjectsManagement;