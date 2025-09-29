import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UploadModal from './UploadModal';
import ProjectCreationWizard from './ProjectCreationWizard';
import TeamManagement from './TeamManagement';
import ApiExplorer from './ApiExplorer';
import AIWritingThreePanel from './AIWritingThreePanel';
import ComplianceManager from './ComplianceManager';
import ProjectCard from './ProjectCard';
import UserPreferences from './UserPreferences';
import AdminSettings from './AdminSettings';

const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('projects');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [themeKey, setThemeKey] = useState('light');
  const [customTheme, setCustomTheme] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showApiExplorer, setShowApiExplorer] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectView, setShowProjectView] = useState(false);
  const [showProjectEdit, setShowProjectEdit] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    dueDate: '',
    owner: null,
    status: 'active'
  });
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedProjectForAI, setSelectedProjectForAI] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showProjectWizard, setShowProjectWizard] = useState(false);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [selectedTeamProject, setSelectedTeamProject] = useState(null);
  const [aiHealth, setAiHealth] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    status: [],
    priority: [],
    dueDateRange: '',
    customDueDateStart: '',
    customDueDateEnd: '',
    documentType: [],
    agency: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [savedFilterPresets, setSavedFilterPresets] = useState({});
  const [presetName, setPresetName] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Helper function to show notifications
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Mock users data for owner selection
  const mockUsers = [
    { id: 1, name: 'Alice Johnson', email: 'alice.johnson@agency.gov', avatar: 'A', color: '#007bff' },
    { id: 2, name: 'Bob Williams', email: 'bob.williams@agency.gov', avatar: 'B', color: '#28a745' },
    { id: 3, name: 'Carol Martinez', email: 'carol.martinez@agency.gov', avatar: 'C', color: '#dc3545' },
    { id: 4, name: 'David Chen', email: 'david.chen@agency.gov', avatar: 'D', color: '#6f42c1' },
    { id: 5, name: 'Elena Rodriguez', email: 'elena.rodriguez@agency.gov', avatar: 'E', color: '#fd7e14' },
    { id: 6, name: 'Frank Thompson', email: 'frank.thompson@agency.gov', avatar: 'F', color: '#20c997' }
  ];

  // Function to get random user for mock data
  const getRandomUser = () => {
    return mockUsers[Math.floor(Math.random() * mockUsers.length)];
  };

  // Load saved preferences on component mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        if (preferences.themeKey) {
          setThemeKey(preferences.themeKey);
        }
        if (preferences.customTheme) {
          setCustomTheme(preferences.customTheme);
        }
        if (preferences.sortBy) {
          setSortBy(preferences.sortBy);
        }
        if (preferences.sortOrder) {
          setSortOrder(preferences.sortOrder);
        }
        if (preferences.sidebarCollapsed !== undefined) {
          setSidebarCollapsed(preferences.sidebarCollapsed);
        }
      } catch (error) {
        console.warn('Failed to load saved preferences:', error);
      }
    }

    // Check URL parameters for project selection
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    if (projectId && activeTab === 'ai-writing') {
      // Find and set the selected project when AI writing tab is active
      loadProjects().then(() => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          setSelectedProjectForAI(project);
        }
      });
    }
  }, []);

  // Load projects when component mounts and when switching to projects tab
  useEffect(() => {
    if (activeTab === 'projects') {
      loadProjects();
    }
  }, [activeTab]);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      // Use the new enhanced project API
      const response = await fetch(`${apiUrl}/api/projects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        const projects = result.data?.projects || result.data || [];

        // Transform projects to match UI expectations
        const transformedProjects = projects.map(project => ({
          id: project.id,
          title: project.title,
          description: project.description || '',
          documentType: project.project_type || 'RFP',
          dueDate: project.estimated_completion_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: project.created_at,
          status: project.status,
          owner: {
            id: project.created_by,
            name: project.owner_name || 'Unknown User',
            email: project.owner_email || '',
            avatar: (project.owner_name || 'U')[0].toUpperCase(),
            color: `hsl(${Math.abs(project.created_by * 137) % 360}, 50%, 50%)`
          },
          // Enhanced project data
          agency: project.agency_name,
          department: project.department_name,
          teamSize: project.team_size || 1,
          progressPercentage: project.progress_percentage || 0,
          healthStatus: project.health_status || 'green',
          documentCount: project.document_count || 0,
          priorityLevel: project.priority_level || 3,
          classificationLevel: project.classification_level,
          complianceFramework: project.compliance_framework,
          estimatedValue: project.estimated_value
        }));

        // Sort by creation date (newest first)
        transformedProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setProjects(transformedProjects);
      } else if (response.status === 404) {
        // No projects found - this is normal
        setProjects([]);
      } else {
        console.error('API error:', response.status, response.statusText);
        // Fallback to document-based projects if new API is not available
        await loadDocumentBasedProjects();
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      // Fallback to document-based projects
      await loadDocumentBasedProjects();
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fallback method for document-based projects
  const loadDocumentBasedProjects = async () => {
    try {
      let supportedDocTypes = ['solicitations'];

      try {
        const structureResponse = await fetch(`${apiUrl}/api/documents/structure`);
        if (structureResponse.ok) {
          const structureResult = await structureResponse.json();
          if (structureResult.data && structureResult.data.documentTypes) {
            supportedDocTypes = Object.keys(structureResult.data.documentTypes);
          }
        }
      } catch (err) {
        console.warn('Could not fetch document structure, using default types:', err);
      }

      const allProjects = [];

      for (const docType of supportedDocTypes) {
        try {
          const response = await fetch(`${apiUrl}/api/documents/projects?documentType=${docType}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();
            const projects = result.data || [];
            projects.forEach(project => {
              if (project.name || project) {
                const projectName = typeof project === 'string' ? project : project.name;
                const projectDesc = typeof project === 'object' ? project.description : '';
                const owner = (typeof project === 'object' && project.owner) ? project.owner : getRandomUser();

                allProjects.push({
                  id: `${docType}-${projectName}`,
                  title: projectName,
                  description: projectDesc || '',
                  documentType: docType.toUpperCase(),
                  dueDate: (typeof project === 'object' && project.dueDate) ?
                    project.dueDate :
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  createdAt: (typeof project === 'object' && project.createdAt) ?
                    project.createdAt :
                    new Date().toISOString(),
                  status: (typeof project === 'object' && project.status) ?
                    project.status :
                    'active',
                  owner: owner,
                  // Default enhanced data
                  teamSize: 1,
                  progressPercentage: 0,
                  healthStatus: 'green',
                  documentCount: 0
                });
              }
            });
          }
        } catch (err) {
          if (err.name === 'TypeError' && err.message.includes('fetch')) {
            console.warn(`Network error loading projects for ${docType}:`, err.message);
          }
        }
      }

      allProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setProjects(allProjects);
    } catch (err) {
      console.error('Failed to load fallback projects:', err);
      setProjects([]);
    }
  };

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Listen for manage team events from AI Writing panel
    const handleManageTeamEvent = (event) => {
      const project = event.detail;
      handleManageTeam(project);
    };

    window.addEventListener('manageTeam', handleManageTeamEvent);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('manageTeam', handleManageTeamEvent);
    };
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('[data-user-menu]')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserMenu]);

  // Theme definitions
  const themes = {
    light: {
      primary: '#007bff',
      secondary: '#6c757d',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#212529',
      textSecondary: '#6c757d',
      border: '#dee2e6',
      sidebar: '#ffffff',
      sidebarText: '#495057'
    },
    dark: {
      primary: '#4299e1',
      secondary: '#718096',
      background: '#1a202c',
      surface: '#2d3748',
      text: '#e2e8f0',
      textSecondary: '#a0aec0',
      border: '#4a5568',
      sidebar: '#2d3748',
      sidebarText: '#e2e8f0'
    },
    blue: {
      primary: '#3182ce',
      secondary: '#63b3ed',
      background: '#f7fafc',
      surface: '#edf2f7',
      text: '#2d3748',
      textSecondary: '#4a5568',
      border: '#cbd5e0',
      sidebar: '#ebf8ff',
      sidebarText: '#2b6cb0'
    },
    nature: {
      primary: '#38a169',
      secondary: '#68d391',
      background: '#f7fafc',
      surface: '#edf2f7',
      text: '#2d3748',
      textSecondary: '#4a5568',
      border: '#cbd5e0',
      sidebar: '#f0fff4',
      sidebarText: '#2f855a'
    }
  };

  const currentTheme = customTheme || themes[themeKey];

  // Filter menu items based on user role
  const allMenuItems = [
    { id: 'projects', icon: '📋', label: 'Projects', active: true },
    { id: 'ai-writing', icon: '🤖', label: 'AI Writing' },
    { id: 'compliance', icon: '🛡️', label: 'Compliance' },
    { id: 'admin', icon: '⚙️', label: 'Admin Settings', adminOnly: true }
  ];

  const menuItems = allMenuItems.filter(item => !item.adminOnly || isAdmin());

  const handleThemeChange = (newTheme) => {
    if (typeof newTheme === 'string') {
      setThemeKey(newTheme);
      setCustomTheme(null);
      // Save preset theme preference
      localStorage.setItem('userPreferences', JSON.stringify({
        themeKey: newTheme,
        customTheme: null
      }));
    } else {
      setCustomTheme(newTheme);
      // Save custom theme preference
      localStorage.setItem('userPreferences', JSON.stringify({
        themeKey: themeKey,
        customTheme: newTheme
      }));
    }
    setShowUserMenu(false);
  };

  const handleViewProject = (project) => {
    setSelectedProject(project);
    setShowProjectView(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setEditForm({
      title: project.title,
      dueDate: project.dueDate,
      owner: project.owner,
      status: project.status
    });
    setShowProjectEdit(true);
  };

  const handleSaveProject = () => {
    // Update the project in the projects array
    const updatedProjects = projects.map(project => {
      if (project.id === editingProject.id) {
        return {
          ...project,
          title: editForm.title,
          dueDate: editForm.dueDate,
          owner: editForm.owner,
          status: editForm.status
        };
      }
      return project;
    });

    setProjects(updatedProjects);
    setShowProjectEdit(false);
    setEditingProject(null);
    setEditForm({
      title: '',
      dueDate: '',
      owner: null,
      status: 'active'
    });
  };

  const handleCancelEdit = () => {
    setShowProjectEdit(false);
    setEditingProject(null);
    setEditForm({
      title: '',
      dueDate: '',
      owner: null,
      status: 'active'
    });
  };

  const handleProjectClick = (project) => {
    setSelectedProjectForAI(project);
    setActiveTab('ai-writing');
    // Update URL to include project parameter
    const url = new URL(window.location);
    url.searchParams.set('project', project.id);
    window.history.pushState({}, '', url);
  };

  const handleProjectCreated = (newProject) => {
    // Refresh the projects list
    loadProjects();
  };

  const handleManageTeam = (project) => {
    setSelectedTeamProject(project);
    setShowTeamManagement(true);
  };

  const handleArchiveProject = async (project) => {
    try {
      // Optimistic update - remove from UI immediately
      setProjects(prevProjects =>
        prevProjects.filter(p => p.id !== project.id)
      );

      // If this was the selected project, clear it
      if (selectedProject?.id === project.id) {
        setSelectedProject(null);
        setShowProjectView(false);
      }

      // Try to make the API call
      const response = await fetch(`${apiUrl}/api/projects/${project.id}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archivedBy: 1 // TODO: Replace with actual user ID from auth
        })
      });

      if (response.ok) {
        // Project archived successfully - no need to log in production
      } else if (response.status === 404) {
        // Archive endpoint not available, but we've already updated the UI
        // Silently handle this case as it's expected behavior
      } else {
        // Restore the project if there was an error
        setProjects(prevProjects => [...prevProjects, project]);
        console.error('Failed to archive project');
        alert('Failed to archive project. Please try again.');
      }
    } catch (error) {
      // Restore the project if there was a network error
      setProjects(prevProjects => [...prevProjects, project]);
      console.error('Error archiving project:', error);
      alert('An error occurred while archiving the project.');
    }
  };

  // Load saved filter presets from localStorage
  useEffect(() => {
    const savedPresets = localStorage.getItem('projectFilterPresets');
    if (savedPresets) {
      setSavedFilterPresets(JSON.parse(savedPresets));
    }

    // Load user's default filter preference
    const defaultFilter = localStorage.getItem('defaultProjectFilter');
    if (defaultFilter) {
      setFilters(JSON.parse(defaultFilter));
    }
  }, []);

  // Filter projects based on current filter settings
  const filterProjects = useCallback((projectsToFilter) => {
    return projectsToFilter.filter(project => {
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(project.status)) {
        return false;
      }

      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(project.priorityLevel)) {
        return false;
      }

      // Document type filter
      if (filters.documentType.length > 0 && !filters.documentType.includes(project.documentType)) {
        return false;
      }

      // Agency filter
      if (filters.agency && project.agency && !project.agency.toLowerCase().includes(filters.agency.toLowerCase())) {
        return false;
      }

      // Due date range filter
      if (filters.dueDateRange) {
        const projectDueDate = new Date(project.dueDate);
        const today = new Date();

        switch (filters.dueDateRange) {
          case 'next7days':
            const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            if (projectDueDate < today || projectDueDate > next7Days) return false;
            break;
          case 'next20days':
            const next20Days = new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000);
            if (projectDueDate < today || projectDueDate > next20Days) return false;
            break;
          case 'overdue':
            if (projectDueDate >= today) return false;
            break;
          case 'custom':
            if (filters.customDueDateStart && projectDueDate < new Date(filters.customDueDateStart)) return false;
            if (filters.customDueDateEnd && projectDueDate > new Date(filters.customDueDateEnd)) return false;
            break;
        }
      }

      return true;
    });
  }, [filters]);

  // Save filter preset
  const saveFilterPreset = () => {
    if (!presetName.trim()) {
      alert('Please enter a name for this filter preset');
      return;
    }

    const newPresets = {
      ...savedFilterPresets,
      [presetName]: { ...filters }
    };

    setSavedFilterPresets(newPresets);
    localStorage.setItem('projectFilterPresets', JSON.stringify(newPresets));
    setPresetName('');
    showNotification(`Filter preset "${presetName}" saved successfully`);
  };

  // Load filter preset
  const loadFilterPreset = (presetName) => {
    if (savedFilterPresets[presetName]) {
      setFilters(savedFilterPresets[presetName]);
    }
  };

  // Set as default filter
  const setAsDefaultFilter = () => {
    localStorage.setItem('defaultProjectFilter', JSON.stringify(filters));
    showNotification('Filter settings saved as your default view');
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      dueDateRange: '',
      customDueDateStart: '',
      customDueDateEnd: '',
      documentType: [],
      agency: ''
    });
  };

  // Delete filter preset
  const deleteFilterPreset = (presetName) => {
    if (window.confirm(`Are you sure you want to delete the "${presetName}" filter preset?`)) {
      const newPresets = { ...savedFilterPresets };
      delete newPresets[presetName];
      setSavedFilterPresets(newPresets);
      localStorage.setItem('projectFilterPresets', JSON.stringify(newPresets));
    }
  };

  const sortProjects = useCallback((projectsToSort) => {
    const sorted = [...projectsToSort].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'dueDate':
          aValue = new Date(a.dueDate);
          bValue = new Date(b.dueDate);
          break;
        case 'created':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'type':
          aValue = a.documentType.toLowerCase();
          bValue = b.documentType.toLowerCase();
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case 'owner':
          aValue = a.owner.name.toLowerCase();
          bValue = b.owner.name.toLowerCase();
          break;
        case 'progress':
          aValue = a.progressPercentage || 0;
          bValue = b.progressPercentage || 0;
          break;
        case 'health':
          const healthOrder = { 'green': 1, 'yellow': 2, 'red': 3 };
          aValue = healthOrder[a.healthStatus] || 4;
          bValue = healthOrder[b.healthStatus] || 4;
          break;
        case 'priority':
          aValue = a.priorityLevel || 3;
          bValue = b.priorityLevel || 3;
          break;
        case 'teamSize':
          aValue = a.teamSize || 1;
          bValue = b.teamSize || 1;
          break;
        case 'agency':
          aValue = (a.agency || '').toLowerCase();
          bValue = (b.agency || '').toLowerCase();
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [sortBy, sortOrder]);

  // Memoized filtered and sorted projects to improve performance
  const filteredAndSortedProjects = useMemo(() => {
    return sortProjects(filterProjects(projects));
  }, [projects, filterProjects, sortProjects]);

  const handleSortChange = (newSortBy) => {
    let newSortOrder;
    if (sortBy === newSortBy) {
      // Toggle order if same sort field
      newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOrder(newSortOrder);
    } else {
      // New sort field, default to appropriate order
      setSortBy(newSortBy);
      const ascendingFields = ['name', 'type', 'owner', 'agency', 'status'];
      const descendingFields = ['created', 'dueDate', 'progress', 'priority', 'teamSize', 'health'];
      newSortOrder = ascendingFields.includes(newSortBy) ? 'asc' : 'desc';
      setSortOrder(newSortOrder);
    }

    // Save sort preferences
    const savedPreferences = localStorage.getItem('userPreferences');
    const preferences = savedPreferences ? JSON.parse(savedPreferences) : {};
    preferences.sortBy = newSortBy;
    preferences.sortOrder = newSortOrder;
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
  };

  const handleSidebarToggle = () => {
    const newCollapsedState = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsedState);

    // Save sidebar state to preferences
    const savedPreferences = localStorage.getItem('userPreferences');
    const preferences = savedPreferences ? JSON.parse(savedPreferences) : {};
    preferences.sidebarCollapsed = newCollapsedState;
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
  };

  const getHeaderContent = () => {
    switch (activeTab) {
      case 'projects':
        return (
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: currentTheme.text }}>
              📋 Projects
            </h1>
            <p style={{
              margin: '2px 0 0 0',
              fontSize: '14px',
              color: currentTheme.textSecondary
            }}>
              Manage your government proposal projects
            </p>
          </div>
        );
      case 'ai-writing':
        if (selectedProjectForAI) {
          return (
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '20px',
                color: currentTheme.text,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🤖 AI Writing - {selectedProjectForAI.title}
                <span
                  onClick={() => {
                    // We need to access the right panel state from AIWritingThreePanel
                    // For now, we'll create a simple click handler
                    const event = new CustomEvent('toggleRightPanel');
                    window.dispatchEvent(event);
                  }}
                  style={{
                    fontSize: '18px',
                    cursor: 'pointer',
                    opacity: 0.7,
                    transition: 'opacity 0.2s ease'
                  }}
                  title="Toggle project details"
                  onMouseOver={(e) => e.target.style.opacity = '1'}
                  onMouseOut={(e) => e.target.style.opacity = '0.7'}
                >
                  ℹ️
                </span>
              </h1>
              <p style={{
                margin: '2px 0 0 0',
                fontSize: '14px',
                color: currentTheme.textSecondary
              }}>
                {selectedProjectForAI.documentType} • Due: {new Date(selectedProjectForAI.dueDate).toLocaleDateString()}
              </p>
            </div>
          );
        }
        return (
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: currentTheme.text }}>
              🤖 AI Writing Assistant
            </h1>
            <p style={{
              margin: '2px 0 0 0',
              fontSize: '14px',
              color: currentTheme.textSecondary
            }}>
              Select a project to start writing
            </p>
          </div>
        );
      case 'compliance':
        return (
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: currentTheme.text }}>
              🛡️ Compliance Manager
            </h1>
            <p style={{
              margin: '2px 0 0 0',
              fontSize: '14px',
              color: currentTheme.textSecondary
            }}>
              Ensure compliance with government requirements
            </p>
          </div>
        );
      case 'admin':
        return (
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: currentTheme.text }}>
              ⚙️ Admin Settings
            </h1>
            <p style={{
              margin: '2px 0 0 0',
              fontSize: '14px',
              color: currentTheme.textSecondary
            }}>
              Configure system settings and preferences
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'projects':
        return (
          <div style={{ padding: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <h2 style={{ margin: 0, color: currentTheme.text }}>Your Projects</h2>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                {/* Sort Dropdown */}
                {projects.length > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: currentTheme.textSecondary
                    }}>
                      Sort by:
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => handleSortChange(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${currentTheme.border}`,
                        backgroundColor: currentTheme.surface,
                        color: currentTheme.text,
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="created">Created Date</option>
                      <option value="name">Name</option>
                      <option value="dueDate">Due Date</option>
                      <option value="type">Project Type</option>
                      <option value="status">Status</option>
                      <option value="owner">Owner</option>
                      <option value="progress">Progress</option>
                      <option value="health">Health Status</option>
                      <option value="priority">Priority</option>
                      <option value="teamSize">Team Size</option>
                      <option value="agency">Agency</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      style={{
                        backgroundColor: 'transparent',
                        border: `1px solid ${currentTheme.border}`,
                        color: currentTheme.text,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>

                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      style={{
                        backgroundColor: showFilters ? currentTheme.primary : 'transparent',
                        border: `1px solid ${currentTheme.primary}`,
                        borderBottom: showFilters ? 'none' : `1px solid ${currentTheme.primary}`,
                        color: showFilters ? 'white' : currentTheme.primary,
                        padding: '6px 12px',
                        borderRadius: showFilters ? '6px 6px 0 0' : '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginLeft: '8px',
                        position: 'relative',
                        zIndex: 1,
                        marginBottom: showFilters ? '-1px' : '0'
                      }}
                      title={showFilters ? "Hide Filters" : "Show Filters"}
                    >
                      🔍 {showFilters ? 'Hide Filters' : 'Filter'}
                      {(filters.status.length > 0 || filters.priority.length > 0 || filters.documentType.length > 0 || filters.agency || filters.dueDateRange) && (
                        <span style={{
                          backgroundColor: 'white',
                          color: currentTheme.primary,
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}>
                          {filters.status.length + filters.priority.length + filters.documentType.length + (filters.agency ? 1 : 0) + (filters.dueDateRange ? 1 : 0)}
                        </span>
                      )}
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowProjectWizard(true)}
                    style={{
                      backgroundColor: currentTheme.surface,
                      color: currentTheme.text,
                      border: `1px solid ${currentTheme.border}`,
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    ✨ New Project
                  </button>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    style={{
                      backgroundColor: 'transparent',
                      color: currentTheme.text,
                      border: `1px solid ${currentTheme.border}`,
                      padding: '10px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    📄 Upload Documents
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div style={{
                backgroundColor: currentTheme.surface,
                border: `1px solid ${currentTheme.primary}`,
                borderRadius: '0 8px 8px 8px',
                padding: '20px',
                margin: '0 0 20px 0',
                position: 'relative',
                boxShadow: `0 2px 8px ${currentTheme.primary}20`,
                marginTop: '0'
              }}>
                {/* Filter Panel Header with Close Button */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  paddingBottom: '12px',
                  borderBottom: `1px solid ${currentTheme.border}`
                }}>
                  <h3 style={{
                    margin: 0,
                    color: currentTheme.text,
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🔍 Filter Projects
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: currentTheme.textSecondary,
                      cursor: 'pointer',
                      fontSize: '20px',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = currentTheme.border;
                      e.target.style.color = currentTheme.text;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = currentTheme.textSecondary;
                    }}
                    title="Close filters"
                  >
                    ✕
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  {/* Status Filter */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: currentTheme.text }}>
                      Status
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['active', 'draft', 'submitted', 'overdue'].map(status => (
                        <label key={status} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={filters.status.includes(status)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters(prev => ({ ...prev, status: [...prev.status, status] }));
                              } else {
                                setFilters(prev => ({ ...prev, status: prev.status.filter(s => s !== status) }));
                              }
                            }}
                          />
                          <span style={{ fontSize: '13px', textTransform: 'capitalize', color: currentTheme.text }}>{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: currentTheme.text }}>
                      Priority
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {[1, 2, 3, 4, 5].map(priority => (
                        <label key={priority} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={filters.priority.includes(priority)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters(prev => ({ ...prev, priority: [...prev.priority, priority] }));
                              } else {
                                setFilters(prev => ({ ...prev, priority: prev.priority.filter(p => p !== priority) }));
                              }
                            }}
                          />
                          <span style={{ fontSize: '13px', color: currentTheme.text }}>
                            {priority === 1 ? '⚡ High' : priority === 2 ? '🔥 Med-High' : priority === 3 ? '⭐ Normal' : priority === 4 ? '❄️ Low' : '💤 Very Low'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Document Type Filter */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: currentTheme.text }}>
                      Document Type
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['RFP', 'SOW', 'PWS', 'RFI', 'RFQ'].map(docType => (
                        <label key={docType} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={filters.documentType.includes(docType)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters(prev => ({ ...prev, documentType: [...prev.documentType, docType] }));
                              } else {
                                setFilters(prev => ({ ...prev, documentType: prev.documentType.filter(d => d !== docType) }));
                              }
                            }}
                          />
                          <span style={{ fontSize: '13px', color: currentTheme.text }}>{docType}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Agency Filter */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: currentTheme.text }}>
                      Agency
                    </label>
                    <input
                      type="text"
                      placeholder="Filter by agency..."
                      value={filters.agency}
                      onChange={(e) => setFilters(prev => ({ ...prev, agency: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '6px',
                        backgroundColor: currentTheme.background,
                        color: currentTheme.text,
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  {/* Due Date Range Filter */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: currentTheme.text }}>
                      Due Date
                    </label>
                    <select
                      value={filters.dueDateRange}
                      onChange={(e) => setFilters(prev => ({ ...prev, dueDateRange: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '6px',
                        backgroundColor: currentTheme.background,
                        color: currentTheme.text,
                        fontSize: '13px'
                      }}
                    >
                      <option value="">All dates</option>
                      <option value="overdue">Overdue</option>
                      <option value="next7days">Next 7 days</option>
                      <option value="next20days">Next 20 days</option>
                      <option value="custom">Custom range</option>
                    </select>

                    {filters.dueDateRange === 'custom' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <input
                          type="date"
                          value={filters.customDueDateStart}
                          onChange={(e) => setFilters(prev => ({ ...prev, customDueDateStart: e.target.value }))}
                          style={{
                            flex: 1,
                            padding: '6px',
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: '4px',
                            backgroundColor: currentTheme.background,
                            color: currentTheme.text,
                            fontSize: '12px'
                          }}
                        />
                        <input
                          type="date"
                          value={filters.customDueDateEnd}
                          onChange={(e) => setFilters(prev => ({ ...prev, customDueDateEnd: e.target.value }))}
                          style={{
                            flex: 1,
                            padding: '6px',
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: '4px',
                            backgroundColor: currentTheme.background,
                            color: currentTheme.text,
                            fontSize: '12px'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Filter Actions */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '16px',
                  borderTop: `1px solid ${currentTheme.border}`
                }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={clearFilters}
                      style={{
                        backgroundColor: 'transparent',
                        border: `1px solid ${currentTheme.border}`,
                        color: currentTheme.text,
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Clear All
                    </button>
                    <button
                      onClick={setAsDefaultFilter}
                      style={{
                        backgroundColor: currentTheme.primary,
                        border: 'none',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Set as Default
                    </button>
                  </div>

                  {/* Saved Presets */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Preset name..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      style={{
                        padding: '6px 8px',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '4px',
                        backgroundColor: currentTheme.background,
                        color: currentTheme.text,
                        fontSize: '12px',
                        width: '120px'
                      }}
                    />
                    <button
                      onClick={saveFilterPreset}
                      style={{
                        backgroundColor: currentTheme.secondary,
                        border: 'none',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Save Preset
                    </button>

                    {Object.keys(savedFilterPresets).length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            loadFilterPreset(e.target.value);
                          }
                        }}
                        value=""
                        style={{
                          padding: '6px 8px',
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '4px',
                          backgroundColor: currentTheme.background,
                          color: currentTheme.text,
                          fontSize: '12px'
                        }}
                      >
                        <option value="">Load Preset...</option>
                        {Object.keys(savedFilterPresets).map(presetName => (
                          <option key={presetName} value={presetName}>{presetName}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Active Filters Display */}
                {(filters.status.length > 0 || filters.priority.length > 0 || filters.documentType.length > 0 || filters.agency || filters.dueDateRange) && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: currentTheme.background,
                    borderRadius: '6px',
                    border: `1px solid ${currentTheme.border}`
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: currentTheme.text }}>
                      Active Filters ({filteredAndSortedProjects.length} of {projects.length} projects shown):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {filters.status.map(status => (
                        <span key={status} style={{
                          backgroundColor: currentTheme.primary,
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          textTransform: 'capitalize'
                        }}>
                          Status: {status}
                        </span>
                      ))}
                      {filters.priority.map(priority => (
                        <span key={priority} style={{
                          backgroundColor: currentTheme.primary,
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px'
                        }}>
                          Priority: {priority === 1 ? 'High' : priority === 2 ? 'Med-High' : priority === 3 ? 'Normal' : priority === 4 ? 'Low' : 'Very Low'}
                        </span>
                      ))}
                      {filters.documentType.map(docType => (
                        <span key={docType} style={{
                          backgroundColor: currentTheme.primary,
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px'
                        }}>
                          Type: {docType}
                        </span>
                      ))}
                      {filters.agency && (
                        <span style={{
                          backgroundColor: currentTheme.primary,
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px'
                        }}>
                          Agency: {filters.agency}
                        </span>
                      )}
                      {filters.dueDateRange && (
                        <span style={{
                          backgroundColor: currentTheme.primary,
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px'
                        }}>
                          Due: {filters.dueDateRange === 'custom' ? 'Custom Range' : filters.dueDateRange.replace('next', 'Next ').replace('days', ' days')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loadingProjects ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px',
                color: currentTheme.textSecondary
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '16px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: `3px solid ${currentTheme.border}`,
                    borderTop: `3px solid ${currentTheme.primary}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Loading projects...
                </div>
              </div>
            ) : projects.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                {filteredAndSortedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    title={project.title}
                    dueDate={project.dueDate}
                    documentType={project.documentType}
                    description={project.description}
                    status={project.status}
                    owner={project.owner}
                    theme={currentTheme}
                    project={project}
                    // Enhanced project data
                    agency={project.agency}
                    department={project.department}
                    teamSize={project.teamSize}
                    progressPercentage={project.progressPercentage}
                    healthStatus={project.healthStatus}
                    documentCount={project.documentCount}
                    priorityLevel={project.priorityLevel}
                    classificationLevel={project.classificationLevel}
                    complianceFramework={project.complianceFramework}
                    estimatedValue={project.estimatedValue}
                    onView={handleViewProject}
                    onEdit={handleEditProject}
                    onProjectClick={handleProjectClick}
                    onManageTeam={handleManageTeam}
                    onArchive={handleArchiveProject}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: currentTheme.textSecondary
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px'
                }}>
                  📁
                </div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  color: currentTheme.text
                }}>
                  No Projects Yet
                </h3>
                <p style={{
                  margin: '0 0 20px 0',
                  fontSize: '16px'
                }}>
                  Create your first project by uploading documents
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  style={{
                    backgroundColor: currentTheme.primary,
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  📄 Upload Documents
                </button>
              </div>
            )}
          </div>
        );
      case 'ai-writing':
        // Redirect to projects if no project selected
        if (!selectedProjectForAI) {
          return (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{
                backgroundColor: currentTheme.surface,
                borderRadius: '12px',
                padding: '40px',
                maxWidth: '500px',
                margin: '0 auto',
                border: `1px solid ${currentTheme.border}`
              }}>
                <div style={{
                  fontSize: '64px',
                  marginBottom: '20px'
                }}>
                  🤖
                </div>
                <h2 style={{
                  margin: '0 0 16px 0',
                  color: currentTheme.text,
                  fontSize: '24px'
                }}>
                  Select a Project First
                </h2>
                <p style={{
                  margin: '0 0 20px 0',
                  color: currentTheme.textSecondary,
                  fontSize: '16px'
                }}>
                  Choose a project from your Projects page to start using AI Writing assistance.
                </p>
                <button
                  onClick={() => setActiveTab('projects')}
                  style={{
                    backgroundColor: currentTheme.primary,
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  📋 Go to Projects
                </button>
              </div>
            </div>
          );
        }
        return <AIWritingThreePanel theme={currentTheme} selectedProject={selectedProjectForAI} onAiHealthChange={setAiHealth} />;
      case 'compliance':
        return <ComplianceManager theme={currentTheme} />;
      case 'admin':
        return <AdminSettings theme={currentTheme} />;
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        height: '100vh',
        backgroundColor: currentTheme.background,
        backgroundImage: currentTheme.backgroundImage ? `url("${currentTheme.backgroundImage}")` : 'none',
        backgroundSize: 'auto',
        backgroundRepeat: 'repeat',
        color: currentTheme.text,
        display: 'flex',
        overflow: 'hidden'
      }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarCollapsed ? (isMobile ? '0' : '60px') : '260px',
        backgroundColor: currentTheme.sidebar,
        borderRight: `1px solid ${currentTheme.border}`,
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${currentTheme.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <button
              onClick={handleSidebarToggle}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              ☰
            </button>
          {!sidebarCollapsed && (
            <>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: currentTheme.primary,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold'
              }}>
                🏛️
              </div>
              <div>
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: currentTheme.sidebarText
                }}>
                  nxtProposal
                </div>
                <div style={{
                  fontSize: '12px',
                  color: currentTheme.textSecondary
                }}>
                  AI Assistant
                </div>
              </div>
            </>
          )}
          </div>

          {/* Collapse Arrow Button - only show when expanded */}
          {!sidebarCollapsed && (
            <button
              onClick={handleSidebarToggle}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '4px',
                color: currentTheme.sidebarText
              }}
              title="Collapse sidebar"
            >
              ◀
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                padding: sidebarCollapsed ? '12px 16px' : '12px 16px',
                border: 'none',
                backgroundColor: activeTab === item.id ? currentTheme.primary + '20' : 'transparent',
                color: activeTab === item.id ? currentTheme.primary : currentTheme.sidebarText,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                fontWeight: activeTab === item.id ? '600' : '400',
                borderRadius: sidebarCollapsed ? '0' : '0 20px 20px 0',
                marginRight: sidebarCollapsed ? '0' : '16px',
                marginBottom: '4px'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== item.id) {
                  e.target.style.backgroundColor = currentTheme.border;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== item.id) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div style={{
          padding: '16px',
          borderTop: `1px solid ${currentTheme.border}`,
          position: 'relative'
        }}>
          <button
            data-user-menu
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              width: '100%',
              padding: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: sidebarCollapsed ? '0' : '12px',
              borderRadius: '8px',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              minHeight: '48px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = currentTheme.border}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <div style={{
              width: '32px',
              height: '32px',
              minWidth: '32px',
              minHeight: '32px',
              borderRadius: '50%',
              backgroundColor: user?.avatarUrl ? 'transparent' : currentTheme.primary,
              backgroundImage: user?.avatarUrl ? `url(${user.avatarUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              border: user?.avatarUrl ? `2px solid ${currentTheme.border}` : 'none',
              flexShrink: 0
            }}>
              {!user?.avatarUrl && (user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U')}
            </div>
            {!sidebarCollapsed && (
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{
                  fontWeight: '500',
                  fontSize: '14px',
                  color: currentTheme.sidebarText
                }}>
                  {user?.fullName || user?.firstName || 'User'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: currentTheme.textSecondary
                }}>
                  {user?.email || 'user@gov.agency'}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: currentTheme.primary,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  marginTop: '2px'
                }}>
                  {user?.roleName || user?.role || 'User'}
                </div>
              </div>
            )}
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div data-user-menu style={{
              position: 'fixed',
              bottom: '80px',
              left: sidebarCollapsed ? '80px' : '260px',
              width: sidebarCollapsed ? '200px' : '240px',
              backgroundColor: currentTheme.surface,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '8px',
              padding: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 10000
            }}>
              <button
                onClick={() => {
                  setShowPreferences(true);
                  setShowUserMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: currentTheme.text,
                  cursor: 'pointer',
                  borderRadius: '4px',
                  textAlign: 'left',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = currentTheme.border}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                🎨 Preferences
              </button>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: currentTheme.textSecondary,
                padding: '8px 12px',
                borderBottom: `1px solid ${currentTheme.border}`,
                marginBottom: '8px'
              }}>
                QUICK THEMES
              </div>
              {Object.keys(themes).map(themeName => (
                <button
                  key={themeName}
                  onClick={() => handleThemeChange(themeName)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: themeKey === themeName ? currentTheme.primary + '20' : 'transparent',
                    color: themeKey === themeName ? currentTheme.primary : currentTheme.text,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    textAlign: 'left',
                    fontSize: '14px',
                    textTransform: 'capitalize',
                    marginBottom: '2px'
                  }}
                  onMouseEnter={(e) => {
                    if (themeKey !== themeName) {
                      e.target.style.backgroundColor = currentTheme.border;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (themeKey !== themeName) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {themeName}
                </button>
              ))}

              {/* Logout Button */}
              <div style={{
                borderTop: `1px solid ${currentTheme.border}`,
                marginTop: '8px',
                paddingTop: '8px'
              }}>
                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    await logout();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#dc3545',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#dc354520'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  🚪 Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <header style={{
          backgroundColor: currentTheme.surface,
          borderBottom: `1px solid ${currentTheme.border}`,
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {getHeaderContent()}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* AI Health Status - only show on AI Writing tab */}
            {activeTab === 'ai-writing' && aiHealth && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                backgroundColor: aiHealth.available ? '#d4edda' : '#f8d7da',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                color: aiHealth.available ? '#155724' : '#721c24'
              }}>
                <span>{aiHealth.available ? '✅' : '❌'}</span>
                <span>{aiHealth.available ? 'AI Online' : 'AI Offline'}</span>
              </div>
            )}
            <button
              onClick={() => setShowApiExplorer(!showApiExplorer)}
              style={{
                backgroundColor: showApiExplorer ? currentTheme.primary : currentTheme.secondary,
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🛠 Dev Tools
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: currentTheme.background
        }}>
          {renderMainContent()}
        </main>

        {/* Developer Footer */}
        {showApiExplorer && (
          <div style={{
            backgroundColor: currentTheme.surface,
            borderTop: `1px solid ${currentTheme.border}`,
            padding: '16px 20px'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              color: currentTheme.text,
              fontSize: '16px'
            }}>
              🚀 API Explorer (Developer Tools)
            </h4>
            <ApiExplorer />
          </div>
        )}
      </div>

      {/* User Preferences Modal */}
      {showPreferences && (
        <UserPreferences
          theme={currentTheme}
          onThemeChange={handleThemeChange}
          onClose={() => setShowPreferences(false)}
        />
      )}

      {/* Project View Modal */}
      {showProjectView && selectedProject && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: currentTheme.surface,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                margin: 0,
                color: currentTheme.text,
                fontSize: '24px'
              }}>
                📋 {selectedProject.title}
              </h2>
              <button
                onClick={() => setShowProjectView(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  color: currentTheme.textSecondary,
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ color: currentTheme.text }}>
              {selectedProject.description && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Description:</strong> {selectedProject.description}
                </div>
              )}
              <div style={{ marginBottom: '16px' }}>
                <strong>Due Date:</strong> {selectedProject.dueDate}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Owner:</strong>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginLeft: '8px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: selectedProject.owner.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {selectedProject.owner.avatar}
                  </div>
                  <span>{selectedProject.owner.name}</span>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Status:</strong> {selectedProject.status}
              </div>
              {selectedProject.estimatedValue && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Award Value:</strong> {selectedProject.estimatedValue}
                </div>
              )}

              <div style={{
                marginTop: '24px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={() => {
                    handleManageTeam(selectedProject);
                  }}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  👥 Manage Team
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setShowProjectView(false);
                      handleEditProject(selectedProject);
                    }}
                    style={{
                      backgroundColor: currentTheme.primary,
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ✏️ Edit Project
                  </button>
                  <button
                    onClick={() => setShowProjectView(false)}
                    style={{
                      backgroundColor: 'transparent',
                      color: currentTheme.text,
                      border: `1px solid ${currentTheme.border}`,
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Edit Modal */}
      {showProjectEdit && editingProject && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: currentTheme.surface,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                margin: 0,
                color: currentTheme.text,
                fontSize: '24px'
              }}>
                ✏️ Edit Project
              </h2>
              <button
                onClick={handleCancelEdit}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  color: currentTheme.textSecondary,
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ color: currentTheme.text }}>
              {/* Project Title */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  Project Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${currentTheme.border}`,
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Due Date */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${currentTheme.border}`,
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Owner Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  Project Owner
                </label>
                <select
                  value={editForm.owner ? editForm.owner.id : ''}
                  onChange={(e) => {
                    const selectedUser = mockUsers.find(user => user.id === parseInt(e.target.value));
                    setEditForm({ ...editForm, owner: selectedUser });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${currentTheme.border}`,
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  {mockUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                {editForm.owner && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: currentTheme.background,
                    borderRadius: '6px',
                    border: `1px solid ${currentTheme.border}`
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: editForm.owner.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {editForm.owner.avatar}
                    </div>
                    <span style={{ fontSize: '14px' }}>{editForm.owner.name}</span>
                    <span style={{ fontSize: '12px', color: currentTheme.textSecondary }}>
                      {editForm.owner.email}
                    </span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${currentTheme.border}`,
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={() => {
                    handleManageTeam(editingProject);
                  }}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  👥 Manage Team
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      backgroundColor: 'transparent',
                      color: currentTheme.text,
                      border: `1px solid ${currentTheme.border}`,
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProject}
                    disabled={!editForm.title.trim() || !editForm.dueDate || !editForm.owner}
                    style={{
                      backgroundColor: (!editForm.title.trim() || !editForm.dueDate || !editForm.owner)
                        ? currentTheme.border : currentTheme.primary,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: (!editForm.title.trim() || !editForm.dueDate || !editForm.owner)
                        ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onProjectCreated={() => {
          loadProjects();
          setShowUploadModal(false);
        }}
        droppedFiles={[]} // Layout doesn't have dropped files
        theme={currentTheme}
      />

      {/* Project Creation Wizard */}
      <ProjectCreationWizard
        isOpen={showProjectWizard}
        onClose={() => setShowProjectWizard(false)}
        onProjectCreated={handleProjectCreated}
        theme={currentTheme}
      />

      {/* Team Management */}
      <TeamManagement
        isOpen={showTeamManagement}
        onClose={() => setShowTeamManagement(false)}
        project={selectedTeamProject}
        theme={currentTheme}
      />

      {/* Notification Toast */}
      {notification.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: notification.type === 'success' ? '#28a745' : '#dc3545',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          fontSize: '14px',
          fontWeight: '500',
          maxWidth: '300px',
          animation: 'slideInFromRight 0.3s ease-out'
        }}>
          {notification.message}
        </div>
      )}

      <style>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      </div>
    </>
  );
};

export default Layout;