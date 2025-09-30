import React, { useState, useEffect } from 'react';
import {
    UPLOAD_DEFAULTS,
    getDocumentTypeOptions,
    getOrderedSubfolders,
    getDefaultClassification
} from '../config/uploadDefaults';
import { API_ENDPOINTS } from '../config/api';

const DocumentUpload = ({ onProjectCreated, isModal = false, selectedProject = null, droppedFiles = [], theme }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [documentType, setDocumentType] = useState(UPLOAD_DEFAULTS.defaultDocumentType);
    const [documentClassification, setDocumentClassification] = useState('');
    const [subfolder, setSubfolder] = useState(UPLOAD_DEFAULTS.defaultSubfolder);
    const [projectName, setProjectName] = useState('');
    const [documentStructure, setDocumentStructure] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResults, setUploadResults] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDescription, setNewProjectDescription] = useState('');
    const [newProjectDueDate, setNewProjectDueDate] = useState('');
    const [availableProjects, setAvailableProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
    const [newProjectOwner, setNewProjectOwner] = useState(null);
    const [uploadConfig, setUploadConfig] = useState(UPLOAD_DEFAULTS);

    // Mock users data for owner selection (same as in Layout.js)
    const mockUsers = [
        { id: 1, name: 'Alice Johnson', email: 'alice.johnson@agency.gov', avatar: 'A', color: '#007bff' },
        { id: 2, name: 'Bob Williams', email: 'bob.williams@agency.gov', avatar: 'B', color: '#28a745' },
        { id: 3, name: 'Carol Martinez', email: 'carol.martinez@agency.gov', avatar: 'C', color: '#dc3545' },
        { id: 4, name: 'David Chen', email: 'david.chen@agency.gov', avatar: 'D', color: '#6f42c1' },
        { id: 5, name: 'Elena Rodriguez', email: 'elena.rodriguez@agency.gov', avatar: 'E', color: '#fd7e14' },
        { id: 6, name: 'Frank Thompson', email: 'frank.thompson@agency.gov', avatar: 'F', color: '#20c997' }
    ];

    // Load upload configuration from backend
    const loadUploadConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/upload-defaults/config', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success && data.data) {
                setUploadConfig(data.data);
                // Update default values with backend configuration
                setDocumentType(data.data.defaultDocumentType);
                setSubfolder(data.data.defaultSubfolder);
            }
        } catch (err) {
            console.error('Failed to load upload configuration:', err);
            // Fall back to default configuration
        }
    };

    // Load document structure and projects on component mount
    useEffect(() => {
        loadDocumentStructure();
        loadAvailableProjects();
        loadUploadConfig();
        // Set default owner to first user
        if (mockUsers.length > 0) {
            setNewProjectOwner(mockUsers[0]);
        }

        // Listen for configuration updates
        const handleConfigUpdate = (event) => {
            if (event.detail) {
                setUploadConfig(event.detail);
                // Update current values if they match the old defaults
                if (documentType === uploadConfig.defaultDocumentType) {
                    setDocumentType(event.detail.defaultDocumentType);
                }
                if (subfolder === uploadConfig.defaultSubfolder) {
                    setSubfolder(event.detail.defaultSubfolder);
                }
            }
        };

        window.addEventListener('uploadDefaultsUpdated', handleConfigUpdate);

        return () => {
            window.removeEventListener('uploadDefaultsUpdated', handleConfigUpdate);
        };
    }, []);

    // Load document classification options when document structure or type changes
    useEffect(() => {
        if (documentType) {
            // Try to get default classification from config first
            const defaultClassification = getDefaultClassification(documentType);

            if (defaultClassification) {
                setDocumentClassification(defaultClassification);
            } else if (documentStructure) {
                // Fall back to first available classification
                const classifications = getDocumentClassificationOptions();
                if (classifications.length > 0) {
                    setDocumentClassification(classifications[0].value);
                }
            }
        }
    }, [documentStructure, documentType]);

    // Pre-populate with dropped files and selected project when props change
    useEffect(() => {
        if (droppedFiles && droppedFiles.length > 0) {
            setSelectedFiles(droppedFiles);
        }

        if (selectedProject) {
            setProjectName(selectedProject.title || '');
            if (selectedProject.documentType) {
                // Map from the project's document type to the form's document type
                const projectDocType = selectedProject.documentType.toLowerCase();
                setDocumentType(projectDocType === 'rfp' || projectDocType === 'rfi' || projectDocType === 'sow' || projectDocType === 'pws' ? 'solicitations' : projectDocType);
            }
        }
    }, [droppedFiles, selectedProject]);

    const loadDocumentStructure = async () => {
        try {
            const response = await fetch('/api/documents/structure');
            if (response.ok) {
                const result = await response.json();
                setDocumentStructure(result.data);
            } else {
                console.error('Failed to load document structure - response not ok:', response.status);
            }
        } catch (err) {
            console.error('Failed to load document structure:', err);
        }
    };

    const loadAvailableProjects = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.PROJECTS);
            if (response.ok) {
                const result = await response.json();
                // Extract projects array from the API response structure
                const projects = result.data?.projects || [];
                // Filter projects by status (only show active projects)
                const activeProjects = projects.filter(project => project.status === 'active');
                setAvailableProjects(activeProjects);
                setFilteredProjects(activeProjects);
            }
        } catch (err) {
            console.error('Failed to load projects:', err);
        }
    };

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        setSelectedFiles(files);
        setError(null);
    };

    const handleDocumentTypeChange = (event) => {
        const newDocType = event.target.value;
        setDocumentType(newDocType);
        setSubfolder(UPLOAD_DEFAULTS.defaultSubfolder); // Reset to default subfolder

        // Set default classification for the new document type
        const defaultClassification = getDefaultClassification(newDocType);
        if (defaultClassification) {
            setDocumentClassification(defaultClassification);
        }

        // Only clear project name if no project is pre-selected
        if (!selectedProject) {
            setProjectName('');
        }

        setShowProjectSuggestions(false);
    };

    const getDocumentClassificationOptions = () => {
        // Use the document structure from the database to get context-specific classifications
        if (!documentStructure || !documentStructure.documentTypes || !documentType) {
            return [];
        }

        const currentDocType = documentStructure.documentTypes[documentType];
        if (!currentDocType || !currentDocType.classifications) {
            // Fallback to subfolders if no classifications defined
            return currentDocType?.subfolders?.map(subfolder => ({
                value: subfolder.toLowerCase().replace(/\s+/g, '_'),
                label: subfolder
            })) || [];
        }

        return currentDocType.classifications.map(classification => ({
            value: classification.key || classification.value || classification.toLowerCase().replace(/\s+/g, '_'),
            label: classification.name || classification.label || classification
        }));
    };

    const handleProjectNameChange = (event) => {
        const value = event.target.value;
        setProjectName(value);

        // Filter projects based on input
        if (value.trim()) {
            const filtered = availableProjects.filter(project =>
                project.title && project.title.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredProjects(filtered);
            setShowProjectSuggestions(filtered.length > 0);
        } else {
            setFilteredProjects(availableProjects);
            setShowProjectSuggestions(false);
        }
    };

    const handleProjectSelect = (projectName) => {
        setProjectName(projectName);
        setShowProjectSuggestions(false);
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) {
            setError('Project name is required');
            return;
        }

        try {
            const response = await fetch('/api/documents/create-project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectName: newProjectName,
                    documentType,
                    description: newProjectDescription,
                    dueDate: newProjectDueDate,
                    owner: newProjectOwner
                })
            });

            if (response.ok) {
                setProjectName(newProjectName);
                setNewProjectName('');
                setNewProjectDescription('');
                setNewProjectDueDate('');
                setNewProjectOwner(mockUsers[0]); // Reset to default owner
                setShowCreateProject(false);
                setError(null);
                // Refresh the projects list
                loadAvailableProjects();
                // Notify parent component that a project was created
                if (onProjectCreated) {
                    onProjectCreated();
                }
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to create project');
            }
        } catch (err) {
            setError('Failed to create project: ' + err.message);
        }
    };

    const handleUpload = async (event) => {
        event.preventDefault();

        if (!selectedFiles.length) {
            setError('Please select at least one file');
            return;
        }

        if (!documentType) {
            setError('Please select a document type');
            return;
        }

        if (!documentClassification) {
            setError('Please select a document classification');
            return;
        }

        setLoading(true);
        setError(null);

        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        formData.append('documentType', documentType);
        formData.append('documentClassification', documentClassification);
        if (subfolder) formData.append('subfolder', subfolder);
        if (projectName) formData.append('projectName', projectName);
        formData.append('metadata', JSON.stringify({
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'user', // In a real app, this would come from auth
            source: 'web-interface'
        }));

        try {
            const response = await fetch(API_ENDPOINTS.DOCUMENTS_UPLOAD, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            setUploadResults(result.data);
            setSelectedFiles([]);
            setError(null);

            // Reset form
            document.getElementById('fileInput').value = '';

            // Notify parent component that documents were uploaded (might have created/updated projects)
            if (onProjectCreated) {
                onProjectCreated();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const getAvailableSubfolders = () => {
        // Default subfolders from config
        const defaultSubfolders = UPLOAD_DEFAULTS.subfolderOrder;

        if (!documentStructure || !documentStructure.documentTypes || !documentType) {
            return defaultSubfolders.slice(0, 4); // Return first 4 default subfolders
        }

        const docType = documentStructure.documentTypes[documentType];
        if (!docType || !docType.subfolders) {
            return defaultSubfolders.slice(0, 4);
        }

        // Use the ordering function from config
        // Use backend configuration if available, otherwise fall back to default ordering
        return uploadConfig.subfolderOrder || getOrderedSubfolders(docType.subfolders);
    };

    const getFileTypeInfo = () => {
        if (!documentStructure || !documentStructure.documentTypes || !documentType) return null;
        const docType = documentStructure.documentTypes[documentType];
        return docType || null;
    };

    return (
        <div style={{ padding: isModal ? '20px' : '20px', maxWidth: '800px', margin: isModal ? '0' : '0 auto' }}>
            {!isModal && <h2 style={{ marginBottom: '20px', color: theme?.text || '#333' }}>📁 Document Management</h2>}

            <form onSubmit={handleUpload} style={{ backgroundColor: theme?.background || '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                {/* Document Type Selection */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: theme?.text || '#000' }}>Document Type:</label>
                    <select
                        value={documentType}
                        onChange={handleDocumentTypeChange}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: `1px solid ${theme?.border || '#ddd'}`,
                            backgroundColor: theme?.surface || 'white',
                            color: theme?.text || '#000'
                        }}
                    >
                        {/* Configurable order from upload defaults */}
                        {(uploadConfig.documentTypeOrder || getDocumentTypeOptions()).map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {getFileTypeInfo() && (
                        <small style={{ color: theme?.textSecondary || '#666', display: 'block', marginTop: '5px' }}>
                            {getFileTypeInfo().description}<br/>
                            Allowed: {getFileTypeInfo().allowedExtensions.join(', ')} |
                            Max size: {Math.round(getFileTypeInfo().maxSize / (1024 * 1024))}MB
                        </small>
                    )}
                </div>

                {/* Document Classification */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: theme?.text || '#000' }}>Document Classification:</label>
                    <select
                        value={documentClassification}
                        onChange={(e) => setDocumentClassification(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: `1px solid ${theme?.border || '#ddd'}`,
                            backgroundColor: theme?.surface || 'white',
                            color: theme?.text || '#000'
                        }}
                        required
                    >
                        <option value="">Select document classification</option>
                        {getDocumentClassificationOptions().map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <small style={{ color: theme?.textSecondary || '#666', display: 'block', marginTop: '5px' }}>
                        Choose the specific type of document being uploaded
                    </small>
                </div>

                {/* Subfolder Selection */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: theme?.text || '#000' }}>Subfolder:</label>
                    <select
                        value={subfolder}
                        onChange={(e) => setSubfolder(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: `1px solid ${theme?.border || '#ddd'}`,
                            backgroundColor: theme?.surface || 'white',
                            color: theme?.text || '#000'
                        }}
                    >
                        {getAvailableSubfolders().map(folder => (
                            <option key={folder} value={folder}>{folder}</option>
                        ))}
                    </select>
                </div>

                {/* Project Selection/Creation */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: theme?.text || '#000' }}>Project:</label>
                    {selectedProject ? (
                        /* Read-only project display when project is pre-selected */
                        <div style={{
                            padding: '8px',
                            borderRadius: '4px',
                            border: `1px solid ${theme?.border || '#ddd'}`,
                            backgroundColor: theme?.background || '#f8f9fa',
                            color: theme?.text || '#000',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{selectedProject.title}</div>
                                {selectedProject.description && (
                                    <div style={{ fontSize: '12px', color: theme?.textSecondary || '#666' }}>
                                        {selectedProject.description}
                                    </div>
                                )}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: theme?.textSecondary || '#666',
                                fontStyle: 'italic'
                            }}>
                                (Auto-selected)
                            </div>
                        </div>
                    ) : (
                        /* Full project selection when no project is pre-selected */
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={handleProjectNameChange}
                                    onFocus={() => setShowProjectSuggestions(filteredProjects.length > 0)}
                                    onBlur={() => setTimeout(() => setShowProjectSuggestions(false), 150)}
                                    placeholder="Type to search existing projects or enter new name"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: `1px solid ${theme?.border || '#ddd'}`,
                                        borderBottomLeftRadius: showProjectSuggestions ? '0' : '4px',
                                        borderBottomRightRadius: showProjectSuggestions ? '0' : '4px',
                                        backgroundColor: theme?.surface || 'white',
                                        color: theme?.text || '#000'
                                    }}
                                />
                                {showProjectSuggestions && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        backgroundColor: theme?.surface || 'white',
                                        border: `1px solid ${theme?.border || '#ddd'}`,
                                        borderTop: 'none',
                                        borderRadius: '0 0 4px 4px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        zIndex: 1000,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                        {filteredProjects.map((project, index) => (
                                            <div
                                                key={index}
                                                onClick={() => handleProjectSelect(project.title || project)}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    borderBottom: index < filteredProjects.length - 1 ? `1px solid ${theme?.border || '#eee'}` : 'none',
                                                    backgroundColor: theme?.surface || 'white',
                                                    color: theme?.text || '#000'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = theme?.background || '#f8f9fa'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = theme?.surface || 'white'}
                                            >
                                                <div style={{ fontWeight: 'bold' }}>{project.title || project}</div>
                                                {project.description && (
                                                    <div style={{ fontSize: '12px', color: theme?.textSecondary || '#666' }}>{project.description}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateProject(true)}
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                New Project
                            </button>
                        </div>
                    )}
                </div>

                {/* Create Project Modal - only show when no project is pre-selected */}
                {showCreateProject && !selectedProject && (
                    <div style={{
                        marginBottom: '15px',
                        padding: '15px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '4px',
                        border: '1px solid #dee2e6'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>Create New Project</h4>
                        <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Project name"
                            style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                        <textarea
                            value={newProjectDescription}
                            onChange={(e) => setNewProjectDescription(e.target.value)}
                            placeholder="Project description (optional)"
                            rows="3"
                            style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ddd', resize: 'vertical' }}
                        />
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                                Due Date:
                            </label>
                            <input
                                type="date"
                                value={newProjectDueDate}
                                onChange={(e) => setNewProjectDueDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd',
                                    fontSize: '14px'
                                }}
                            />
                            <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '2px' }}>
                                {newProjectDueDate ?
                                    `Due in ${Math.ceil((new Date(newProjectDueDate) - new Date()) / (1000 * 60 * 60 * 24))} days` :
                                    'Select a due date for this project (optional)'
                                }
                            </small>
                        </div>

                        {/* Owner Selection */}
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                                Project Owner:
                            </label>
                            <select
                                value={newProjectOwner ? newProjectOwner.id : ''}
                                onChange={(e) => {
                                    const selectedUser = mockUsers.find(user => user.id === parseInt(e.target.value));
                                    setNewProjectOwner(selectedUser);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd',
                                    fontSize: '14px',
                                    marginBottom: '8px'
                                }}
                            >
                                {mockUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                            {newProjectOwner && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '4px',
                                    border: '1px solid #dee2e6'
                                }}>
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: newProjectOwner.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}>
                                        {newProjectOwner.avatar}
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{newProjectOwner.name}</span>
                                    <span style={{ fontSize: '12px', color: '#6c757d' }}>
                                        {newProjectOwner.email}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={handleCreateProject}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Create
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreateProject(false);
                                    setNewProjectName('');
                                    setNewProjectDescription('');
                                    setNewProjectDueDate('');
                                    setNewProjectOwner(mockUsers[0]); // Reset to default owner
                                }}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* File Selection */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Files:</label>
                    <input
                        id="fileInput"
                        type="file"
                        onChange={handleFileSelect}
                        accept={getFileTypeInfo() ? getFileTypeInfo().allowedExtensions.join(',') : '.pdf,.doc,.docx,.txt'}
                        multiple
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    {selectedFiles.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                            <strong>Selected files ({selectedFiles.length}):</strong>
                            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                {selectedFiles.map((file, index) => (
                                    <li key={index} style={{ fontSize: '14px', color: '#666' }}>
                                        {file.name} ({Math.round(file.size / 1024)}KB)
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Upload Progress */}
                {loading && (
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{
                            backgroundColor: '#e9ecef',
                            borderRadius: '4px',
                            padding: '8px',
                            textAlign: 'center',
                            color: '#666'
                        }}>
                            📤 Uploading files...
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={!selectedFiles.length || loading}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: selectedFiles.length && !loading ? '#007bff' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: selectedFiles.length && !loading ? 'pointer' : 'not-allowed',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }}
                >
                    {loading ? '📤 Uploading...' : `📁 Upload ${selectedFiles.length} file(s)${documentClassification ? ` as ${getDocumentClassificationOptions().find(opt => opt.value === documentClassification)?.label || documentClassification}` : ''}`}
                </button>
            </form>

            {/* Error Display */}
            {error && (
                <div style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '10px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    border: '1px solid #f5c6cb'
                }}>
                    ❌ {error}
                </div>
            )}

            {/* Upload Results */}
            {uploadResults && (
                <div style={{
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    padding: '15px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    border: '1px solid #c3e6cb'
                }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>✅ Upload Successful!</h3>
                    <p><strong>Uploaded:</strong> {uploadResults.totalFiles} files to {uploadResults.documentType}/{uploadResults.subfolder}</p>
                    {uploadResults.projectName && <p><strong>Project:</strong> {uploadResults.projectName}</p>}
                    <details style={{ marginTop: '10px' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>View uploaded files</summary>
                        <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                            {uploadResults.uploadedFiles.map((file, index) => (
                                <li key={index} style={{ fontSize: '14px', marginBottom: '2px' }}>
                                    {file.originalName} → {file.storedPath}
                                </li>
                            ))}
                        </ul>
                    </details>
                </div>
            )}

        </div>
    );
};

export default DocumentUpload;