import React, { useState, useEffect } from 'react';

const PPAdminConfig = ({ theme }) => {
    const [activeTab, setActiveTab] = useState('technologies');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Technology Management State
    const [technologies, setTechnologies] = useState([]);
    const [newTechnology, setNewTechnology] = useState({
        name: '',
        category: '',
        aliases: '',
        description: '',
        confidence: 0.8
    });
    const [editingTech, setEditingTech] = useState(null);
    const [pendingTechnologies, setPendingTechnologies] = useState([]);

    // Search Configuration State
    const [searchConfig, setSearchConfig] = useState({
        defaultWeights: {
            technology: 0.4,
            domain: 0.3,
            customer: 0.2,
            semantic: 0.1
        },
        confidenceThresholds: {
            high: 0.8,
            medium: 0.6,
            low: 0.4
        },
        embeddingSettings: {
            chunkSize: 512,
            chunkOverlap: 50,
            useUnifiedContent: true
        }
    });

    // System Analytics State
    const [analytics, setAnalytics] = useState({
        totalPastPerformances: 0,
        totalSearches: 0,
        avgRelevanceScore: 0,
        topTechnologies: [],
        searchPerformance: {},
        systemHealth: {}
    });

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadTechnologies(),
                loadSearchConfig(),
                loadAnalytics()
            ]);
        } catch (err) {
            setError('Failed to load initial data');
            console.error('Error loading initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadTechnologies = async () => {
        try {
            // This would be the actual API call
            // For now, using mock data
            setTechnologies([
                { id: 1, name: 'React', category: 'Frontend', aliases: ['ReactJS'], status: 'approved', confidence: 0.9 },
                { id: 2, name: 'Node.js', category: 'Backend', aliases: ['NodeJS'], status: 'approved', confidence: 0.85 },
                { id: 3, name: 'PostgreSQL', category: 'Database', aliases: ['Postgres'], status: 'approved', confidence: 0.8 },
                { id: 4, name: 'Docker', category: 'DevOps', aliases: ['Containerization'], status: 'approved', confidence: 0.9 }
            ]);

            setPendingTechnologies([
                { id: 5, name: 'Vue.js', category: 'Frontend', aliases: ['VueJS'], status: 'pending', confidence: 0.7, extractedFrom: 'PP-2024-001' }
            ]);
        } catch (err) {
            throw new Error('Failed to load technologies');
        }
    };

    const loadSearchConfig = async () => {
        try {
            // This would be the actual API call
            // For now, using default values
            console.log('Loading search configuration...');
        } catch (err) {
            throw new Error('Failed to load search configuration');
        }
    };

    const loadAnalytics = async () => {
        try {
            // This would be the actual API call
            setAnalytics({
                totalPastPerformances: 47,
                totalSearches: 234,
                avgRelevanceScore: 0.73,
                topTechnologies: [
                    { name: 'React', count: 23, percentage: 48.9 },
                    { name: 'AWS', count: 19, percentage: 40.4 },
                    { name: 'Node.js', count: 15, percentage: 31.9 },
                    { name: 'PostgreSQL', count: 12, percentage: 25.5 }
                ],
                searchPerformance: {
                    avgResponseTime: 145,
                    successRate: 98.7,
                    cacheHitRate: 67.3
                },
                systemHealth: {
                    embeddingGeneration: 'healthy',
                    vectorSearch: 'healthy',
                    technologyExtraction: 'warning'
                }
            });
        } catch (err) {
            throw new Error('Failed to load analytics');
        }
    };

    const showMessage = (message, type = 'success') => {
        if (type === 'success') {
            setSuccess(message);
            setError(null);
        } else {
            setError(message);
            setSuccess(null);
        }
        setTimeout(() => {
            setSuccess(null);
            setError(null);
        }, 3000);
    };

    const handleAddTechnology = async () => {
        if (!newTechnology.name || !newTechnology.category) {
            setError('Name and category are required');
            return;
        }

        try {
            // API call would go here
            const tech = {
                id: Date.now(),
                ...newTechnology,
                aliases: newTechnology.aliases.split(',').map(a => a.trim()).filter(a => a),
                status: 'approved'
            };

            setTechnologies([...technologies, tech]);
            setNewTechnology({
                name: '',
                category: '',
                aliases: '',
                description: '',
                confidence: 0.8
            });
            showMessage('Technology added successfully');
        } catch (err) {
            setError('Failed to add technology');
        }
    };

    const handleApproveTechnology = async (techId) => {
        try {
            const tech = pendingTechnologies.find(t => t.id === techId);
            if (tech) {
                setTechnologies([...technologies, { ...tech, status: 'approved' }]);
                setPendingTechnologies(pendingTechnologies.filter(t => t.id !== techId));
                showMessage(`Technology "${tech.name}" approved`);
            }
        } catch (err) {
            setError('Failed to approve technology');
        }
    };

    const handleRejectTechnology = async (techId) => {
        try {
            const tech = pendingTechnologies.find(t => t.id === techId);
            setPendingTechnologies(pendingTechnologies.filter(t => t.id !== techId));
            showMessage(`Technology "${tech?.name}" rejected`);
        } catch (err) {
            setError('Failed to reject technology');
        }
    };

    const handleUpdateSearchConfig = async () => {
        try {
            // API call would go here
            showMessage('Search configuration updated successfully');
        } catch (err) {
            setError('Failed to update search configuration');
        }
    };

    const tabs = [
        { id: 'technologies', label: 'Technology Management', icon: '🔧' },
        { id: 'search', label: 'Search Configuration', icon: '🔍' },
        { id: 'analytics', label: 'System Analytics', icon: '📊' }
    ];

    return (
        <div style={{
            padding: '20px',
            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8f9fa',
            minHeight: '100vh'
        }}>
            {/* Header */}
            <div style={{
                marginBottom: '30px',
                borderBottom: `2px solid ${theme === 'dark' ? '#333' : '#dee2e6'}`,
                paddingBottom: '20px'
            }}>
                <h1 style={{
                    color: theme === 'dark' ? '#ffffff' : '#333333',
                    margin: '0 0 10px 0',
                    fontSize: '28px',
                    fontWeight: 'bold'
                }}>
                    Past Performance Administration
                </h1>
                <p style={{
                    color: theme === 'dark' ? '#cccccc' : '#666666',
                    margin: 0,
                    fontSize: '16px'
                }}>
                    Configure and manage the Past Performance RAG system
                </p>
            </div>

            {/* Messages */}
            {error && (
                <div style={{
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '20px',
                    color: '#721c24'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {success && (
                <div style={{
                    backgroundColor: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '20px',
                    color: '#155724'
                }}>
                    <strong>Success:</strong> {success}
                </div>
            )}

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                borderBottom: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                marginBottom: '30px'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '15px 20px',
                            backgroundColor: activeTab === tab.id ?
                                (theme === 'dark' ? '#2d2d2d' : '#ffffff') : 'transparent',
                            color: activeTab === tab.id ?
                                (theme === 'dark' ? '#ffffff' : '#333333') :
                                (theme === 'dark' ? '#cccccc' : '#666666'),
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'technologies' && (
                <div>
                    {/* Add New Technology */}
                    <div style={{
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '30px'
                    }}>
                        <h3 style={{
                            margin: '0 0 20px 0',
                            color: theme === 'dark' ? '#ffffff' : '#333333',
                            fontSize: '20px'
                        }}>
                            Add New Technology
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: '15px',
                            marginBottom: '15px'
                        }}>
                            <input
                                type="text"
                                placeholder="Technology Name"
                                value={newTechnology.name}
                                onChange={(e) => setNewTechnology({...newTechnology, name: e.target.value})}
                                style={{
                                    padding: '12px',
                                    border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                                    borderRadius: '6px',
                                    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                                    color: theme === 'dark' ? '#ffffff' : '#333333',
                                    fontSize: '14px'
                                }}
                            />
                            <select
                                value={newTechnology.category}
                                onChange={(e) => setNewTechnology({...newTechnology, category: e.target.value})}
                                style={{
                                    padding: '12px',
                                    border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                                    borderRadius: '6px',
                                    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                                    color: theme === 'dark' ? '#ffffff' : '#333333',
                                    fontSize: '14px'
                                }}
                            >
                                <option value="">Select Category</option>
                                <option value="Frontend">Frontend</option>
                                <option value="Backend">Backend</option>
                                <option value="Database">Database</option>
                                <option value="DevOps">DevOps</option>
                                <option value="Cloud">Cloud</option>
                                <option value="Security">Security</option>
                                <option value="AI/ML">AI/ML</option>
                                <option value="Other">Other</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Aliases (comma separated)"
                                value={newTechnology.aliases}
                                onChange={(e) => setNewTechnology({...newTechnology, aliases: e.target.value})}
                                style={{
                                    padding: '12px',
                                    border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                                    borderRadius: '6px',
                                    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                                    color: theme === 'dark' ? '#ffffff' : '#333333',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <textarea
                                placeholder="Description (optional)"
                                value={newTechnology.description}
                                onChange={(e) => setNewTechnology({...newTechnology, description: e.target.value})}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                                    borderRadius: '6px',
                                    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                                    color: theme === 'dark' ? '#ffffff' : '#333333',
                                    fontSize: '14px',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label style={{
                                    color: theme === 'dark' ? '#cccccc' : '#666666',
                                    fontSize: '14px'
                                }}>
                                    Confidence: {(newTechnology.confidence * 100).toFixed(0)}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={newTechnology.confidence}
                                    onChange={(e) => setNewTechnology({...newTechnology, confidence: parseFloat(e.target.value)})}
                                    style={{ width: '150px' }}
                                />
                            </div>
                            <button
                                onClick={handleAddTechnology}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                Add Technology
                            </button>
                        </div>
                    </div>

                    {/* Pending Technologies */}
                    {pendingTechnologies.length > 0 && (
                        <div style={{
                            backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                            border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                            borderRadius: '8px',
                            padding: '20px',
                            marginBottom: '30px'
                        }}>
                            <h3 style={{
                                margin: '0 0 20px 0',
                                color: theme === 'dark' ? '#ffffff' : '#333333',
                                fontSize: '20px'
                            }}>
                                Pending Approval ({pendingTechnologies.length})
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {pendingTechnologies.map(tech => (
                                    <div
                                        key={tech.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '15px',
                                            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8f9fa',
                                            border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                                            borderRadius: '6px'
                                        }}
                                    >
                                        <div>
                                            <div style={{
                                                fontWeight: 'bold',
                                                color: theme === 'dark' ? '#ffffff' : '#333333',
                                                marginBottom: '5px'
                                            }}>
                                                {tech.name}
                                            </div>
                                            <div style={{
                                                fontSize: '14px',
                                                color: theme === 'dark' ? '#cccccc' : '#666666'
                                            }}>
                                                Category: {tech.category} | Confidence: {(tech.confidence * 100).toFixed(0)}%
                                                {tech.extractedFrom && ` | Extracted from: ${tech.extractedFrom}`}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => handleApproveTechnology(tech.id)}
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: '#28a745',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                ✓ Approve
                                            </button>
                                            <button
                                                onClick={() => handleRejectTechnology(tech.id)}
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                ✗ Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Current Technologies */}
                    <div style={{
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                        borderRadius: '8px',
                        padding: '20px'
                    }}>
                        <h3 style={{
                            margin: '0 0 20px 0',
                            color: theme === 'dark' ? '#ffffff' : '#333333',
                            fontSize: '20px'
                        }}>
                            Current Technologies ({technologies.length})
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '15px'
                        }}>
                            {technologies.map(tech => (
                                <div
                                    key={tech.id}
                                    style={{
                                        padding: '15px',
                                        backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8f9fa',
                                        border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                                        borderRadius: '6px'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '10px'
                                    }}>
                                        <div style={{
                                            fontWeight: 'bold',
                                            color: theme === 'dark' ? '#ffffff' : '#333333'
                                        }}>
                                            {tech.name}
                                        </div>
                                        <span style={{
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '12px'
                                        }}>
                                            {tech.category}
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: theme === 'dark' ? '#cccccc' : '#666666',
                                        marginBottom: '5px'
                                    }}>
                                        Confidence: {(tech.confidence * 100).toFixed(0)}%
                                    </div>
                                    {tech.aliases && tech.aliases.length > 0 && (
                                        <div style={{
                                            fontSize: '12px',
                                            color: theme === 'dark' ? '#aaaaaa' : '#888888'
                                        }}>
                                            Aliases: {tech.aliases.join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'search' && (
                <div>
                    {/* Search Weights Configuration */}
                    <div style={{
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '30px'
                    }}>
                        <h3 style={{
                            margin: '0 0 20px 0',
                            color: theme === 'dark' ? '#ffffff' : '#333333',
                            fontSize: '20px'
                        }}>
                            Default Search Weights
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '20px',
                            marginBottom: '20px'
                        }}>
                            {Object.entries(searchConfig.defaultWeights).map(([key, value]) => (
                                <div key={key}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        color: theme === 'dark' ? '#cccccc' : '#666666',
                                        fontSize: '14px',
                                        textTransform: 'capitalize'
                                    }}>
                                        {key} Weight: {(value * 100).toFixed(0)}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={value}
                                        onChange={(e) => setSearchConfig(prev => ({
                                            ...prev,
                                            defaultWeights: {
                                                ...prev.defaultWeights,
                                                [key]: parseFloat(e.target.value)
                                            }
                                        }))}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleUpdateSearchConfig}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            Update Configuration
                        </button>
                    </div>

                    {/* Confidence Thresholds */}
                    <div style={{
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '30px'
                    }}>
                        <h3 style={{
                            margin: '0 0 20px 0',
                            color: theme === 'dark' ? '#ffffff' : '#333333',
                            fontSize: '20px'
                        }}>
                            Relevance Confidence Thresholds
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: '20px'
                        }}>
                            {Object.entries(searchConfig.confidenceThresholds).map(([level, threshold]) => (
                                <div key={level}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        color: theme === 'dark' ? '#cccccc' : '#666666',
                                        fontSize: '14px',
                                        textTransform: 'capitalize'
                                    }}>
                                        {level} Relevance: {(threshold * 100).toFixed(0)}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={threshold}
                                        onChange={(e) => setSearchConfig(prev => ({
                                            ...prev,
                                            confidenceThresholds: {
                                                ...prev.confidenceThresholds,
                                                [level]: parseFloat(e.target.value)
                                            }
                                        }))}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Embedding Settings */}
                    <div style={{
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                        borderRadius: '8px',
                        padding: '20px'
                    }}>
                        <h3 style={{
                            margin: '0 0 20px 0',
                            color: theme === 'dark' ? '#ffffff' : '#333333',
                            fontSize: '20px'
                        }}>
                            Embedding Configuration
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '20px',
                            marginBottom: '20px'
                        }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: theme === 'dark' ? '#cccccc' : '#666666',
                                    fontSize: '14px'
                                }}>
                                    Chunk Size: {searchConfig.embeddingSettings.chunkSize}
                                </label>
                                <input
                                    type="range"
                                    min="256"
                                    max="1024"
                                    step="64"
                                    value={searchConfig.embeddingSettings.chunkSize}
                                    onChange={(e) => setSearchConfig(prev => ({
                                        ...prev,
                                        embeddingSettings: {
                                            ...prev.embeddingSettings,
                                            chunkSize: parseInt(e.target.value)
                                        }
                                    }))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: theme === 'dark' ? '#cccccc' : '#666666',
                                    fontSize: '14px'
                                }}>
                                    Chunk Overlap: {searchConfig.embeddingSettings.chunkOverlap}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    step="10"
                                    value={searchConfig.embeddingSettings.chunkOverlap}
                                    onChange={(e) => setSearchConfig(prev => ({
                                        ...prev,
                                        embeddingSettings: {
                                            ...prev.embeddingSettings,
                                            chunkOverlap: parseInt(e.target.value)
                                        }
                                    }))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: theme === 'dark' ? '#cccccc' : '#666666',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={searchConfig.embeddingSettings.useUnifiedContent}
                                    onChange={(e) => setSearchConfig(prev => ({
                                        ...prev,
                                        embeddingSettings: {
                                            ...prev.embeddingSettings,
                                            useUnifiedContent: e.target.checked
                                        }
                                    }))}
                                />
                                Generate unified content embeddings
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'analytics' && (
                <div>
                    {/* System Overview */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px',
                        marginBottom: '30px'
                    }}>
                        <div style={{
                            backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                            border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                            borderRadius: '8px',
                            padding: '20px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '32px',
                                fontWeight: 'bold',
                                color: '#007bff',
                                marginBottom: '10px'
                            }}>
                                {analytics.totalPastPerformances}
                            </div>
                            <div style={{
                                color: theme === 'dark' ? '#cccccc' : '#666666',
                                fontSize: '14px'
                            }}>
                                Total Past Performances
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                            border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                            borderRadius: '8px',
                            padding: '20px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '32px',
                                fontWeight: 'bold',
                                color: '#28a745',
                                marginBottom: '10px'
                            }}>
                                {analytics.totalSearches}
                            </div>
                            <div style={{
                                color: theme === 'dark' ? '#cccccc' : '#666666',
                                fontSize: '14px'
                            }}>
                                Total Searches
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                            border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                            borderRadius: '8px',
                            padding: '20px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '32px',
                                fontWeight: 'bold',
                                color: '#ffc107',
                                marginBottom: '10px'
                            }}>
                                {(analytics.avgRelevanceScore * 100).toFixed(1)}%
                            </div>
                            <div style={{
                                color: theme === 'dark' ? '#cccccc' : '#666666',
                                fontSize: '14px'
                            }}>
                                Avg Relevance Score
                            </div>
                        </div>
                    </div>

                    {/* Top Technologies */}
                    <div style={{
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '30px'
                    }}>
                        <h3 style={{
                            margin: '0 0 20px 0',
                            color: theme === 'dark' ? '#ffffff' : '#333333',
                            fontSize: '20px'
                        }}>
                            Most Common Technologies
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {analytics.topTechnologies.map((tech, index) => (
                                <div key={tech.name} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px'
                                }}>
                                    <div style={{
                                        minWidth: '120px',
                                        color: theme === 'dark' ? '#ffffff' : '#333333',
                                        fontWeight: '500'
                                    }}>
                                        {tech.name}
                                    </div>
                                    <div style={{
                                        flex: 1,
                                        height: '20px',
                                        backgroundColor: theme === 'dark' ? '#404040' : '#e9ecef',
                                        borderRadius: '10px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${tech.percentage}%`,
                                            backgroundColor: '#007bff',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                    <div style={{
                                        minWidth: '60px',
                                        textAlign: 'right',
                                        color: theme === 'dark' ? '#cccccc' : '#666666',
                                        fontSize: '14px'
                                    }}>
                                        {tech.count} ({tech.percentage.toFixed(1)}%)
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Health */}
                    <div style={{
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                        borderRadius: '8px',
                        padding: '20px'
                    }}>
                        <h3 style={{
                            margin: '0 0 20px 0',
                            color: theme === 'dark' ? '#ffffff' : '#333333',
                            fontSize: '20px'
                        }}>
                            System Health
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '15px'
                        }}>
                            {Object.entries(analytics.systemHealth).map(([component, status]) => (
                                <div key={component} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px',
                                    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8f9fa',
                                    border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                                    borderRadius: '6px'
                                }}>
                                    <span style={{
                                        color: theme === 'dark' ? '#ffffff' : '#333333',
                                        fontSize: '14px',
                                        textTransform: 'capitalize'
                                    }}>
                                        {component.replace(/([A-Z])/g, ' $1')}
                                    </span>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        backgroundColor: status === 'healthy' ? '#28a745' :
                                                       status === 'warning' ? '#ffc107' : '#dc3545',
                                        color: 'white'
                                    }}>
                                        {status}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            marginTop: '20px',
                            padding: '15px',
                            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8f9fa',
                            border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                            borderRadius: '6px'
                        }}>
                            <h4 style={{
                                margin: '0 0 10px 0',
                                color: theme === 'dark' ? '#ffffff' : '#333333',
                                fontSize: '16px'
                            }}>
                                Performance Metrics
                            </h4>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '15px',
                                fontSize: '14px'
                            }}>
                                <div>
                                    <span style={{ color: theme === 'dark' ? '#cccccc' : '#666666' }}>
                                        Avg Response Time:
                                    </span>
                                    <br />
                                    <strong style={{ color: theme === 'dark' ? '#ffffff' : '#333333' }}>
                                        {analytics.searchPerformance.avgResponseTime}ms
                                    </strong>
                                </div>
                                <div>
                                    <span style={{ color: theme === 'dark' ? '#cccccc' : '#666666' }}>
                                        Success Rate:
                                    </span>
                                    <br />
                                    <strong style={{ color: theme === 'dark' ? '#ffffff' : '#333333' }}>
                                        {analytics.searchPerformance.successRate}%
                                    </strong>
                                </div>
                                <div>
                                    <span style={{ color: theme === 'dark' ? '#cccccc' : '#666666' }}>
                                        Cache Hit Rate:
                                    </span>
                                    <br />
                                    <strong style={{ color: theme === 'dark' ? '#ffffff' : '#333333' }}>
                                        {analytics.searchPerformance.cacheHitRate}%
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PPAdminConfig;