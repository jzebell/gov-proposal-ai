import React, { useState } from 'react';

const ApiExplorer = () => {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const apiEndpoints = [
    { name: 'Health Check', method: 'GET', url: '/health', description: 'Check if backend is running' },
    { name: 'List Past Performance', method: 'GET', url: '/api/past-performance', description: 'Get all past performance records' },
    { name: 'Search Past Performance', method: 'GET', url: '/api/past-performance/search?q=cloud', description: 'Search for cloud-related projects' },
    { name: 'Analytics', method: 'GET', url: '/api/past-performance/analytics', description: 'Get usage analytics' },
    { name: 'Documents', method: 'GET', url: '/api/documents', description: 'Document management endpoint' },
    { name: 'Analysis', method: 'GET', url: '/api/analysis', description: 'Analysis features endpoint' }
  ];

  const testEndpoint = async (endpoint) => {
    setLoading(true);
    setResponse('Loading...');

    try {
      const response = await fetch(endpoint.url);
      const data = await response.text();

      setResponse(`Status: ${response.status}\n\n${data}`);
    } catch (error) {
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🚀 Epic 2: API Explorer</h2>
      <p>Test the new Past Performance API endpoints below:</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>Available Endpoints</h3>
          {apiEndpoints.map((endpoint, index) => (
            <div key={index} style={{
              border: '1px solid #ddd',
              padding: '10px',
              margin: '10px 0',
              borderRadius: '5px',
              backgroundColor: '#f9f9f9'
            }}>
              <h4 style={{ margin: '0 0 5px 0' }}>
                <span style={{
                  backgroundColor: endpoint.method === 'GET' ? '#28a745' : '#007bff',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '12px',
                  marginRight: '8px'
                }}>
                  {endpoint.method}
                </span>
                {endpoint.name}
              </h4>
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                {endpoint.description}
              </p>
              <code style={{
                backgroundColor: '#e9ecef',
                padding: '2px 4px',
                borderRadius: '3px',
                fontSize: '12px',
                display: 'block',
                marginBottom: '8px'
              }}>
                {endpoint.url}
              </code>
              <button
                onClick={() => testEndpoint(endpoint)}
                disabled={loading}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Test Endpoint
              </button>
            </div>
          ))}
        </div>

        <div>
          <h3>Response</h3>
          <textarea
            value={response}
            readOnly
            style={{
              width: '100%',
              height: '400px',
              fontFamily: 'monospace',
              fontSize: '12px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
            placeholder="Click any endpoint above to see the response here..."
          />
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '5px' }}>
        <h4>🔍 What's New in Epic 2:</h4>
        <ul>
          <li><strong>Past Performance Management</strong> - CRUD operations for project records</li>
          <li><strong>Semantic Search</strong> - AI-powered search with vector embeddings</li>
          <li><strong>Technology Extraction</strong> - Automatic categorization of technologies used</li>
          <li><strong>Analytics & Reporting</strong> - Usage statistics and trends</li>
          <li><strong>Document Processing</strong> - Chunking and vector storage for RAG</li>
          <li><strong>Comprehensive API</strong> - 9 REST endpoints with validation and error handling</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiExplorer;