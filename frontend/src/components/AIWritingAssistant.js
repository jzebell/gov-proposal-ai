import React, { useState, useEffect } from 'react';
import useModelWarmup from '../hooks/useModelWarmup';
import AIStatusIndicator from './AIStatusIndicator';

const AIWritingAssistant = () => {
  const [selectedSection, setSelectedSection] = useState('technical-approach');
  const [selectedModel, setSelectedModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState({});
  const [models, setModels] = useState([]);
  const [aiHealth, setAiHealth] = useState(null);
  const [usingLayeredPrompt, setUsingLayeredPrompt] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Initialize model warm-up hook
  const {
    getSystemStatus,
    triggerModelSwitchWarmup,
    isModelWarm,
    isModelWarming,
    warmModelCount,
    isSystemWarming
  } = useModelWarmup({
    apiUrl,
    autoWarmup: true,
    enableSmartWarmup: true,
    warmupOnMount: true,
    warmupOnModelSwitch: true
  });

  useEffect(() => {
    loadTemplates();
    checkAIHealth();
    loadModels();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/ai-writing/templates`);
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
        setPrompt(data.data['technical-approach']?.samplePrompt || '');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const checkAIHealth = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/ai-writing/health`);
      const data = await response.json();
      if (data.success) {
        setAiHealth(data.data);
      }
    } catch (error) {
      console.error('Error checking AI health:', error);
      setAiHealth({ available: false, error: error.message });
    }
  };

  const loadModels = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/ai-writing/models`);
      const data = await response.json();
      if (data.success) {
        setModels(data.data.models);
        // Set default model if none selected
        if (!selectedModel && data.data.models.length > 0) {
          const defaultModel = data.data.models.find(m => m.isRecommended) || data.data.models[0];
          setSelectedModel(defaultModel.name);
        }
      }
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const handleModelChange = async (newModel) => {
    if (newModel !== selectedModel) {
      setSelectedModel(newModel);
      // Trigger warmup for the new model
      await triggerModelSwitchWarmup(newModel, {
        userPreferences: [newModel],
        recentlyUsed: [newModel]
      });
    }
  };

  const generateContent = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setLoading(true);
    setGeneratedContent('Generating content with AI...');

    try {
      // First, build the layered prompt using the global prompt configuration system
      const promptResponse = await fetch(`${apiUrl}/api/global-prompts/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_prompt: prompt,
          section_type: selectedSection,
          document_type: 'proposal',
          persona_id: null // Could be made configurable later
        })
      });

      let finalPrompt = prompt; // Fallback to original prompt
      if (promptResponse.ok) {
        const promptData = await promptResponse.json();
        if (promptData.success) {
          finalPrompt = promptData.data.final_prompt;
          setUsingLayeredPrompt(true);
          console.log('Using layered prompt:', promptData);
        }
      } else {
        setUsingLayeredPrompt(false);
      }

      const response = await fetch(`${apiUrl}/api/ai-writing/generate-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          sectionType: selectedSection,
          requirements: {
            model: selectedModel,
            length: '500-800 words',
            evaluationCriteria: 'Technical merit, understanding of requirements, past performance'
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedContent(data.data.content);
      } else {
        setGeneratedContent(`Error: ${data.message}`);
      }
    } catch (error) {
      setGeneratedContent(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const improveContent = async () => {
    if (!generatedContent.trim()) {
      alert('No content to improve');
      return;
    }

    setLoading(true);

    try {
      // Build layered prompt for content improvement
      const improvementPrompt = `Improve this content for clarity, persuasiveness, and compliance: ${generatedContent}`;

      const promptResponse = await fetch(`${apiUrl}/api/global-prompts/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_prompt: improvementPrompt,
          section_type: selectedSection,
          document_type: 'proposal',
          persona_id: null,
          context_overrides: {
            task_type: 'improvement'
          }
        })
      });

      let finalImprovementPrompt = improvementPrompt;
      if (promptResponse.ok) {
        const promptData = await promptResponse.json();
        if (promptData.success) {
          finalImprovementPrompt = promptData.data.final_prompt;
          console.log('Using layered improvement prompt:', promptData);
        }
      }

      const response = await fetch(`${apiUrl}/api/ai-writing/improve-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generatedContent,
          improvementType: 'general',
          layeredPrompt: finalImprovementPrompt
        })
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedContent(data.data.improvedContent);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (sectionType) => {
    setSelectedSection(sectionType);
    if (templates[sectionType]) {
      setPrompt(templates[sectionType].samplePrompt);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🤖 Epic 3: AI Writing Assistant</h2>

      {/* AI Status and Model Selection */}
      <AIStatusIndicator
        systemStatus={getSystemStatus()}
        aiHealth={aiHealth}
        models={models}
        showDetails={true}
      />

      {/* Model Selection */}
      {models.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Select AI Model:
          </label>
          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            {models.map(model => (
              <option key={model.id} value={model.name}>
                {model.name}
                {model.isRecommended && ' (Recommended)'}
                {isModelWarm(model.name) && ' 🔥'}
                {isModelWarming(model.name) && ' 🔄'}
              </option>
            ))}
          </select>

          {selectedModel && (
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
              {(() => {
                const model = models.find(m => m.name === selectedModel);
                return model ? model.description : 'Model information not available';
              })()}
              {isModelWarm(selectedModel) && (
                <span style={{ color: '#28a745', fontWeight: 'bold' }}> • Ready</span>
              )}
              {isModelWarming(selectedModel) && (
                <span style={{ color: '#fd7e14', fontWeight: 'bold' }}> • Warming up...</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section Type Selector */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Select Proposal Section</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {Object.entries(templates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => handleTemplateChange(key)}
              style={{
                padding: '10px',
                border: selectedSection === key ? '2px solid #007bff' : '1px solid #ddd',
                borderRadius: '5px',
                backgroundColor: selectedSection === key ? '#e7f3ff' : 'white',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <strong>{template.name}</strong>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                {template.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content Generation Interface */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Input Section */}
        <div>
          <h3>Prompt & Requirements</h3>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to write..."
            style={{
              width: '100%',
              height: '200px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '14px'
            }}
          />

          <div style={{ marginTop: '10px' }}>
            <button
              onClick={generateContent}
              disabled={loading || !aiHealth?.available}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginRight: '10px'
              }}
            >
              {loading ? '🔄 Generating...' : '🚀 Generate Content'}
              {usingLayeredPrompt && !loading && ' ✨'}
            </button>

            <button
              onClick={improveContent}
              disabled={loading || !generatedContent.trim()}
              style={{
                backgroundColor: '#ffc107',
                color: 'black',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              ✨ Improve Content
            </button>
          </div>

          {/* Selected Template Info */}
          {templates[selectedSection] && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '5px'
            }}>
              <strong>Template: {templates[selectedSection].name}</strong>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                Typical sections: {templates[selectedSection].sections?.join(', ')}
              </div>
            </div>
          )}

          {/* Layered Prompt Status */}
          {usingLayeredPrompt && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '5px',
              color: '#155724'
            }}>
              <strong>✨ Enhanced Prompting Active</strong>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                Your prompt is being enhanced with global writing guidelines, compliance rules, and section-specific guidance for better results.
              </div>
            </div>
          )}
        </div>

        {/* Output Section */}
        <div>
          <h3>Generated Content</h3>
          <textarea
            value={generatedContent}
            onChange={(e) => setGeneratedContent(e.target.value)}
            placeholder="Generated content will appear here..."
            style={{
              width: '100%',
              height: '300px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '14px'
            }}
          />

          {generatedContent && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
              Word count: {generatedContent.trim().split(/\s+/).length} words
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '30px' }}>
        <h3>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setSelectedSection('executive-summary');
              setPrompt('Create an executive summary for our cloud modernization proposal for the Department of Veterans Affairs...');
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            📋 Executive Summary
          </button>

          <button
            onClick={() => {
              setSelectedSection('technical-approach');
              setPrompt('Develop a technical approach for implementing a secure, cloud-based document management system with AI capabilities...');
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            ⚙️ Technical Approach
          </button>

          <button
            onClick={() => {
              setSelectedSection('management-plan');
              setPrompt('Create a management plan for a 18-month agile development project with distributed teams...');
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#20c997',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            👥 Management Plan
          </button>
        </div>
      </div>

      {/* Feature Overview */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#e9ecef',
        borderRadius: '5px'
      }}>
        <h4>🎯 Epic 3 Features Available:</h4>
        <ul>
          <li><strong>Section Generation</strong> - AI-powered writing for all proposal sections</li>
          <li><strong>Content Improvement</strong> - Enhance clarity, persuasiveness, and compliance</li>
          <li><strong>4-Layer Prompt Enhancement ✨</strong> - Global rules + context guidance + templates</li>
          <li><strong>Template Library</strong> - Pre-built prompts for common sections</li>
          <li><strong>Multi-Model Support</strong> - Qwen 2.5 14B/32B, Mistral, and more</li>
          <li><strong>Solicitation Analysis</strong> - Extract requirements from RFPs</li>
          <li><strong>Executive Summary Generation</strong> - Auto-create compelling summaries</li>
          <li><strong>Batch Processing</strong> - Generate multiple sections simultaneously</li>
        </ul>
      </div>
    </div>
  );
};

export default AIWritingAssistant;