import React, { useState, useEffect } from 'react';

const DocumentUpload = () => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [documentType, setDocumentType] = useState('solicitations');
    const [subfolder, setSubfolder] = useState('');
    const [projectName, setProjectName] = useState('');
    const [documentStructure, setDocumentStructure] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResults, setUploadResults] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDescription, setNewProjectDescription] = useState('');

    // Load document structure on component mount
    useEffect(() => {
        loadDocumentStructure();
    }, []);

    const loadDocumentStructure = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/documents/structure');
            if (response.ok) {
                const result = await response.json();
                setDocumentStructure(result.data);
            }
        } catch (err) {
            console.error('Failed to load document structure:', err);
        }
    };

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        setSelectedFiles(files);
        setError(null);
    };

    const handleDocumentTypeChange = (event) => {
        setDocumentType(event.target.value);
        setSubfolder(''); // Reset subfolder when type changes
        setProjectName('');
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) {
            setError('Project name is required');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/documents/create-project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectName: newProjectName,
                    documentType,
                    description: newProjectDescription
                })
            });

            if (response.ok) {
                setProjectName(newProjectName);
                setNewProjectName('');
                setNewProjectDescription('');
                setShowCreateProject(false);
                setError(null);
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

        setLoading(true);
        setError(null);

        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        formData.append('documentType', documentType);
        if (subfolder) formData.append('subfolder', subfolder);
        if (projectName) formData.append('projectName', projectName);
        formData.append('metadata', JSON.stringify({
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'user', // In a real app, this would come from auth
            source: 'web-interface'
        }));

        try {
            const response = await fetch('http://localhost:3000/api/documents/upload', {
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
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const getAvailableSubfolders = () => {
        if (!documentStructure || !documentStructure.documentTypes || !documentType) return [];
        const docType = documentStructure.documentTypes[documentType];
        return docType ? docType.subfolders : [];
    };

    const getFileTypeInfo = () => {
        if (!documentStructure || !documentStructure.documentTypes || !documentType) return null;
        const docType = documentStructure.documentTypes[documentType];
        return docType || null;
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>📁 Document Management</h2>

            <form onSubmit={handleUpload} style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                {/* Document Type Selection */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Document Type:</label>
                    <select
                        value={documentType}
                        onChange={handleDocumentTypeChange}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                        {documentStructure && documentStructure.documentTypes ?
                            Object.entries(documentStructure.documentTypes).map(([key, type]) => (
                                <option key={key} value={key}>{type.name}</option>
                            )) :
                            <option value="solicitations">Solicitations</option>
                        }
                    </select>
                    {getFileTypeInfo() && (
                        <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                            {getFileTypeInfo().description}<br/>
                            Allowed: {getFileTypeInfo().allowedExtensions.join(', ')} |
                            Max size: {Math.round(getFileTypeInfo().maxSize / (1024 * 1024))}MB
                        </small>
                    )}
                </div>

                {/* Subfolder Selection */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Subfolder:</label>
                    <select
                        value={subfolder}
                        onChange={(e) => setSubfolder(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                        <option value="">Select subfolder (optional)</option>
                        {getAvailableSubfolders().map(folder => (
                            <option key={folder} value={folder}>{folder}</option>
                        ))}
                    </select>
                </div>

                {/* Project Selection/Creation */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Project:</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Enter existing project name or leave blank"
                            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
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
                </div>

                {/* Create Project Modal */}
                {showCreateProject && (
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
                                onClick={() => setShowCreateProject(false)}
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
                    {loading ? '📤 Uploading...' : `📁 Upload ${selectedFiles.length} file(s) to ${documentType}`}
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

            {/* Document Structure Info */}
            {documentStructure && (
                <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '4px',
                    marginTop: '20px',
                    border: '1px solid #e9ecef'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>📋 Available Document Types</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                        {documentStructure && documentStructure.documentTypes ?
                            Object.entries(documentStructure.documentTypes).map(([key, type]) => (
                                <div key={key} style={{
                                    backgroundColor: 'white',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    border: '1px solid #dee2e6'
                                }}>
                                    <h4 style={{ margin: '0 0 5px 0', color: '#007bff' }}>{type.name}</h4>
                                    <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#666' }}>{type.description}</p>
                                    <small style={{ color: '#6c757d' }}>
                                        <strong>Subfolders:</strong> {type.subfolders.join(', ')}<br/>
                                        <strong>File types:</strong> {type.allowedExtensions.join(', ')}
                                    </small>
                                </div>
                            )) :
                            <div style={{ color: '#666', fontStyle: 'italic' }}>Loading document types...</div>
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentUpload;