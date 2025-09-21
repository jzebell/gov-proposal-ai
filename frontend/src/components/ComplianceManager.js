import React, { useState, useEffect } from 'react';

const ComplianceManager = () => {
  const [activeTab, setActiveTab] = useState('extract');
  const [documentText, setDocumentText] = useState('');
  const [extractedRequirements, setExtractedRequirements] = useState([]);
  const [complianceMatrix, setComplianceMatrix] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [frameworks, setFrameworks] = useState({});
  const [templates, setTemplates] = useState({});
  const [healthStatus, setHealthStatus] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  useEffect(() => {
    loadFrameworks();
    loadTemplates();
    checkHealth();
    loadSampleDocument();
  }, []);

  const loadFrameworks = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/compliance/frameworks`);
      const data = await response.json();
      if (data.success) {
        setFrameworks(data.data.frameworks);
      }
    } catch (error) {
      console.error('Error loading frameworks:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/compliance/templates`);
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/compliance/health`);
      const data = await response.json();
      if (data.success) {
        setHealthStatus(data.data);
      }
    } catch (error) {
      console.error('Error checking health:', error);
      setHealthStatus({ available: false, error: error.message });
    }
  };

  const loadSampleDocument = () => {
    setDocumentText(`
SECTION C - DESCRIPTION/SPECIFICATIONS/WORK STATEMENT

C.1 GENERAL REQUIREMENTS

The contractor shall provide a comprehensive cloud-based document management system that meets the following requirements:

C.1.1 SECURITY REQUIREMENTS
- All data must be encrypted at rest and in transit using FIPS 140-2 Level 2 approved encryption
- Multi-factor authentication (MFA) required for all user access
- System must maintain FISMA Moderate security controls
- Annual security assessments and continuous monitoring required
- Incident response plan must be maintained with 24/7 SOC support

C.1.2 ACCESSIBILITY REQUIREMENTS
- System must comply with Section 508 accessibility standards
- WCAG 2.1 Level AA compliance required
- Alternative text for all images and graphics
- Keyboard navigation support for all functions
- Screen reader compatibility required

C.1.3 PERFORMANCE REQUIREMENTS
- System response time must not exceed 3 seconds for 95% of transactions
- 99.9% uptime required with monthly SLA reporting
- Support for minimum 5,000 concurrent users
- Automated backup and disaster recovery with 4-hour RTO

C.1.4 COMPLIANCE REQUIREMENTS
- SOC 2 Type II certification required
- NIST Cybersecurity Framework implementation
- FedRAMP authorization preferred
- Annual third-party security audits

