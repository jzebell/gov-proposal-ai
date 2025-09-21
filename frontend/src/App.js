import React, { useState } from 'react';
import DocumentUpload from './components/DocumentUpload';
import ApiExplorer from './components/ApiExplorer';
import AIWritingAssistant from './components/AIWritingAssistant';
import ComplianceManager from './components/ComplianceManager';

function App() {
  const [activeTab, setActiveTab] = useState('explorer');

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <header style={{
        backgroundColor: '#007bff',
        color: 'white',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h1 style={{ margin: 0 }}>Government Proposal AI Assistant</h1>
        <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
          Epic 2: Past Performance ✅ | Epic 3: AI Writing ✅ | Epic 4: Compliance ✅
        </p>
      </header>

      <nav style={{ padding: '0 20px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('explorer')}
          style={{
            backgroundColor: activeTab === 'explorer' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            marginRight: '10px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🚀 API Explorer (NEW)
        </button>
        <button
          onClick={() => setActiveTab('ai-writing')}
          style={{
            backgroundColor: activeTab === 'ai-writing' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            marginRight: '10px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🤖 AI Writing (NEW)
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          style={{
            backgroundColor: activeTab === 'compliance' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            marginRight: '10px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🛡️ Compliance (NEW)
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          style={{
            backgroundColor: activeTab === 'upload' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          📄 Document Upload
        </button>
      </nav>

      <main>
        {activeTab === 'explorer' && <ApiExplorer />}
        {activeTab === 'ai-writing' && <AIWritingAssistant />}
        {activeTab === 'compliance' && <ComplianceManager />}
        {activeTab === 'upload' && (
          <div style={{ padding: '20px' }}>
            <DocumentUpload />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;