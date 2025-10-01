import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import DocumentTypeManagement from './DocumentTypeManagement';
import ArchivedProjectsManagement from './ArchivedProjectsManagement';
import GlobalPromptConfig from './GlobalPromptConfig';
import UploadDefaultsConfig from './UploadDefaultsConfig';

const AdminSettings = ({ theme }) => {
  const [documentTypes, setDocumentTypes] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [editingType, setEditingType] = useState(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [newTypeExtensions, setNewTypeExtensions] = useState('');
  const [newTypeMaxSize, setNewTypeMaxSize] = useState('10');

  // Persona management state
  const [personas, setPersonas] = useState([]);
  const [editingPersona, setEditingPersona] = useState(null);
  const [showPersonaForm, setShowPersonaForm] = useState(false);
  const [personaForm, setPersonaForm] = useState({
    name: '',
    displayName: '',
    description: '',
    systemPrompt: '',
    expertiseAreas: [],
    yearsExperience: 20,
    personalityTraits: [],
    specialty: '',
    background: '',
    writingStyle: 'Professional',
    isActive: true,
    isDefault: false
  });

  // Context management state
  const [contextConfig, setContextConfig] = useState({
    documentTypesPriority: ['solicitations', 'requirements', 'references', 'past-performance', 'proposals', 'compliance', 'media'],
    metadataWeights: { agency_match: 5, technology_match: 4, recency: 3, keyword_relevance: 6 },
    modelCategories: { small: { max_tokens: 4000, models: [] }, medium: { max_tokens: 16000, models: [] }, large: { max_tokens: 32000, models: [] } },
    tokenAllocation: { context_percent: 70, generation_percent: 20, buffer_percent: 10 },
    displayPreference: 'tokens',
    ragStrictness: 60,
    retryAttempts: 3,
    buildDelaySeconds: 10,
    warningThreshold: 85,
    fallbackBehavior: 'partial',
    sectionKeywords: {}
  });
  const [contextLoading, setContextLoading] = useState(false);
  const [contextSaving, setContextSaving] = useState(false);

  // Archived projects state
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archiveDays, setArchiveDays] = useState(30);
  const [archivePage, setArchivePage] = useState(1);
  const [archivePagination, setArchivePagination] = useState({});
  const [draggedIndex, setDraggedIndex] = useState(null);

  // User management state
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserRole, setSelectedUserRole] = useState({});

  // Compliance framework management state
  const [complianceFrameworks, setComplianceFrameworks] = useState({});
  const [complianceCategories, setComplianceCategories] = useState([]);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [editingFramework, setEditingFramework] = useState(null);
  const [showFrameworkForm, setShowFrameworkForm] = useState(false);
  const [frameworkForm, setFrameworkForm] = useState({
    code: '',
    name: '',
    description: '',
    categoryId: '',
    agencySpecific: false,
    targetAgencies: [],
    documentationUrl: '',
    version: '',
    isDefault: false
  });

  const apiUrl = API_BASE_URL;

  // Load document structure and personas on component mount
  useEffect(() => {
    loadDocumentStructure();
    loadPersonas();
    loadContextConfiguration();
    loadUsers();
    loadRoles();
    loadComplianceFrameworks();
  }, []);

  const loadDocumentStructure = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/documents/structure`);
      if (response.ok) {
        const result = await response.json();
        setDocumentTypes(result.data?.documentTypes || {});
      } else {
        setError('Failed to load document structure');
      }
    } catch (err) {
      setError('Network error loading document structure');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocumentType = async () => {
    if (!newTypeName.trim()) {
      setError('Document type name is required');
      return;
    }

    const extensions = newTypeExtensions.split(',').map(ext => ext.trim()).filter(ext => ext);
    const maxSize = parseInt(newTypeMaxSize) * 1024 * 1024; // Convert MB to bytes

    const newType = {
      name: newTypeName,
      description: newTypeDescription || `${newTypeName} documents`,
      allowedExtensions: extensions.length > 0 ? extensions : ['.pdf', '.doc', '.docx'],
      maxSize: maxSize,
      subfolders: ['general']
    };

    try {
      setLoading(true);
      // For now, we'll simulate the API call since the backend might not have this endpoint yet
      const updatedTypes = {
        ...documentTypes,
        [newTypeName.toLowerCase().replace(/\s+/g, '_')]: newType
      };
      setDocumentTypes(updatedTypes);
      setSuccessMessage(`Document type "${newTypeName}" added successfully`);

      // Reset form
      setNewTypeName('');
      setNewTypeDescription('');
      setNewTypeExtensions('');
      setNewTypeMaxSize('10');
      setError(null);
    } catch (err) {
      setError('Failed to add document type');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocumentType = async (typeKey) => {
    if (!window.confirm(`Are you sure you want to delete the "${documentTypes[typeKey]?.name}" document type?`)) {
      return;
    }

    try {
      setLoading(true);
      const updatedTypes = { ...documentTypes };
      delete updatedTypes[typeKey];
      setDocumentTypes(updatedTypes);
      setSuccessMessage(`Document type deleted successfully`);
      setError(null);
    } catch (err) {
      setError('Failed to delete document type');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubfolder = async (typeKey, subfolderName) => {
    if (!subfolderName.trim()) return;

    const updatedTypes = { ...documentTypes };
    if (!updatedTypes[typeKey].subfolders.includes(subfolderName)) {
      updatedTypes[typeKey].subfolders.push(subfolderName);
      setDocumentTypes(updatedTypes);
      setSuccessMessage(`Subfolder "${subfolderName}" added successfully`);
    }
  };

  const handleRemoveSubfolder = async (typeKey, subfolderName) => {
    const updatedTypes = { ...documentTypes };
    updatedTypes[typeKey].subfolders = updatedTypes[typeKey].subfolders.filter(
      folder => folder !== subfolderName
    );
    setDocumentTypes(updatedTypes);
    setSuccessMessage(`Subfolder "${subfolderName}" removed successfully`);
  };

  // Persona Management Functions
  const loadPersonas = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/personas`);
      if (response.ok) {
        const result = await response.json();
        setPersonas(result.data || []);
      }
    } catch (err) {
      console.error('Error loading personas:', err);
    }
  };

  // Context management functions
  const loadContextConfiguration = async () => {
    try {
      setContextLoading(true);
      const response = await fetch(`${apiUrl}/api/global-settings/config/context`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Parse JSON strings that come from database
          const config = { ...result.data };

          // Parse JSON fields that might be double-encoded
          if (typeof config.documentTypesPriority === 'string') {
            try { config.documentTypesPriority = JSON.parse(config.documentTypesPriority); } catch (e) {}
          }
          if (typeof config.metadataWeights === 'string') {
            try { config.metadataWeights = JSON.parse(config.metadataWeights); } catch (e) {}
          }
          if (typeof config.modelCategories === 'string') {
            try { config.modelCategories = JSON.parse(config.modelCategories); } catch (e) {}
          }
          if (typeof config.tokenAllocation === 'string') {
            try { config.tokenAllocation = JSON.parse(config.tokenAllocation); } catch (e) {}
          }
          if (typeof config.sectionKeywords === 'string') {
            try { config.sectionKeywords = JSON.parse(config.sectionKeywords); } catch (e) {}
          }

          setContextConfig(config);
        }
      }
    } catch (err) {
      console.error('Error loading context configuration:', err);
    } finally {
      setContextLoading(false);
    }
  };

  const saveContextConfiguration = async () => {
    try {
      setContextSaving(true);
      setError(null);

      const response = await fetch(`${apiUrl}/api/global-settings/config/context`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contextConfig)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccessMessage('Context configuration saved successfully');
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          setError(result.message || 'Failed to save context configuration');
        }
      } else {
        setError('Failed to save context configuration');
      }
    } catch (err) {
      console.error('Error saving context configuration:', err);
      setError('Failed to save context configuration');
    } finally {
      setContextSaving(false);
    }
  };

  const updateMetadataWeight = (key, value) => {
    setContextConfig(prev => ({
      ...prev,
      metadataWeights: {
        ...prev.metadataWeights,
        [key]: parseInt(value)
      }
    }));
  };

  const updateContextSetting = (key, value) => {
    setContextConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const reorderDocumentTypes = (startIndex, endIndex) => {
    const items = Array.from(contextConfig.documentTypesPriority || []);
    const [reorderedItem] = items.splice(startIndex, 1);
    items.splice(endIndex, 0, reorderedItem);

    setContextConfig(prev => ({
      ...prev,
      documentTypesPriority: items
    }));
  };


  const resetContextConfiguration = async () => {
    if (!window.confirm('Are you sure you want to reset all context settings to defaults? This cannot be undone.')) return;

    try {
      setError(null);
      const response = await fetch(`${apiUrl}/api/global-settings/config/context/reset`, {
        method: 'POST'
      });

      if (response.ok) {
        setSuccessMessage('Context configuration reset to defaults successfully');
        loadContextConfiguration(); // Reload the default settings
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to reset context configuration');
      }
    } catch (err) {
      setError('Network error resetting context configuration');
    }
  };

  const handleCreatePersona = async () => {
    try {
      setError(null);

      if (!personaForm.name.trim() || !personaForm.displayName.trim() || !personaForm.systemPrompt.trim()) {
        setError('Name, Display Name, and System Prompt are required');
        return;
      }

      const response = await fetch(`${apiUrl}/api/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personaForm.name,
          displayName: personaForm.displayName,
          description: personaForm.description,
          systemPrompt: personaForm.systemPrompt,
          expertiseAreas: personaForm.expertiseAreas,
          yearsExperience: personaForm.yearsExperience,
          personalityTraits: personaForm.personalityTraits,
          specialty: personaForm.specialty,
          background: personaForm.background,
          writingStyle: personaForm.writingStyle,
          isActive: personaForm.isActive,
          isDefault: personaForm.isDefault
        })
      });

      if (response.ok) {
        setSuccessMessage('Persona created successfully');
        setShowPersonaForm(false);
        resetPersonaForm();
        loadPersonas();
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to create persona');
      }
    } catch (err) {
      setError('Network error creating persona');
    }
  };

  const handleUpdatePersona = async () => {
    try {
      setError(null);

      const response = await fetch(`${apiUrl}/api/personas/${editingPersona}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personaForm)
      });

      if (response.ok) {
        setSuccessMessage('Persona updated successfully');
        setEditingPersona(null);
        setShowPersonaForm(false);
        resetPersonaForm();
        loadPersonas();
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to update persona');
      }
    } catch (err) {
      setError('Network error updating persona');
    }
  };

  const handleDeletePersona = async (id) => {
    if (!window.confirm('Are you sure you want to delete this persona?')) return;

    try {
      const response = await fetch(`${apiUrl}/api/personas/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccessMessage('Persona deleted successfully');
        loadPersonas();
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to delete persona');
      }
    } catch (err) {
      setError('Network error deleting persona');
    }
  };

  const handleSetDefaultPersona = async (id) => {
    try {
      const response = await fetch(`${apiUrl}/api/personas/${id}/default`, {
        method: 'PUT'
      });

      if (response.ok) {
        setSuccessMessage('Default persona updated successfully');
        loadPersonas();
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to update default persona');
      }
    } catch (err) {
      setError('Network error updating default persona');
    }
  };

  const handleEditPersona = (persona) => {
    setPersonaForm({
      name: persona.name,
      displayName: persona.display_name,
      description: persona.description,
      systemPrompt: persona.system_prompt,
      expertiseAreas: persona.expertise_areas,
      yearsExperience: persona.years_experience,
      personalityTraits: persona.personality_traits,
      specialty: persona.specialty,
      background: persona.background,
      writingStyle: persona.writing_style,
      isActive: persona.is_active,
      isDefault: persona.is_default
    });
    setEditingPersona(persona.id);
    setShowPersonaForm(true);
  };

  const resetPersonaForm = () => {
    setPersonaForm({
      name: '',
      displayName: '',
      description: '',
      systemPrompt: '',
      expertiseAreas: [],
      yearsExperience: 20,
      personalityTraits: [],
      specialty: '',
      background: '',
      writingStyle: 'Professional',
      isActive: true,
      isDefault: false
    });
  };

  const handleArrayInputChange = (field, value) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setPersonaForm(prev => ({ ...prev, [field]: items }));
  };

  // User Management Functions
  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch(`${apiUrl}/api/auth/users`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setUsers(result.data || []);
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      setError('Network error loading users');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/roles`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setRoles(result.data || []);
      } else {
        setError('Failed to load roles');
      }
    } catch (err) {
      setError('Network error loading roles');
    }
  };

  // Compliance Framework Management Functions
  const loadComplianceFrameworks = async () => {
    setComplianceLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/compliance/frameworks`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setComplianceFrameworks(result.data.frameworksByCategory || {});

        // Extract categories from the response
        const categories = Object.values(result.data.frameworksByCategory || {}).map(cat => ({
          id: cat.id,
          name: cat.name,
          displayName: cat.displayName,
          description: cat.description,
          colorCode: cat.colorCode
        }));
        setComplianceCategories(categories);
      } else {
        setError('Failed to load compliance frameworks');
      }
    } catch (err) {
      setError('Network error loading compliance frameworks');
      console.error('Error loading compliance frameworks:', err);
    } finally {
      setComplianceLoading(false);
    }
  };

  const resetFrameworkForm = () => {
    setFrameworkForm({
      code: '',
      name: '',
      description: '',
      categoryId: '',
      agencySpecific: false,
      targetAgencies: [],
      documentationUrl: '',
      version: '',
      isDefault: false
    });
    setEditingFramework(null);
  };

  const handleCreateFramework = async () => {
    if (!frameworkForm.code.trim() || !frameworkForm.name.trim()) {
      setError('Framework code and name are required');
      return;
    }

    try {
      // Note: This would need actual API endpoint implementation
      setSuccessMessage('Compliance framework created successfully');
      resetFrameworkForm();
      setShowFrameworkForm(false);
      loadComplianceFrameworks();
    } catch (err) {
      setError('Error creating framework');
      console.error('Error creating framework:', err);
    }
  };

  const handleUpdateFramework = async () => {
    if (!frameworkForm.name.trim()) {
      setError('Framework name is required');
      return;
    }

    try {
      // Note: This would need actual API endpoint implementation
      setSuccessMessage('Compliance framework updated successfully');
      resetFrameworkForm();
      setShowFrameworkForm(false);
      setEditingFramework(null);
      loadComplianceFrameworks();
    } catch (err) {
      setError('Error updating framework');
      console.error('Error updating framework:', err);
    }
  };

  const handleDeleteFramework = async (frameworkId) => {
    if (!window.confirm('Are you sure you want to delete this compliance framework?')) {
      return;
    }

    try {
      // Note: This would need actual API endpoint implementation
      setSuccessMessage('Compliance framework deleted successfully');
      loadComplianceFrameworks();
    } catch (err) {
      setError('Error deleting framework');
      console.error('Error deleting framework:', err);
    }
  };

  const handleEditFramework = (framework) => {
    setFrameworkForm({
      code: framework.code,
      name: framework.name,
      description: framework.description || '',
      categoryId: framework.categoryId || '',
      agencySpecific: framework.agencySpecific || false,
      targetAgencies: framework.targetAgencies || [],
      documentationUrl: framework.documentationUrl || '',
      version: framework.version || '',
      isDefault: framework.isDefault || false
    });
    setEditingFramework(framework.id);
    setShowFrameworkForm(true);
  };

  const handleApproveUser = async (userId, roleId) => {
    try {
      setUsersLoading(true);
      const response = await fetch(`${apiUrl}/api/auth/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ roleId })
      });

      if (response.ok) {
        setSuccessMessage('User approved successfully');
        await loadUsers(); // Reload users list
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to approve user');
      }
    } catch (err) {
      setError('Network error approving user');
    } finally {
      setUsersLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'awaiting_approval': return '#ffc107';
      case 'pending': return '#17a2b8';
      case 'suspended': return '#dc3545';
      case 'inactive': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  // Archived Projects Functions
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
    // loadArchivedProjects will be triggered by useEffect
  };

  // Load archived projects when tab is selected or filters change
  useEffect(() => {
    if (activeTab === 'archivedProjects') {
      loadArchivedProjects();
    }
  }, [activeTab, archiveDays, archivePage]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `2px solid ${theme.border}`
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '28px',
          color: theme.text,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          ⚙️ Administrative Settings
        </h1>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          ❌ {error}
        </div>
      )}

      {successMessage && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          ✅ {successMessage}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '24px',
        borderBottom: `1px solid ${theme.border}`
      }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '12px 20px',
            border: 'none',
            backgroundColor: activeTab === 'users' ? theme.primary : 'transparent',
            color: activeTab === 'users' ? 'white' : theme.text,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          👥 Users
        </button>
        <button
          onClick={() => setActiveTab('documentTypes')}
          style={{
            padding: '12px 20px',
            border: 'none',
            backgroundColor: activeTab === 'documentTypes' ? theme.primary : 'transparent',
            color: activeTab === 'documentTypes' ? 'white' : theme.text,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          📄 Document Types
        </button>
        <button
          onClick={() => setActiveTab('uploadDefaults')}
          style={{
            padding: '12px 20px',
            border: 'none',
            backgroundColor: activeTab === 'uploadDefaults' ? theme.primary : 'transparent',
            color: activeTab === 'uploadDefaults' ? 'white' : theme.text,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          📤 Upload Defaults
        </button>
        <button
          onClick={() => setActiveTab('globalSettings')}
          style={{
            padding: '12px 20px',
            border: 'none',
            backgroundColor: activeTab === 'globalSettings' ? theme.primary : 'transparent',
            color: activeTab === 'globalSettings' ? 'white' : theme.text,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          🌐 Global Settings
        </button>
        <button
          onClick={() => setActiveTab('personas')}
          style={{
            padding: '12px 20px',
            border: 'none',
            backgroundColor: activeTab === 'personas' ? theme.primary : 'transparent',
            color: activeTab === 'personas' ? 'white' : theme.text,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          🎭 AI Personas
        </button>
        <button
          onClick={() => setActiveTab('contextManagement')}
          style={{
            padding: '12px 20px',
            border: 'none',
            backgroundColor: activeTab === 'contextManagement' ? theme.primary : 'transparent',
            color: activeTab === 'contextManagement' ? 'white' : theme.text,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          🧠 Context Management
        </button>
        <button
          onClick={() => setActiveTab('complianceFrameworks')}
          style={{
            padding: '12px 20px',
            border: 'none',
            backgroundColor: activeTab === 'complianceFrameworks' ? theme.primary : 'transparent',
            color: activeTab === 'complianceFrameworks' ? 'white' : theme.text,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          🛡️ Compliance Frameworks
        </button>
        <button
          onClick={() => setActiveTab('archivedProjects')}
          style={{
            padding: '12px 20px',
            border: 'none',
            backgroundColor: activeTab === 'archivedProjects' ? theme.primary : 'transparent',
            color: activeTab === 'archivedProjects' ? 'white' : theme.text,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          🗃️ Archived Projects
        </button>
      </div>

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
          <span style={{ marginLeft: '12px' }}>Loading...</span>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <h2 style={{
            color: theme.text,
            marginBottom: '24px',
            fontSize: '24px',
            fontWeight: '600'
          }}>
            User Management
          </h2>

          {usersLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ color: theme.text }}>Loading users...</div>
            </div>
          ) : (
            <div style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '200px 180px 150px 120px 180px 160px 1fr',
                gap: '16px',
                padding: '16px',
                backgroundColor: theme.border,
                fontWeight: '600',
                fontSize: '14px',
                color: theme.text,
                borderBottom: `1px solid ${theme.border}`
              }}>
                <div>User</div>
                <div>Email</div>
                <div>Role</div>
                <div>Status</div>
                <div>Created</div>
                <div>Last Login</div>
                <div>Actions</div>
              </div>

              {/* Users List */}
              {users.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: theme.textSecondary
                }}>
                  No users found
                </div>
              ) : (
                users.map(user => (
                  <div key={user.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '200px 180px 150px 120px 180px 160px 1fr',
                    gap: '16px',
                    padding: '16px',
                    borderBottom: `1px solid ${theme.border}`,
                    alignItems: 'center'
                  }}>
                    {/* User Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: user.avatarUrl ? 'transparent' : theme.primary,
                        backgroundImage: user.avatarUrl ? `url(${user.avatarUrl})` : 'none',
                        backgroundSize: 'cover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        {!user.avatarUrl && (user.firstName?.charAt(0) || user.email?.charAt(0) || 'U')}
                      </div>
                      <div>
                        <div style={{ fontWeight: '500', color: theme.text }}>
                          {user.fullName || `${user.firstName} ${user.lastName}` || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '12px', color: theme.textSecondary }}>
                          {user.oauthProvider || 'local'}
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div style={{
                      color: theme.text,
                      fontSize: '14px',
                      wordBreak: 'break-all'
                    }}>
                      {user.email}
                    </div>

                    {/* Role */}
                    <div style={{
                      color: theme.text,
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      {user.roleName || user.role || 'No Role'}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        backgroundColor: getStatusBadgeColor(user.status) + '20',
                        color: getStatusBadgeColor(user.status),
                        border: `1px solid ${getStatusBadgeColor(user.status)}40`
                      }}>
                        {user.status}
                      </span>
                    </div>

                    {/* Created Date */}
                    <div style={{
                      color: theme.textSecondary,
                      fontSize: '12px'
                    }}>
                      {formatDateTime(user.createdAt)}
                    </div>

                    {/* Last Login */}
                    <div style={{
                      color: theme.textSecondary,
                      fontSize: '12px'
                    }}>
                      {formatDateTime(user.lastLogin)}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {user.status === 'awaiting_approval' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select
                            value={selectedUserRole[user.id] || ''}
                            onChange={(e) => setSelectedUserRole({
                              ...selectedUserRole,
                              [user.id]: e.target.value
                            })}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              border: `1px solid ${theme.border}`,
                              borderRadius: '4px',
                              backgroundColor: theme.surface,
                              color: theme.text
                            }}
                          >
                            <option value="">Select Role</option>
                            {roles.map(role => (
                              <option key={role.id} value={role.id}>
                                {role.display_name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleApproveUser(user.id, selectedUserRole[user.id])}
                            disabled={!selectedUserRole[user.id]}
                            style={{
                              padding: '4px 12px',
                              fontSize: '12px',
                              border: 'none',
                              borderRadius: '4px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              cursor: selectedUserRole[user.id] ? 'pointer' : 'not-allowed',
                              opacity: selectedUserRole[user.id] ? 1 : 0.5
                            }}
                          >
                            Approve
                          </button>
                        </div>
                      )}
                      {user.status === 'active' && (
                        <div style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          color: theme.textSecondary
                        }}>
                          Active User
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Document Types Tab */}
      {activeTab === 'documentTypes' && !loading && (
        <DocumentTypeManagement theme={theme} />
      )}

      {/* Legacy Document Types Tab (preserved for reference) */}
      {activeTab === 'legacyDocumentTypes' && !loading && (
        <div>
          <div style={{
            backgroundColor: theme.surface,
            padding: '20px',
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: theme.text,
              fontSize: '18px'
            }}>
              Add New Document Type
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: theme.text,
                  fontSize: '14px'
                }}>
                  Type Name *
                </label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g., Contracts"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.background,
                    color: theme.text
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: theme.text,
                  fontSize: '14px'
                }}>
                  Allowed Extensions
                </label>
                <input
                  type="text"
                  value={newTypeExtensions}
                  onChange={(e) => setNewTypeExtensions(e.target.value)}
                  placeholder=".pdf, .doc, .docx"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.background,
                    color: theme.text
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: theme.text,
                  fontSize: '14px'
                }}>
                  Max Size (MB)
                </label>
                <input
                  type="number"
                  value={newTypeMaxSize}
                  onChange={(e) => setNewTypeMaxSize(e.target.value)}
                  min="1"
                  max="100"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.background,
                    color: theme.text
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '600',
                color: theme.text,
                fontSize: '14px'
              }}>
                Description
              </label>
              <textarea
                value={newTypeDescription}
                onChange={(e) => setNewTypeDescription(e.target.value)}
                placeholder="Description for this document type..."
                rows="2"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.background,
                  color: theme.text,
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              onClick={handleAddDocumentType}
              disabled={!newTypeName.trim() || loading}
              style={{
                backgroundColor: newTypeName.trim() && !loading ? theme.primary : theme.border,
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: newTypeName.trim() && !loading ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              ➕ Add Document Type
            </button>
          </div>

          {/* Existing Document Types */}
          <div>
            <h3 style={{
              margin: '0 0 16px 0',
              color: theme.text,
              fontSize: '18px'
            }}>
              Existing Document Types ({Object.keys(documentTypes).length})
            </h3>

            {Object.keys(documentTypes).length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: theme.textSecondary,
                backgroundColor: theme.surface,
                borderRadius: '8px',
                border: `1px solid ${theme.border}`
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <p>No document types configured yet.</p>
                <p style={{ fontSize: '14px' }}>Add your first document type above to get started.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '16px'
              }}>
                {Object.entries(documentTypes).map(([key, type]) => (
                  <DocumentTypeCard
                    key={key}
                    typeKey={key}
                    type={type}
                    theme={theme}
                    onDelete={handleDeleteDocumentType}
                    onAddSubfolder={handleAddSubfolder}
                    onRemoveSubfolder={handleRemoveSubfolder}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Defaults Tab */}
      {activeTab === 'uploadDefaults' && !loading && (
        <UploadDefaultsConfig theme={theme} />
      )}

      {/* Global Settings Tab */}
        {activeTab === 'globalSettings' && !loading && (
          <GlobalPromptConfig theme={theme} />
        )}

      {/* Context Management Tab */}
      {activeTab === 'contextManagement' && !loading && (
        <div>
          <h2 style={{
            color: theme.text,
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🧠 Context Management Configuration
          </h2>

          <div style={{
            display: 'grid',
            gap: '24px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))'
          }}>

            {/* Basic Settings Panel */}
            <div style={{
              backgroundColor: theme.surface,
              padding: '24px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`
            }}>
              <h3 style={{
                color: theme.text,
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📊 Basic Settings
              </h3>

              <div style={{ display: 'grid', gap: '16px' }}>

                {/* Display Preference */}
                <div>
                  <label style={{
                    display: 'block',
                    color: theme.text,
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    Context Display Preference
                  </label>
                  <select style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '4px',
                    backgroundColor: theme.surface,
                    color: theme.text,
                    fontSize: '14px'
                  }}>
                    <option value="tokens">Token Count</option>
                    <option value="words">Word Count</option>
                    <option value="characters">Character Count</option>
                  </select>
                </div>

                {/* Build Delay */}
                <div>
                  <label style={{
                    display: 'block',
                    color: theme.text,
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    Context Build Delay: 10 seconds
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    defaultValue="10"
                    style={{
                      width: '100%',
                      marginBottom: '8px'
                    }}
                  />
                  <div style={{
                    fontSize: '12px',
                    color: theme.textSecondary,
                    textAlign: 'center'
                  }}>
                    5s ← → 60s
                  </div>
                </div>

                {/* Retry Attempts */}
                <div>
                  <label style={{
                    display: 'block',
                    color: theme.text,
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    Retry Attempts: 3
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    defaultValue="3"
                    style={{
                      width: '100%',
                      marginBottom: '8px'
                    }}
                  />
                  <div style={{
                    fontSize: '12px',
                    color: theme.textSecondary,
                    textAlign: 'center'
                  }}>
                    1 ← → 5
                  </div>
                </div>

              </div>
            </div>

            {/* RAG Controls Panel */}
            <div style={{
              backgroundColor: theme.surface,
              padding: '24px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`
            }}>
              <h3 style={{
                color: theme.text,
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🎯 RAG & Context Controls
              </h3>

              <div style={{ display: 'grid', gap: '16px' }}>

                {/* RAG Strictness */}
                <div>
                  <label style={{
                    display: 'block',
                    color: theme.text,
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    RAG Strictness: {contextConfig.ragStrictness || 60}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={contextConfig.ragStrictness || 60}
                    onChange={(e) => updateContextSetting('ragStrictness', parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      marginBottom: '8px'
                    }}
                  />
                  <div style={{
                    fontSize: '12px',
                    color: theme.textSecondary,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>Flexible (0%)</span>
                    <span>Moderate (50%)</span>
                    <span>Strict (100%)</span>
                  </div>
                </div>

                {/* Context Allocation */}
                <div>
                  <label style={{
                    display: 'block',
                    color: theme.text,
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    Context Allocation (Context/Generation/Buffer)
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '70% 20% 10%',
                    gap: '8px',
                    fontSize: '12px',
                    color: theme.textSecondary,
                    textAlign: 'center',
                    marginBottom: '8px'
                  }}>
                    <span>Context: 70%</span>
                    <span>Generation: 20%</span>
                    <span>Buffer: 10%</span>
                  </div>
                  <div style={{
                    height: '20px',
                    display: 'grid',
                    gridTemplateColumns: '70% 20% 10%',
                    gap: '2px',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ backgroundColor: theme.primary }}></div>
                    <div style={{ backgroundColor: theme.warning || '#f59e0b' }}></div>
                    <div style={{ backgroundColor: theme.textSecondary }}></div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Document Priority Management */}
          <div style={{
            backgroundColor: theme.surface,
            padding: '24px',
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            marginTop: '24px'
          }}>
            <h3 style={{
              color: theme.text,
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📋 Document Priority Rules
            </h3>

            <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: '1fr 1fr' }}>

              {/* Document Type Priority */}
              <div>
                <h4 style={{
                  color: theme.text,
                  fontSize: '16px',
                  fontWeight: '500',
                  marginBottom: '12px'
                }}>
                  Document Type Priority Order
                </h4>
                <div style={{
                  backgroundColor: theme.background,
                  padding: '12px',
                  borderRadius: '6px',
                  border: `1px solid ${theme.border}`,
                  fontSize: '14px',
                  color: theme.text
                }}>
                  <div style={{ marginBottom: '8px', fontWeight: '600' }}>Current Priority (High → Low):</div>
                  <div style={{ margin: '0' }}>
                    {(contextConfig.documentTypesPriority || []).map((docType, index) => (
                      <div
                        key={docType}
                        draggable
                        onDragStart={(e) => {
                          setDraggedIndex(index);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedIndex !== null && draggedIndex !== index) {
                            reorderDocumentTypes(draggedIndex, index);
                          }
                          setDraggedIndex(null);
                        }}
                        onDragEnd={() => setDraggedIndex(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          margin: '2px 0',
                          borderRadius: '4px',
                          backgroundColor: draggedIndex === index ? theme.primary + '20' : 'transparent',
                          cursor: 'grab',
                          border: draggedIndex === index ? `1px dashed ${theme.primary}` : '1px solid transparent',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{
                          color: theme.textSecondary,
                          fontSize: '12px',
                          minWidth: '20px',
                          fontWeight: '600'
                        }}>
                          {index + 1}.
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: theme.textSecondary,
                          marginRight: '6px'
                        }}>
                          ⋮⋮
                        </span>
                        <span style={{ textTransform: 'capitalize', flex: 1 }}>
                          {docType.replace(/-/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: theme.textSecondary,
                    fontStyle: 'italic'
                  }}>
                    ✨ Drag and drop to reorder priority
                  </div>
                </div>
              </div>

              {/* Metadata Weight Sliders */}
              <div>
                <h4 style={{
                  color: theme.text,
                  fontSize: '16px',
                  fontWeight: '500',
                  marginBottom: '12px'
                }}>
                  Metadata Priority Weights (0-10)
                </h4>

                <div style={{ display: 'grid', gap: '12px' }}>

                  {/* Agency Match Weight */}
                  <div>
                    <label style={{
                      display: 'block',
                      color: theme.text,
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '6px'
                    }}>
                      Agency Match: {contextConfig.metadataWeights?.agency_match || 5}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={contextConfig.metadataWeights?.agency_match || 5}
                      onChange={(e) => updateMetadataWeight('agency_match', e.target.value)}
                      style={{
                        width: '100%',
                        marginBottom: '4px'
                      }}
                    />
                    <div style={{
                      fontSize: '11px',
                      color: theme.textSecondary,
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>None (0)</span>
                      <span>Critical (10)</span>
                    </div>
                  </div>

                  {/* Technology Match Weight */}
                  <div>
                    <label style={{
                      display: 'block',
                      color: theme.text,
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '6px'
                    }}>
                      Technology Match: {contextConfig.metadataWeights?.technology_match || 4}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={contextConfig.metadataWeights?.technology_match || 4}
                      onChange={(e) => updateMetadataWeight('technology_match', e.target.value)}
                      style={{
                        width: '100%',
                        marginBottom: '4px'
                      }}
                    />
                    <div style={{
                      fontSize: '11px',
                      color: theme.textSecondary,
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>None (0)</span>
                      <span>Critical (10)</span>
                    </div>
                  </div>

                  {/* Recency Weight */}
                  <div>
                    <label style={{
                      display: 'block',
                      color: theme.text,
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '6px'
                    }}>
                      Document Recency: {contextConfig.metadataWeights?.recency || 3}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={contextConfig.metadataWeights?.recency || 3}
                      onChange={(e) => updateMetadataWeight('recency', e.target.value)}
                      style={{
                        width: '100%',
                        marginBottom: '4px'
                      }}
                    />
                    <div style={{
                      fontSize: '11px',
                      color: theme.textSecondary,
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>None (0)</span>
                      <span>Critical (10)</span>
                    </div>
                  </div>

                  {/* Keyword Relevance Weight */}
                  <div>
                    <label style={{
                      display: 'block',
                      color: theme.text,
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '6px'
                    }}>
                      Keyword Relevance: {contextConfig.metadataWeights?.keyword_relevance || 6}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={contextConfig.metadataWeights?.keyword_relevance || 6}
                      onChange={(e) => updateMetadataWeight('keyword_relevance', e.target.value)}
                      style={{
                        width: '100%',
                        marginBottom: '4px'
                      }}
                    />
                    <div style={{
                      fontSize: '11px',
                      color: theme.textSecondary,
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>None (0)</span>
                      <span>Critical (10)</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Save/Reset Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '32px',
            padding: '24px',
            backgroundColor: theme.surface,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <button
              onClick={resetContextConfiguration}
              style={{
                backgroundColor: 'transparent',
                color: theme.textSecondary,
                border: `1px solid ${theme.border}`,
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Reset to Defaults
            </button>
            <button
              onClick={saveContextConfiguration}
              style={{
                backgroundColor: theme.primary,
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Save Configuration
            </button>
          </div>

        </div>
      )}

      {/* Personas Tab */}
      {activeTab === 'personas' && !loading && (
        <div>
          {/* Header with Add Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: 0, color: theme.text }}>🎭 AI Writing Personas</h2>
            <button
              onClick={() => {
                resetPersonaForm();
                setEditingPersona(null);
                setShowPersonaForm(true);
              }}
              style={{
                backgroundColor: theme.primary,
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              + Create New Persona
            </button>
          </div>

          {/* Personas List */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            {personas.map(persona => (
              <div key={persona.id} style={{
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                padding: '20px',
                position: 'relative'
              }}>
                {/* Default Badge */}
                {persona.is_default && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    DEFAULT
                  </div>
                )}

                <div style={{
                  marginBottom: '12px',
                  paddingRight: persona.is_default ? '80px' : '0'
                }}>
                  <h3 style={{
                    margin: '0 0 4px 0',
                    color: theme.text,
                    fontSize: '18px'
                  }}>
                    {persona.display_name}
                  </h3>
                  <code style={{
                    backgroundColor: theme.background,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: theme.textSecondary
                  }}>
                    {persona.name}
                  </code>
                </div>

                <p style={{
                  color: theme.textSecondary,
                  fontSize: '14px',
                  lineHeight: '1.4',
                  marginBottom: '12px'
                }}>
                  {persona.description}
                </p>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <span style={{
                    backgroundColor: theme.primary + '20',
                    color: theme.primary,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {persona.specialty}
                  </span>
                  <span style={{
                    backgroundColor: theme.background,
                    color: theme.textSecondary,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {persona.years_experience} years
                  </span>
                  <span style={{
                    backgroundColor: theme.background,
                    color: theme.textSecondary,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {persona.writing_style}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px'
                }}>
                  <button
                    onClick={() => handleEditPersona(persona)}
                    style={{
                      backgroundColor: 'transparent',
                      color: theme.primary,
                      border: `1px solid ${theme.primary}`,
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Edit
                  </button>
                  {!persona.is_default && (
                    <button
                      onClick={() => handleSetDefaultPersona(persona.id)}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#28a745',
                        border: '1px solid #28a745',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDeletePersona(persona.id)}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#dc3545',
                      border: '1px solid #dc3545',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    disabled={persona.is_default}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Persona Form Modal */}
          {showPersonaForm && (
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
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: theme.surface,
                padding: '30px',
                borderRadius: '8px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
                border: `1px solid ${theme.border}`
              }}>
                <h3 style={{ margin: '0 0 20px 0', color: theme.text }}>
                  {editingPersona ? 'Edit Persona' : 'Create New Persona'}
                </h3>

                <div style={{ display: 'grid', gap: '16px' }}>
                  {/* Name */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: theme.text }}>
                      Name (ID):
                    </label>
                    <input
                      type="text"
                      value={personaForm.name}
                      onChange={(e) => setPersonaForm(prev => ({ ...prev, name: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.background,
                        color: theme.text
                      }}
                      placeholder="e.g., pentagon-pen"
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: theme.text }}>
                      Display Name:
                    </label>
                    <input
                      type="text"
                      value={personaForm.displayName}
                      onChange={(e) => setPersonaForm(prev => ({ ...prev, displayName: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.background,
                        color: theme.text
                      }}
                      placeholder="e.g., The Pentagon Pen"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: theme.text }}>
                      Description:
                    </label>
                    <textarea
                      value={personaForm.description}
                      onChange={(e) => setPersonaForm(prev => ({ ...prev, description: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.background,
                        color: theme.text,
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                      placeholder="Brief description for license card..."
                    />
                  </div>

                  {/* System Prompt */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: theme.text }}>
                      System Prompt:
                    </label>
                    <textarea
                      value={personaForm.systemPrompt}
                      onChange={(e) => setPersonaForm(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.background,
                        color: theme.text,
                        minHeight: '120px',
                        resize: 'vertical'
                      }}
                      placeholder="You are an expert..."
                    />
                  </div>

                  {/* Two Column Layout */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Specialty */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: theme.text }}>
                        Specialty:
                      </label>
                      <input
                        type="text"
                        value={personaForm.specialty}
                        onChange={(e) => setPersonaForm(prev => ({ ...prev, specialty: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '4px',
                          border: `1px solid ${theme.border}`,
                          backgroundColor: theme.background,
                          color: theme.text
                        }}
                        placeholder="e.g., Senior Proposal Manager"
                      />
                    </div>

                    {/* Years Experience */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: theme.text }}>
                        Years Experience:
                      </label>
                      <input
                        type="number"
                        value={personaForm.yearsExperience}
                        onChange={(e) => setPersonaForm(prev => ({ ...prev, yearsExperience: parseInt(e.target.value) || 20 }))}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '4px',
                          border: `1px solid ${theme.border}`,
                          backgroundColor: theme.background,
                          color: theme.text
                        }}
                        min="0"
                        max="50"
                      />
                    </div>
                  </div>

                  {/* Writing Style */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: theme.text }}>
                      Writing Style:
                    </label>
                    <select
                      value={personaForm.writingStyle}
                      onChange={(e) => setPersonaForm(prev => ({ ...prev, writingStyle: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.background,
                        color: theme.text
                      }}
                    >
                      <option value="Professional">Professional</option>
                      <option value="Technical">Technical</option>
                      <option value="Persuasive">Persuasive</option>
                      <option value="Analytical">Analytical</option>
                      <option value="Strategic">Strategic</option>
                      <option value="Collaborative">Collaborative</option>
                      <option value="Systematic">Systematic</option>
                      <option value="Authoritative">Authoritative</option>
                    </select>
                  </div>

                  {/* Background */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: theme.text }}>
                      Background:
                    </label>
                    <textarea
                      value={personaForm.background}
                      onChange={(e) => setPersonaForm(prev => ({ ...prev, background: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.background,
                        color: theme.text,
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                      placeholder="Professional background and experience..."
                    />
                  </div>

                  {/* Expertise Areas */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: theme.text }}>
                      Expertise Areas (comma-separated):
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(personaForm.expertiseAreas) ? personaForm.expertiseAreas.join(', ') : ''}
                      onChange={(e) => handleArrayInputChange('expertiseAreas', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.background,
                        color: theme.text
                      }}
                      placeholder="e.g., Proposal Strategy, Federal Contracting, Bid Protests"
                    />
                  </div>

                  {/* Personality Traits */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: theme.text }}>
                      Personality Traits (comma-separated):
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(personaForm.personalityTraits) ? personaForm.personalityTraits.join(', ') : ''}
                      onChange={(e) => handleArrayInputChange('personalityTraits', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.background,
                        color: theme.text
                      }}
                      placeholder="e.g., Battle-tested, Strategic, Results-oriented"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', color: theme.text }}>
                      <input
                        type="checkbox"
                        checked={personaForm.isActive}
                        onChange={(e) => setPersonaForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        style={{ marginRight: '8px' }}
                      />
                      Active
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', color: theme.text }}>
                      <input
                        type="checkbox"
                        checked={personaForm.isDefault}
                        onChange={(e) => setPersonaForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                        style={{ marginRight: '8px' }}
                      />
                      Set as Default
                    </label>
                  </div>
                </div>

                {/* Form Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '24px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={() => {
                      setShowPersonaForm(false);
                      setEditingPersona(null);
                      resetPersonaForm();
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingPersona ? handleUpdatePersona : handleCreatePersona}
                    style={{
                      backgroundColor: theme.primary,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    {editingPersona ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compliance Frameworks Tab */}
      {activeTab === 'complianceFrameworks' && !complianceLoading && (
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
              🛡️ Compliance Frameworks Management
            </h2>
            <button
              onClick={() => {
                resetFrameworkForm();
                setShowFrameworkForm(true);
              }}
              style={{
                backgroundColor: theme.primary,
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ➕ Add Framework
            </button>
          </div>

          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            padding: '20px'
          }}>
            {Object.entries(complianceFrameworks).map(([categoryKey, category]) => (
              <div key={categoryKey} style={{
                marginBottom: '24px',
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  backgroundColor: category.colorCode || theme.primary,
                  color: 'white',
                  padding: '12px 16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.3)'
                    }}
                  />
                  {category.displayName}
                  <span style={{
                    fontSize: '12px',
                    opacity: 0.8,
                    marginLeft: 'auto'
                  }}>
                    ({category.frameworks?.length || 0} frameworks)
                  </span>
                </div>

                <div style={{ padding: '16px' }}>
                  {category.frameworks?.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                      gap: '12px'
                    }}>
                      {category.frameworks.map(framework => (
                        <div
                          key={framework.id}
                          style={{
                            backgroundColor: theme.background,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '6px',
                            padding: '12px'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '8px'
                          }}>
                            <div>
                              <h4 style={{
                                margin: '0 0 4px 0',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: theme.text
                              }}>
                                {framework.code}
                              </h4>
                              <div style={{
                                fontSize: '13px',
                                color: theme.text,
                                marginBottom: '4px'
                              }}>
                                {framework.name}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => handleEditFramework(framework)}
                                style={{
                                  backgroundColor: 'transparent',
                                  border: `1px solid ${theme.border}`,
                                  color: theme.text,
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDeleteFramework(framework.id)}
                                style={{
                                  backgroundColor: 'transparent',
                                  border: '1px solid #dc3545',
                                  color: '#dc3545',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>

                          {framework.description && (
                            <p style={{
                              margin: '0 0 8px 0',
                              fontSize: '12px',
                              color: theme.textSecondary,
                              lineHeight: '1.3'
                            }}>
                              {framework.description}
                            </p>
                          )}

                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px',
                            fontSize: '10px'
                          }}>
                            {framework.isDefault && (
                              <span style={{
                                backgroundColor: theme.primary,
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '8px'
                              }}>
                                Default
                              </span>
                            )}
                            {framework.agencySpecific && (
                              <span style={{
                                backgroundColor: '#17a2b8',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '8px'
                              }}>
                                Agency-Specific
                              </span>
                            )}
                            {framework.version && (
                              <span style={{
                                backgroundColor: theme.surface,
                                color: theme.textSecondary,
                                padding: '2px 6px',
                                borderRadius: '8px',
                                border: `1px solid ${theme.border}`
                              }}>
                                v{framework.version}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      color: theme.textSecondary,
                      fontStyle: 'italic',
                      padding: '20px'
                    }}>
                      No frameworks in this category yet.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {showFrameworkForm && (
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
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}>
                <h3 style={{
                  margin: '0 0 20px 0',
                  color: theme.text
                }}>
                  {editingFramework ? 'Edit' : 'Add'} Compliance Framework
                </h3>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontWeight: '600',
                    color: theme.text
                  }}>
                    Framework Code *
                  </label>
                  <input
                    type="text"
                    value={frameworkForm.code}
                    onChange={(e) => setFrameworkForm(prev => ({ ...prev, code: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.surface,
                      color: theme.text
                    }}
                    placeholder="e.g., FAR, NIST, FISMA"
                    disabled={!!editingFramework}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontWeight: '600',
                    color: theme.text
                  }}>
                    Framework Name *
                  </label>
                  <input
                    type="text"
                    value={frameworkForm.name}
                    onChange={(e) => setFrameworkForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.surface,
                      color: theme.text
                    }}
                    placeholder="e.g., Federal Acquisition Regulation"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontWeight: '600',
                    color: theme.text
                  }}>
                    Description
                  </label>
                  <textarea
                    value={frameworkForm.description}
                    onChange={(e) => setFrameworkForm(prev => ({ ...prev, description: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.surface,
                      color: theme.text,
                      minHeight: '80px',
                      resize: 'vertical'
                    }}
                    placeholder="Brief description of this compliance framework"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontWeight: '600',
                    color: theme.text
                  }}>
                    Category
                  </label>
                  <select
                    value={frameworkForm.categoryId}
                    onChange={(e) => setFrameworkForm(prev => ({ ...prev, categoryId: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.surface,
                      color: theme.text
                    }}
                  >
                    <option value="">Select category</option>
                    {complianceCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '24px'
                }}>
                  <button
                    onClick={() => {
                      setShowFrameworkForm(false);
                      resetFrameworkForm();
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: `1px solid ${theme.border}`,
                      color: theme.text,
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingFramework ? handleUpdateFramework : handleCreateFramework}
                    style={{
                      backgroundColor: theme.primary,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    {editingFramework ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Archived Projects Tab */}
      {activeTab === 'archivedProjects' && (
        <ArchivedProjectsManagement theme={theme} />
      )}
    </div>
  );
};

// Document Type Card Component
const DocumentTypeCard = ({ typeKey, type, theme, onDelete, onAddSubfolder, onRemoveSubfolder }) => {
  const [newSubfolder, setNewSubfolder] = useState('');
  const [showAddSubfolder, setShowAddSubfolder] = useState(false);

  const handleAddSubfolder = () => {
    if (newSubfolder.trim()) {
      onAddSubfolder(typeKey, newSubfolder.trim());
      setNewSubfolder('');
      setShowAddSubfolder(false);
    }
  };

  return (
    <div style={{
      backgroundColor: theme.background,
      border: `1px solid ${theme.border}`,
      borderRadius: '8px',
      padding: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '16px',
          color: theme.text,
          fontWeight: '600'
        }}>
          📄 {type.name}
        </h4>
        <button
          onClick={() => onDelete(typeKey)}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🗑️ Delete
        </button>
      </div>

      <p style={{
        margin: '0 0 12px 0',
        fontSize: '14px',
        color: theme.textSecondary,
        lineHeight: '1.4'
      }}>
        {type.description}
      </p>

      <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '12px',
          color: theme.textSecondary,
          marginBottom: '4px'
        }}>
          <strong>Extensions:</strong> {type.allowedExtensions?.join(', ') || 'Not specified'}
        </div>
        <div style={{
          fontSize: '12px',
          color: theme.textSecondary
        }}>
          <strong>Max Size:</strong> {Math.round((type.maxSize || 10485760) / (1024 * 1024))}MB
        </div>
      </div>

      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <strong style={{
            fontSize: '14px',
            color: theme.text
          }}>
            Subfolders:
          </strong>
          <button
            onClick={() => setShowAddSubfolder(!showAddSubfolder)}
            style={{
              backgroundColor: theme.primary,
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ➕ Add
          </button>
        </div>

        {showAddSubfolder && (
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <input
              type="text"
              value={newSubfolder}
              onChange={(e) => setNewSubfolder(e.target.value)}
              placeholder="Subfolder name"
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: '4px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.surface,
                color: theme.text,
                fontSize: '12px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSubfolder()}
            />
            <button
              onClick={handleAddSubfolder}
              style={{
                backgroundColor: theme.primary,
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Add
            </button>
          </div>
        )}

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          {(type.subfolders || []).map((folder) => (
            <div
              key={folder}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: theme.surface,
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                border: `1px solid ${theme.border}`
              }}
            >
              <span style={{ color: theme.text }}>{folder}</span>
              {folder !== 'general' && (
                <button
                  onClick={() => onRemoveSubfolder(typeKey, folder)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#dc3545',
                    cursor: 'pointer',
                    fontSize: '10px',
                    padding: '0 2px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;