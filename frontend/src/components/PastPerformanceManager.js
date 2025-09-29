import React, { useState, useEffect } from 'react';

const PastPerformanceManager = ({ theme }) => {
    const [pastPerformances, setPastPerformances] = useState([]);
    const [filteredPPs, setFilteredPPs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPP, setSelectedPP] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [searchResults, setSearchResults] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        customer: '',
        customerType: '',
        contractType: '',
        workType: '',
        minValue: '',
        maxValue: '',
        technologies: '',
        domains: '',
        startDateAfter: '',
        endDateBefore: ''
    });

    // Search weights for advanced search
    const [searchWeights, setSearchWeights] = useState({
        technology: 0.4,
        domain: 0.3,
        customer: 0.2,
        semantic: 0.1
    });

    const [searchType, setSearchType] = useState('hybrid'); // 'text', 'semantic', 'hybrid'
    const [pagination, setPagination] = useState({
        limit: 20,
        offset: 0,
        total: 0,
        currentPage: 1
    });

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    // Load past performances on component mount
    useEffect(() => {
        loadPastPerformances();
    }, [filters, pagination.offset]);

    // Filter past performances based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredPPs(pastPerformances);
            setSearchResults(null);
        } else {
            const filtered = pastPerformances.filter(pp =>
                pp.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pp.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pp.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (pp.technologiesUsed && pp.technologiesUsed.some(tech =>
                    tech.toLowerCase().includes(searchQuery.toLowerCase())
                ))
            );
            setFilteredPPs(filtered);
        }
    }, [searchQuery, pastPerformances]);

    const loadPastPerformances = async () => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams({
                limit: pagination.limit,
                offset: pagination.offset,
                ...Object.fromEntries(
                    Object.entries(filters).filter(([_, value]) => value !== '')
                )
            });

            const response = await fetch(`${apiUrl}/api/past-performance?${queryParams}`);
            if (!response.ok) throw new Error('Failed to load past performances');

            const data = await response.json();
            setPastPerformances(data.data || []);
            setPagination(prev => ({
                ...prev,
                total: data.pagination?.total || 0,
                currentPage: Math.floor(pagination.offset / pagination.limit) + 1
            }));
        } catch (err) {
            setError(err.message);
            console.error('Error loading past performances:', err);
        } finally {
            setLoading(false);
        }
    };

    const performAdvancedSearch = async () => {
        if (!searchQuery.trim()) {
            loadPastPerformances();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams({
                q: searchQuery,
                searchType,
                limit: pagination.limit,
                offset: pagination.offset,
                techWeight: searchWeights.technology,
                domainWeight: searchWeights.domain,
                customerWeight: searchWeights.customer,
                semanticWeight: searchWeights.semantic,
                ...Object.fromEntries(
                    Object.entries(filters).filter(([_, value]) => value !== '')
                )
            });

            const response = await fetch(`${apiUrl}/api/past-performance/search?${queryParams}`);
            if (!response.ok) throw new Error('Search failed');

            const data = await response.json();
            setSearchResults(data);
            setFilteredPPs(data.data || []);
        } catch (err) {
            setError(err.message);
            console.error('Error performing search:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
        setPagination(prev => ({ ...prev, offset: 0, currentPage: 1 }));
    };

    const clearFilters = () => {
        setFilters({
            customer: '',
            customerType: '',
            contractType: '',
            workType: '',
            minValue: '',
            maxValue: '',
            technologies: '',
            domains: '',
            startDateAfter: '',
            endDateBefore: ''
        });
        setSearchQuery('');
        setSearchResults(null);
    };

    const formatCurrency = (value) => {
        if (!value) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const getContractTypeColor = (type) => {
        switch (type) {
            case 'Prime': return '#007bff';
            case 'Subcontractor': return '#28a745';
            case 'Teaming': return '#ffc107';
            default: return '#6c757d';
        }
    };

    const getCustomerTypeColor = (type) => {
        switch (type) {
            case 'Federal': return '#dc3545';
            case 'State': return '#17a2b8';
            case 'Local': return '#28a745';
            case 'Commercial': return '#6f42c1';
            default: return '#6c757d';
        }
    };

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
                    Past Performance Management
                </h1>
                <p style={{
                    color: theme === 'dark' ? '#cccccc' : '#666666',
                    margin: 0,
                    fontSize: '16px'
                }}>
                    Manage and search your organization's past performance records
                </p>
            </div>

            {/* Search and Filter Section */}
            <div style={{
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
            }}>
                {/* Search Bar */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search past performances..."
                            style={{
                                flex: 1,
                                padding: '12px',
                                border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                                borderRadius: '6px',
                                backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                                color: theme === 'dark' ? '#ffffff' : '#333333',
                                fontSize: '14px'
                            }}
                            onKeyPress={(e) => e.key === 'Enter' && performAdvancedSearch()}
                        />
                        <select
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                            style={{
                                padding: '12px',
                                border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                                borderRadius: '6px',
                                backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                                color: theme === 'dark' ? '#ffffff' : '#333333',
                                fontSize: '14px'
                            }}
                        >
                            <option value="hybrid">Hybrid Search</option>
                            <option value="text">Text Search</option>
                            <option value="semantic">Semantic Search</option>
                        </select>
                        <button
                            onClick={performAdvancedSearch}
                            style={{
                                padding: '12px 20px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            🔍 Search
                        </button>
                    </div>

                    {/* Search Weights (for advanced users) */}
                    {searchType === 'hybrid' && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '10px',
                            marginBottom: '15px'
                        }}>
                            {Object.entries(searchWeights).map(([key, value]) => (
                                <div key={key}>
                                    <label style={{
                                        fontSize: '12px',
                                        color: theme === 'dark' ? '#cccccc' : '#666666',
                                        textTransform: 'capitalize'
                                    }}>
                                        {key} Weight: {(value * 100).toFixed(0)}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={value}
                                        onChange={(e) => setSearchWeights(prev => ({
                                            ...prev,
                                            [key]: parseFloat(e.target.value)
                                        }))}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px',
                    marginBottom: '15px'
                }}>
                    <input
                        type="text"
                        placeholder="Customer"
                        value={filters.customer}
                        onChange={(e) => handleFilterChange('customer', e.target.value)}
                        style={{
                            padding: '10px',
                            border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                            borderRadius: '6px',
                            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                            color: theme === 'dark' ? '#ffffff' : '#333333',
                            fontSize: '14px'
                        }}
                    />
                    <select
                        value={filters.customerType}
                        onChange={(e) => handleFilterChange('customerType', e.target.value)}
                        style={{
                            padding: '10px',
                            border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                            borderRadius: '6px',
                            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                            color: theme === 'dark' ? '#ffffff' : '#333333',
                            fontSize: '14px'
                        }}
                    >
                        <option value="">All Customer Types</option>
                        <option value="Federal">Federal</option>
                        <option value="State">State</option>
                        <option value="Local">Local</option>
                        <option value="Commercial">Commercial</option>
                    </select>
                    <select
                        value={filters.contractType}
                        onChange={(e) => handleFilterChange('contractType', e.target.value)}
                        style={{
                            padding: '10px',
                            border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                            borderRadius: '6px',
                            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                            color: theme === 'dark' ? '#ffffff' : '#333333',
                            fontSize: '14px'
                        }}
                    >
                        <option value="">All Contract Types</option>
                        <option value="Prime">Prime</option>
                        <option value="Subcontractor">Subcontractor</option>
                        <option value="Teaming">Teaming</option>
                    </select>
                    <select
                        value={filters.workType}
                        onChange={(e) => handleFilterChange('workType', e.target.value)}
                        style={{
                            padding: '10px',
                            border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                            borderRadius: '6px',
                            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                            color: theme === 'dark' ? '#ffffff' : '#333333',
                            fontSize: '14px'
                        }}
                    >
                        <option value="">All Work Types</option>
                        <option value="DME">DME Only</option>
                        <option value="O&M">O&M Only</option>
                        <option value="Mixed">Mixed (DME + O&M)</option>
                    </select>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={clearFilters}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: 'transparent',
                                color: theme === 'dark' ? '#cccccc' : '#666666',
                                border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Clear Filters
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            📄 Upload Documents
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            ➕ Add Past Performance
                        </button>
                    </div>
                </div>
            </div>

            {/* Search Results Summary */}
            {searchResults && (
                <div style={{
                    backgroundColor: theme === 'dark' ? '#2d2d2d' : '#e3f2fd',
                    border: `1px solid ${theme === 'dark' ? '#404040' : '#2196f3'}`,
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '20px'
                }}>
                    <h3 style={{
                        margin: '0 0 10px 0',
                        color: theme === 'dark' ? '#ffffff' : '#1976d2',
                        fontSize: '16px'
                    }}>
                        Search Results
                    </h3>
                    <p style={{
                        margin: '0 0 15px 0',
                        color: theme === 'dark' ? '#cccccc' : '#666666',
                        fontSize: '14px'
                    }}>
                        Found {searchResults.data?.length || 0} results for "{searchQuery}" using {searchType} search
                    </p>

                    {searchResults.grouped && (
                        <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                            <span style={{ color: '#28a745' }}>
                                High Relevance: {searchResults.grouped.highRelevance?.length || 0}
                            </span>
                            <span style={{ color: '#ffc107' }}>
                                Medium Relevance: {searchResults.grouped.mediumRelevance?.length || 0}
                            </span>
                            <span style={{ color: '#dc3545' }}>
                                Low Relevance: {searchResults.grouped.lowRelevance?.length || 0}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Error Display */}
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

            {/* Loading State */}
            {loading && (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: theme === 'dark' ? '#cccccc' : '#666666'
                }}>
                    <div>Loading past performances...</div>
                </div>
            )}

            {/* Past Performance Cards */}
            {!loading && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                    gap: '20px'
                }}>
                    {filteredPPs.map((pp) => (
                        <div
                            key={pp.id}
                            style={{
                                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                                border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                                borderRadius: '8px',
                                padding: '20px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            }}
                            onClick={() => {
                                setSelectedPP(pp);
                                setShowDetailModal(true);
                            }}
                        >
                            {/* Header */}
                            <div style={{ marginBottom: '15px' }}>
                                <h3 style={{
                                    margin: '0 0 8px 0',
                                    color: theme === 'dark' ? '#ffffff' : '#333333',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    lineHeight: '1.2'
                                }}>
                                    {pp.projectName}
                                </h3>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{
                                        backgroundColor: getCustomerTypeColor(pp.customerType),
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '500'
                                    }}>
                                        {pp.customerType}
                                    </span>
                                    <span style={{
                                        backgroundColor: getContractTypeColor(pp.contractType),
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '500'
                                    }}>
                                        {pp.contractType}
                                    </span>
                                    {pp.relevanceScore && (
                                        <span style={{
                                            backgroundColor: pp.relevanceScore >= 0.8 ? '#28a745' :
                                                           pp.relevanceScore >= 0.6 ? '#ffc107' : '#dc3545',
                                            color: 'white',
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: '500'
                                        }}>
                                            {(pp.relevanceScore * 100).toFixed(0)}% Match
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Customer and Contract Info */}
                            <div style={{ marginBottom: '15px' }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px',
                                    fontSize: '14px'
                                }}>
                                    <div>
                                        <strong style={{ color: theme === 'dark' ? '#cccccc' : '#666666' }}>
                                            Customer:
                                        </strong>
                                        <div style={{ color: theme === 'dark' ? '#ffffff' : '#333333' }}>
                                            {pp.customer}
                                        </div>
                                    </div>
                                    <div>
                                        <strong style={{ color: theme === 'dark' ? '#cccccc' : '#666666' }}>
                                            Contract Value:
                                        </strong>
                                        <div style={{ color: theme === 'dark' ? '#ffffff' : '#333333' }}>
                                            {formatCurrency(pp.contractValue)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary */}
                            <div style={{ marginBottom: '15px' }}>
                                <p style={{
                                    margin: 0,
                                    color: theme === 'dark' ? '#cccccc' : '#666666',
                                    fontSize: '14px',
                                    lineHeight: '1.4',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {pp.summary}
                                </p>
                            </div>

                            {/* Technologies */}
                            {pp.technologiesUsed && pp.technologiesUsed.length > 0 && (
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{
                                        fontSize: '12px',
                                        color: theme === 'dark' ? '#cccccc' : '#666666',
                                        marginBottom: '5px'
                                    }}>
                                        Technologies:
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                        {pp.technologiesUsed.slice(0, 6).map((tech, index) => (
                                            <span
                                                key={index}
                                                style={{
                                                    backgroundColor: theme === 'dark' ? '#404040' : '#f8f9fa',
                                                    color: theme === 'dark' ? '#ffffff' : '#333333',
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    border: `1px solid ${theme === 'dark' ? '#555' : '#dee2e6'}`
                                                }}
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                        {pp.technologiesUsed.length > 6 && (
                                            <span style={{
                                                color: theme === 'dark' ? '#cccccc' : '#666666',
                                                fontSize: '11px',
                                                padding: '3px 8px'
                                            }}>
                                                +{pp.technologiesUsed.length - 6} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Match Reasons (for search results) */}
                            {pp.matchReasons && pp.matchReasons.length > 0 && (
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{
                                        fontSize: '12px',
                                        color: theme === 'dark' ? '#cccccc' : '#666666',
                                        marginBottom: '5px'
                                    }}>
                                        Match Reasons:
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#28a745' }}>
                                        {pp.matchReasons.slice(0, 2).join(', ')}
                                        {pp.matchReasons.length > 2 && '...'}
                                    </div>
                                </div>
                            )}

                            {/* Dates */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: '15px',
                                borderTop: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
                                fontSize: '12px',
                                color: theme === 'dark' ? '#cccccc' : '#666666'
                            }}>
                                <span>
                                    {formatDate(pp.startDate)} - {formatDate(pp.endDate)}
                                </span>
                                <span>
                                    {pp.workType} ({pp.dmePercentage}% DME / {pp.omPercentage}% O&M)
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredPPs.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: theme === 'dark' ? '#cccccc' : '#666666'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
                    <h3 style={{ margin: '0 0 10px 0', color: theme === 'dark' ? '#ffffff' : '#333333' }}>
                        No Past Performance Records Found
                    </h3>
                    <p style={{ margin: '0 0 20px 0' }}>
                        {searchQuery || Object.values(filters).some(f => f) ?
                            'Try adjusting your search criteria or filters.' :
                            'Get started by adding your first past performance record.'
                        }
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
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
                        Add Past Performance
                    </button>
                </div>
            )}

            {/* Pagination */}
            {pagination.total > pagination.limit && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    margin: '30px 0',
                    padding: '20px'
                }}>
                    <button
                        onClick={() => setPagination(prev => ({
                            ...prev,
                            offset: Math.max(0, prev.offset - prev.limit),
                            currentPage: prev.currentPage - 1
                        }))}
                        disabled={pagination.offset === 0}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: pagination.offset === 0 ? '#e9ecef' : '#007bff',
                            color: pagination.offset === 0 ? '#6c757d' : 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: pagination.offset === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Previous
                    </button>

                    <span style={{
                        color: theme === 'dark' ? '#cccccc' : '#666666',
                        fontSize: '14px'
                    }}>
                        Page {pagination.currentPage} of {Math.ceil(pagination.total / pagination.limit)}
                    </span>

                    <button
                        onClick={() => setPagination(prev => ({
                            ...prev,
                            offset: prev.offset + prev.limit,
                            currentPage: prev.currentPage + 1
                        }))}
                        disabled={pagination.offset + pagination.limit >= pagination.total}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: pagination.offset + pagination.limit >= pagination.total ? '#e9ecef' : '#007bff',
                            color: pagination.offset + pagination.limit >= pagination.total ? '#6c757d' : 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: pagination.offset + pagination.limit >= pagination.total ? 'not-allowed' : 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Modals would go here - placeholder for now */}
            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                        padding: '30px',
                        borderRadius: '8px',
                        maxWidth: '500px',
                        width: '90%'
                    }}>
                        <h3 style={{ margin: '0 0 20px 0', color: theme === 'dark' ? '#ffffff' : '#333333' }}>
                            Add Past Performance
                        </h3>
                        <p style={{ color: theme === 'dark' ? '#cccccc' : '#666666', marginBottom: '20px' }}>
                            This feature is coming soon. For now, you can upload past performance documents using the Upload Documents button.
                        </p>
                        <button
                            onClick={() => setShowAddModal(false)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {showDetailModal && selectedPP && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                        padding: '30px',
                        borderRadius: '8px',
                        maxWidth: '800px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: theme === 'dark' ? '#ffffff' : '#333333' }}>
                                {selectedPP.projectName}
                            </h3>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    color: theme === 'dark' ? '#cccccc' : '#666666'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{
                            color: theme === 'dark' ? '#cccccc' : '#666666',
                            lineHeight: '1.6'
                        }}>
                            <p><strong>Customer:</strong> {selectedPP.customer}</p>
                            <p><strong>Contract Value:</strong> {formatCurrency(selectedPP.contractValue)}</p>
                            <p><strong>Contract Type:</strong> {selectedPP.contractType}</p>
                            <p><strong>Work Type:</strong> {selectedPP.workType}</p>
                            <p><strong>Duration:</strong> {formatDate(selectedPP.startDate)} - {formatDate(selectedPP.endDate)}</p>
                            <p><strong>Summary:</strong></p>
                            <p style={{ marginLeft: '20px' }}>{selectedPP.summary}</p>

                            {selectedPP.technicalApproach && (
                                <>
                                    <p><strong>Technical Approach:</strong></p>
                                    <p style={{ marginLeft: '20px' }}>{selectedPP.technicalApproach}</p>
                                </>
                            )}

                            {selectedPP.technologiesUsed && selectedPP.technologiesUsed.length > 0 && (
                                <>
                                    <p><strong>Technologies Used:</strong></p>
                                    <div style={{ marginLeft: '20px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                        {selectedPP.technologiesUsed.map((tech, index) => (
                                            <span
                                                key={index}
                                                style={{
                                                    backgroundColor: theme === 'dark' ? '#404040' : '#f8f9fa',
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    border: `1px solid ${theme === 'dark' ? '#555' : '#dee2e6'}`
                                                }}
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showUploadModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                        padding: '30px',
                        borderRadius: '8px',
                        maxWidth: '500px',
                        width: '90%'
                    }}>
                        <h3 style={{ margin: '0 0 20px 0', color: theme === 'dark' ? '#ffffff' : '#333333' }}>
                            Upload Past Performance Documents
                        </h3>
                        <p style={{ color: theme === 'dark' ? '#cccccc' : '#666666', marginBottom: '20px' }}>
                            This feature is coming soon. You'll be able to upload and process past performance documents here.
                        </p>
                        <button
                            onClick={() => setShowUploadModal(false)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PastPerformanceManager;