import React, { useState, useEffect } from 'react';

const TeamManagement = ({ project, isOpen, onClose, theme }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    userId: '',
    roleId: '',
    permissions: {
      can_read: true,
      can_write: false,
      can_edit: false,
      can_delete: false,
      can_manage_team: false,
      can_approve_changes: false
    }
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Mock users for demonstration - in production this would come from user management API
  const mockUsers = [
    { id: 1, name: 'Alice Johnson', email: 'alice.johnson@agency.gov', avatar: 'A', color: '#007bff', department: 'Engineering' },
    { id: 2, name: 'Bob Williams', email: 'bob.williams@agency.gov', avatar: 'B', color: '#28a745', department: 'Business Development' },
    { id: 3, name: 'Carol Martinez', email: 'carol.martinez@agency.gov', avatar: 'C', color: '#dc3545', department: 'Compliance' },
    { id: 4, name: 'David Chen', email: 'david.chen@agency.gov', avatar: 'D', color: '#6f42c1', department: 'Solutions Architecture' },
    { id: 5, name: 'Elena Rodriguez', email: 'elena.rodriguez@agency.gov', avatar: 'E', color: '#fd7e14', department: 'Technical Writing' },
    { id: 6, name: 'Frank Thompson', email: 'frank.thompson@agency.gov', avatar: 'F', color: '#20c997', department: 'Project Management' },
    { id: 7, name: 'Grace Liu', email: 'grace.liu@agency.gov', avatar: 'G', color: '#e83e8c', department: 'Quality Assurance' },
    { id: 8, name: 'Henry Davis', email: 'henry.davis@agency.gov', avatar: 'H', color: '#17a2b8', department: 'Security' }
  ];

  useEffect(() => {
    if (isOpen && project) {
      loadTeamData();
    }
  }, [isOpen, project]);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      // Load team members
      const teamResponse = await fetch(`${apiUrl}/api/projects/${project.id}/team`, {
        credentials: 'include'
      });

      // Load available roles
      const rolesResponse = await fetch(`${apiUrl}/api/projects/roles`, {
        credentials: 'include'
      });

      if (teamResponse.ok && rolesResponse.ok) {
        const teamResult = await teamResponse.json();
        const rolesResult = await rolesResponse.json();

        setTeamMembers(teamResult.data || []);
        setAvailableRoles(rolesResult.data || []);
      } else {
        // Fallback to mock data for demonstration
        setTeamMembers([
          {
            id: 1,
            user_id: 1,
            user_name: 'Alice Johnson',
            user_email: 'alice.johnson@agency.gov',
            user_avatar: 'A',
            user_color: '#007bff',
            role_name: 'Proposal Lead',
            role_level: 1,
            permissions: {
              can_read: true,
              can_write: true,
              can_edit: true,
              can_delete: true,
              can_manage_team: true,
              can_approve_changes: true
            },
            added_at: new Date().toISOString(),
            added_by: 'System'
          }
        ]);

        setAvailableRoles([
          { id: 1, name: 'Proposal Lead', level: 1, description: 'Full project management and team leadership' },
          { id: 2, name: 'Solutions Architect', level: 2, description: 'Technical leadership and solution design' },
          { id: 3, name: 'Writer', level: 3, description: 'Content creation and document editing' },
          { id: 4, name: 'Reviewer', level: 4, description: 'Quality assurance and change approval' },
          { id: 5, name: 'Subject Matter Expert', level: 5, description: 'Domain expertise and guidance' },
          { id: 6, name: 'Compliance Officer', level: 6, description: 'Compliance oversight and approval' }
        ]);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.length >= 2) {
      const results = mockUsers.filter(user =>
        !teamMembers.some(member => member.user_id === user.id) &&
        (user.name.toLowerCase().includes(term.toLowerCase()) ||
         user.email.toLowerCase().includes(term.toLowerCase()) ||
         user.department.toLowerCase().includes(term.toLowerCase()))
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddMember = async (user) => {
    if (!newMemberForm.roleId) {
      setError('Please select a role for the new team member');
      return;
    }

    setAddingMember(true);
    try {
      const selectedRole = availableRoles.find(role => role.id === parseInt(newMemberForm.roleId));

      const response = await fetch(`${apiUrl}/api/projects/${project.id}/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          roleId: newMemberForm.roleId,
          permissions: newMemberForm.permissions
        })
      });

      if (response.ok) {
        // Add to local state for immediate UI update
        const newMember = {
          id: Date.now(), // Temporary ID
          user_id: user.id,
          user_name: user.name,
          user_email: user.email,
          user_avatar: user.avatar,
          user_color: user.color,
          role_name: selectedRole.name,
          role_level: selectedRole.level,
          permissions: newMemberForm.permissions,
          added_at: new Date().toISOString(),
          added_by: 'Current User'
        };

        setTeamMembers(prev => [...prev, newMember]);
        setShowAddMemberModal(false);
        setSearchTerm('');
        setSearchResults([]);
        setNewMemberForm({
          userId: '',
          roleId: '',
          permissions: {
            can_read: true,
            can_write: false,
            can_edit: false,
            can_delete: false,
            can_manage_team: false,
            can_approve_changes: false
          }
        });
        setError('');
      } else {
        const errorResult = await response.json();
        setError(errorResult.error || 'Failed to add team member');
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      setError('Network error. Please try again.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/projects/${project.id}/team/${memberId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setTeamMembers(prev => prev.filter(member => member.user_id !== memberId));
      } else {
        const errorResult = await response.json();
        setError(errorResult.error || 'Failed to remove team member');
      }
    } catch (error) {
      console.error('Error removing team member:', error);
      setError('Network error. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRoleBadgeColor = (roleLevel) => {
    switch (roleLevel) {
      case 1: return '#dc3545'; // Red for Proposal Lead
      case 2: return '#fd7e14'; // Orange for Solutions Architect
      case 3: return '#28a745'; // Green for Writer
      case 4: return '#007bff'; // Blue for Reviewer
      case 5: return '#6f42c1'; // Purple for SME
      case 6: return '#20c997'; // Teal for Compliance
      default: return '#6c757d';
    }
  };

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
        borderRadius: '16px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, color: theme.text }}>Team Management</h2>
            <div style={{
              fontSize: '14px',
              color: theme.textSecondary,
              marginTop: '4px'
            }}>
              {project?.title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: theme.textSecondary
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          maxHeight: 'calc(90vh - 140px)',
          overflowY: 'auto'
        }}>
          {error && (
            <div style={{
              backgroundColor: '#ffe6e6',
              border: '1px solid #ff9999',
              color: '#d63384',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          {/* Team Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.primary }}>
                {teamMembers.length}
              </div>
              <div style={{ fontSize: '14px', color: theme.textSecondary }}>
                Team Members
              </div>
            </div>
            <div style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.primary }}>
                {project?.max_team_size || 20}
              </div>
              <div style={{ fontSize: '14px', color: theme.textSecondary }}>
                Max Team Size
              </div>
            </div>
            <div style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.primary }}>
                {new Set(teamMembers.map(m => m.role_name)).size}
              </div>
              <div style={{ fontSize: '14px', color: theme.textSecondary }}>
                Unique Roles
              </div>
            </div>
          </div>

          {/* Add Member Button */}
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={() => setShowAddMemberModal(true)}
              style={{
                backgroundColor: theme.primary,
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              👥 Add Team Member
            </button>
          </div>

          {loading ? (
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
              <span style={{ marginLeft: '12px' }}>Loading team...</span>
            </div>
          ) : (
            /* Team Members Grid */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              {teamMembers.map((member) => (
                <div
                  key={member.user_id}
                  style={{
                    backgroundColor: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '12px',
                    padding: '20px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Member Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: member.user_color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      marginRight: '12px'
                    }}>
                      {member.user_avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '600',
                        color: theme.text,
                        marginBottom: '2px'
                      }}>
                        {member.user_name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: theme.textSecondary
                      }}>
                        {member.user_email}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: getRoleBadgeColor(member.role_level),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {member.role_name}
                    </div>
                  </div>

                  {/* Permissions */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: theme.textSecondary,
                      marginBottom: '8px'
                    }}>
                      PERMISSIONS
                    </div>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px'
                    }}>
                      {Object.entries(member.permissions || {}).map(([key, value]) => {
                        if (!value) return null;
                        const displayName = key.replace('can_', '').replace('_', ' ');
                        return (
                          <span
                            key={key}
                            style={{
                              backgroundColor: theme.border,
                              color: theme.text,
                              padding: '2px 6px',
                              borderRadius: '8px',
                              fontSize: '10px',
                              textTransform: 'capitalize'
                            }}
                          >
                            {displayName}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Member Footer */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: `1px solid ${theme.border}`,
                    fontSize: '12px',
                    color: theme.textSecondary
                  }}>
                    <span>Added {formatDate(member.added_at)}</span>
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc3545',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: theme.background,
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: `1px solid ${theme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, color: theme.text }}>Add Team Member</h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
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

            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Search Users */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  Search Users
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by name, email, or department..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    fontWeight: '600',
                    color: theme.text,
                    marginBottom: '12px'
                  }}>
                    Search Results
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => {
                          setNewMemberForm(prev => ({ ...prev, userId: user.id }));
                          setSearchResults([user]);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px',
                          border: `1px solid ${newMemberForm.userId === user.id ? theme.primary : theme.border}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          marginBottom: '8px',
                          backgroundColor: newMemberForm.userId === user.id ? theme.primary + '20' : theme.surface
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: user.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          marginRight: '12px'
                        }}>
                          {user.avatar}
                        </div>
                        <div>
                          <div style={{
                            fontWeight: '600',
                            color: theme.text,
                            marginBottom: '2px'
                          }}>
                            {user.name}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: theme.textSecondary
                          }}>
                            {user.email} • {user.department}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Role Selection */}
              {newMemberForm.userId && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: theme.text
                  }}>
                    Select Role
                  </label>
                  <select
                    value={newMemberForm.roleId}
                    onChange={(e) => setNewMemberForm(prev => ({ ...prev, roleId: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      backgroundColor: theme.background,
                      color: theme.text,
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Select a role...</option>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Add Member Button */}
              {newMemberForm.userId && newMemberForm.roleId && (
                <button
                  onClick={() => {
                    const selectedUser = searchResults.find(u => u.id === newMemberForm.userId);
                    if (selectedUser) {
                      handleAddMember(selectedUser);
                    }
                  }}
                  disabled={addingMember}
                  style={{
                    width: '100%',
                    backgroundColor: theme.primary,
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: addingMember ? 'not-allowed' : 'pointer',
                    opacity: addingMember ? 0.7 : 1,
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {addingMember ? 'Adding...' : 'Add Team Member'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;