C.1.5 DOCUMENTATION REQUIREMENTS
- Comprehensive system documentation including architecture diagrams
- User training materials and administration guides
- Security documentation and compliance matrices
- Monthly progress reports and quarterly reviews
    `);
  };

  const extractRequirements = async () => {
    if (!documentText.trim()) {
      alert('Please enter document text');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/compliance/extract-requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText: documentText
        })
      });

      const data = await response.json();

      if (data.success) {
        setExtractedRequirements(data.data.extractedRequirements);
        console.log('Requirements extracted:', data.data);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateMatrix = async () => {
    if (!extractedRequirements.length) {
      alert('Please extract requirements first');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/compliance/compliance-matrix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: extractedRequirements,
          evidence: [] // Could be populated with actual evidence
        })
      });

      const data = await response.json();

      if (data.success) {
        setComplianceMatrix(data.data);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const performRiskAssessment = async () => {
    if (!extractedRequirements.length) {
      alert('Please extract requirements first');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/compliance/risk-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: extractedRequirements,
          threats: []
        })
      });

      const data = await response.json();

      if (data.success) {
        setRiskAssessment(data.data);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const quickScan = async () => {
    if (!documentText.trim()) {
      alert('Please enter document text');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/compliance/quick-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText: documentText
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Quick Scan Results:
Security mentions: ${data.data.findings.securityMentions}
Compliance mentions: ${data.data.findings.complianceMentions}
Accessibility mentions: ${data.data.findings.accessibilityMentions}
Performance mentions: ${data.data.findings.performanceMentions}
Estimated requirements: ${data.data.estimatedRequirements}`);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderRequirementsList = () => (
    <div>
      <h4>Extracted Requirements ({extractedRequirements.length})</h4>
      {extractedRequirements.length === 0 ? (
        <p>No requirements extracted yet. Use the "Extract Requirements" button.</p>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
          {extractedRequirements.map((req, index) => (
            <div key={index} style={{
              marginBottom: '10px',
              padding: '10px',
              border: '1px solid #eee',
              borderRadius: '5px',
              backgroundColor: req.riskLevel === 'high' ? '#fff5f5' : req.riskLevel === 'medium' ? '#fffbf0' : '#f0fff4'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <strong>{req.id}</strong>
                  <span style={{
                    marginLeft: '10px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '11px',
                    backgroundColor: req.category === 'mandatory' ? '#dc3545' : '#6c757d',
                    color: 'white'
                  }}>
                    {req.category}
                  </span>
                  {req.framework && (
                    <span style={{
                      marginLeft: '5px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      backgroundColor: '#007bff',
                      color: 'white'
                    }}>
                      {req.framework}
                    </span>
                  )}
                </div>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  backgroundColor: req.riskLevel === 'high' ? '#dc3545' : req.riskLevel === 'medium' ? '#ffc107' : '#28a745',
                  color: req.riskLevel === 'medium' ? 'black' : 'white'
                }}>
                  {req.riskLevel} risk
                </span>
              </div>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>{req.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderComplianceMatrix = () => (
    <div>
      <h4>Compliance Matrix</h4>
      {!complianceMatrix ? (
        <p>No compliance matrix generated yet. Extract requirements and click "Generate Matrix".</p>
      ) : (
        <div>
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <h5>Summary</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              <div>Total Requirements: <strong>{complianceMatrix.summary.totalRequirements}</strong></div>
              <div>Fully Compliant: <strong>{complianceMatrix.summary.fullyCompliant}</strong></div>
              <div>Partially Compliant: <strong>{complianceMatrix.summary.partiallyCompliant}</strong></div>
              <div>Non-Compliant: <strong>{complianceMatrix.summary.nonCompliant}</strong></div>
              <div>Overall Score: <strong>{complianceMatrix.summary.overallScore}%</strong></div>
            </div>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {complianceMatrix.complianceMatrix.slice(0, 10).map((item, index) => (
              <div key={index} style={{
                marginBottom: '10px',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{item.requirementId}</strong>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '11px',
                    backgroundColor: item.complianceStatus === 'compliant' ? '#28a745' :
                                   item.complianceStatus === 'partial' ? '#ffc107' : '#dc3545',
                    color: item.complianceStatus === 'partial' ? 'black' : 'white'
                  }}>
                    {item.complianceStatus}
                  </span>
                </div>
                <p style={{ margin: '5px 0', fontSize: '13px' }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderRiskAssessment = () => (
    <div>
      <h4>Risk Assessment</h4>
      {!riskAssessment ? (
        <p>No risk assessment performed yet. Extract requirements and click "Risk Assessment".</p>
      ) : (
        <div>
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              <div>Requirements Analyzed: <strong>{riskAssessment.requirementsAnalyzed}</strong></div>
              <div>Overall Risk Level: <strong style={{ color: riskAssessment.overallRiskLevel === 'high' ? '#dc3545' : '#ffc107' }}>
                {riskAssessment.overallRiskLevel}
              </strong></div>
              <div>Critical Risks: <strong>{riskAssessment.criticalRisks}</strong></div>
            </div>
          </div>
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            backgroundColor: '#fff',
            fontSize: '14px',
            whiteSpace: 'pre-wrap'
          }}>
            {riskAssessment.riskAssessment}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🛡️ Epic 4: Compliance Management</h2>

      {/* Health Status */}
      <div style={{
        padding: '10px',
        marginBottom: '20px',
        borderRadius: '5px',
        backgroundColor: healthStatus?.available ? '#d4edda' : '#f8d7da',
        border: `1px solid ${healthStatus?.available ? '#c3e6cb' : '#f5c6cb'}`
      }}>
        <strong>Compliance Service Status:</strong> {' '}
        {healthStatus?.available ? (
          <span style={{ color: '#155724' }}>✅ Online ({healthStatus.supportedFrameworks} frameworks)</span>
        ) : (
          <span style={{ color: '#721c24' }}>❌ Service unavailable</span>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        {[
          { id: 'extract', label: '📋 Extract Requirements' },
          { id: 'matrix', label: '📊 Compliance Matrix' },
          { id: 'risk', label: '⚠️ Risk Assessment' },
          { id: 'frameworks', label: '📚 Frameworks' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #007bff' : '3px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Extract Requirements Tab */}
      {activeTab === 'extract' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h3>Solicitation Document</h3>
              <textarea
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Paste your solicitation document text here..."
                style={{
                  width: '100%',
                  height: '300px',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '12px'
                }}
              />
              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={extractRequirements}
                  disabled={loading || !healthStatus?.available}
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
                  {loading ? '🔄 Extracting...' : '🚀 Extract Requirements'}
                </button>
                <button
                  onClick={quickScan}
                  disabled={loading}
                  style={{
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  ⚡ Quick Scan
                </button>
              </div>
            </div>

            <div>
              {renderRequirementsList()}
            </div>
          </div>

          {extractedRequirements.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={generateMatrix}
                disabled={loading}
                style={{
                  backgroundColor: '#6f42c1',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginRight: '10px'
                }}
              >
                📊 Generate Matrix
              </button>
              <button
                onClick={performRiskAssessment}
                disabled={loading}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                ⚠️ Risk Assessment
              </button>
            </div>
          )}
        </div>
      )}

      {/* Compliance Matrix Tab */}
      {activeTab === 'matrix' && renderComplianceMatrix()}

      {/* Risk Assessment Tab */}
      {activeTab === 'risk' && renderRiskAssessment()}

      {/* Frameworks Tab */}
      {activeTab === 'frameworks' && (
        <div>
          <h3>Supported Compliance Frameworks</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            {Object.entries(frameworks).map(([code, name]) => (
              <div key={code} style={{
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                backgroundColor: '#f8f9fa'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>{code}</h4>
                <p style={{ margin: 0, fontSize: '14px' }}>{name}</p>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: '30px' }}>Requirement Templates</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            {Object.entries(templates).map(([key, template]) => (
              <div key={key} style={{
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                backgroundColor: '#fff'
              }}>
                <h4 style={{ margin: '0 0 10px 0' }}>{template.name}</h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#666' }}>{template.description}</p>
                <div style={{ fontSize: '12px' }}>
                  <strong>Framework:</strong> {template.framework}
                  <br />
                  <strong>Categories:</strong> {template.categories?.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Overview */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#e9ecef',
        borderRadius: '5px'
      }}>
        <h4>🎯 Epic 4 Features Available:</h4>
        <ul>
          <li><strong>Requirements Extraction</strong> - AI-powered analysis of solicitation documents</li>
          <li><strong>Compliance Matrix</strong> - Track requirement coverage and evidence</li>
          <li><strong>Risk Assessment</strong> - Identify and prioritize compliance risks</li>
          <li><strong>Framework Support</strong> - FAR, NIST, FISMA, CMMC, Section 508, SOC 2, and more</li>
          <li><strong>Gap Analysis</strong> - Compare current capabilities against requirements</li>
          <li><strong>Compliance Checklists</strong> - Actionable task lists by framework</li>
          <li><strong>Proposal Validation</strong> - Check proposal content against requirements</li>
          <li><strong>Compliance Reporting</strong> - Comprehensive compliance documentation</li>
        </ul>
      </div>
    </div>
  );
};

export default ComplianceManager;