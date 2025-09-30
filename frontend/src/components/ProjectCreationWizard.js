import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';

const ProjectCreationWizard = ({ isOpen, onClose, onProjectCreated, theme }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Info
    title: '',
    description: '',
    project_type: 'Solicitation Response',
    due_date: '',
    owner: null,

    // Government Hierarchy
    department_id: '',
    agency_id: '',
    sub_agency_id: '',
    program_office_id: '',

    // Project Details
    priority_level: 3,
    estimated_value: '',
    estimated_completion_date: '',
    classification_level: 'Unclassified',
    compliance_frameworks: [], // Changed to array for multi-select

    // Team Settings
    is_collaborative: true
  });

  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [subAgencies, setSubAgencies] = useState([]);
  const [programOffices, setProgramOffices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Compliance framework state
  const [complianceFrameworks, setComplianceFrameworks] = useState({});
  const [agencyFrameworks, setAgencyFrameworks] = useState([]);
  const [loadingFrameworks, setLoadingFrameworks] = useState(false);

  // Mock users data for owner selection
  const mockUsers = [
    { id: 1, name: 'Alice Johnson', email: 'alice.johnson@agency.gov', avatar: 'A', color: '#007bff' },
    { id: 2, name: 'Bob Williams', email: 'bob.williams@agency.gov', avatar: 'B', color: '#28a745' },
    { id: 3, name: 'Carol Martinez', email: 'carol.martinez@agency.gov', avatar: 'C', color: '#dc3545' },
    { id: 4, name: 'David Chen', email: 'david.chen@agency.gov', avatar: 'D', color: '#6f42c1' },
    { id: 5, name: 'Elena Rodriguez', email: 'elena.rodriguez@agency.gov', avatar: 'E', color: '#fd7e14' },
    { id: 6, name: 'Frank Thompson', email: 'frank.thompson@agency.gov', avatar: 'F', color: '#20c997' }
  ];

  // Project templates
  const projectTemplates = [
    {
      id: 'solicitation-response',
      name: 'Solicitation Response',
      description: 'Comprehensive response to government solicitations including RFPs, RFIs, and other procurement opportunities.',
      project_type: 'Solicitation Response',
      compliance_framework: 'FAR',
      default_roles: ['Proposal Lead', 'Writer', 'Solutions Architect', 'Reviewer'],
      icon: '📋'
    },
    {
      id: 'rfi-response',
      name: 'RFI Response',
      description: 'Response to Request for Information to demonstrate capabilities and gather market intelligence.',
      project_type: 'RFI Response',
      compliance_framework: 'FAR',
      default_roles: ['Proposal Lead', 'Writer', 'Subject Matter Expert'],
      icon: '❓'
    },
    {
      id: 'past-performance',
      name: 'Past Performance',
      description: 'Document historical project performance, client references, and capability demonstrations.',
      project_type: 'Past Performance',
      compliance_framework: 'FAR',
      default_roles: ['Proposal Lead', 'Writer', 'Subject Matter Expert'],
      icon: '📊'
    },
    {
      id: 'internal-research',
      name: 'Internal Research',
      description: 'R&D and internal analysis projects for competitive intelligence and market research.',
      project_type: 'Internal Research',
      compliance_framework: 'Internal',
      default_roles: ['Research Lead', 'Analyst', 'Writer'],
      icon: '🔬'
    }
  ];

  // Load reference data on mount
  useEffect(() => {
    if (isOpen) {
      loadReferenceData();
      loadComplianceFrameworks();
    }
  }, [isOpen]);

  // Load agency-specific frameworks when agency changes
  useEffect(() => {
    if (formData.agency_id) {
      loadAgencyFrameworks(formData.agency_id, formData.department_id);
    }
  }, [formData.agency_id, formData.department_id]);

  const loadReferenceData = async () => {
    try {
      // Try to load departments from API, fall back to mock data
      const deptResponse = await fetch('/api/projects/hierarchy/departments', {
        credentials: 'include'
      });
      if (deptResponse.ok) {
        const deptResult = await deptResponse.json();
        setDepartments(deptResult.data || []);
      } else {
        // Use mock departments
        setDepartments([
          { id: '1', name: 'Department of Defense (DoD)' },
          { id: '2', name: 'Department of Homeland Security (DHS)' },
          { id: '3', name: 'Department of Health and Human Services (HHS)' },
          { id: '4', name: 'Department of Energy (DOE)' },
          { id: '5', name: 'Department of Veterans Affairs (VA)' },
          { id: '6', name: 'Department of Agriculture (USDA)' },
          { id: '7', name: 'Department of Transportation (DOT)' },
          { id: '8', name: 'General Services Administration (GSA)' }
        ]);
      }

      // Load document types for project types
      const docTypesResponse = await fetch(API_ENDPOINTS.DOCUMENT_TYPES, {
        credentials: 'include'
      });
      if (docTypesResponse.ok) {
        const docTypesResult = await docTypesResponse.json();
        // Update project templates with available document types
        const availableTypes = docTypesResult.data.map(dt => dt.name);
        console.log('Available document types:', availableTypes);
      }
    } catch (error) {
      console.error('Error loading reference data:', error);
      // Use mock departments as fallback
      setDepartments([
        { id: '1', name: 'Department of Defense (DoD)' },
        { id: '2', name: 'Department of Homeland Security (DHS)' },
        { id: '3', name: 'Department of Health and Human Services (HHS)' },
        { id: '4', name: 'Department of Energy (DOE)' },
        { id: '5', name: 'Department of Veterans Affairs (VA)' },
        { id: '6', name: 'Department of Agriculture (USDA)' },
        { id: '7', name: 'Department of Transportation (DOT)' },
        { id: '8', name: 'General Services Administration (GSA)' }
      ]);
    }
  };

  const loadAgencies = async (departmentId) => {
    try {
      const response = await fetch(`/api/projects/hierarchy/agencies/${departmentId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        setAgencies(result.data || []);
        setSubAgencies([]);
        setProgramOffices([]);
      } else {
        // Use mock agencies based on department
        const mockAgencies = getMockAgencies(departmentId);
        setAgencies(mockAgencies);
        setSubAgencies([]);
        setProgramOffices([]);
      }
    } catch (error) {
      console.error('Error loading agencies:', error);
      // Use mock agencies as fallback
      const mockAgencies = getMockAgencies(departmentId);
      setAgencies(mockAgencies);
      setSubAgencies([]);
      setProgramOffices([]);
    }
  };

  const getMockAgencies = (departmentId) => {
    const agencyMap = {
      '1': [ // DoD
        { id: '1-1', name: 'U.S. Army' },
        { id: '1-2', name: 'U.S. Navy' },
        { id: '1-3', name: 'U.S. Air Force' },
        { id: '1-4', name: 'Defense Information Systems Agency (DISA)' }
      ],
      '2': [ // DHS
        { id: '2-1', name: 'Cybersecurity and Infrastructure Security Agency (CISA)' },
        { id: '2-2', name: 'U.S. Customs and Border Protection (CBP)' },
        { id: '2-3', name: 'Transportation Security Administration (TSA)' }
      ],
      '3': [ // HHS
        { id: '3-1', name: 'Centers for Disease Control and Prevention (CDC)' },
        { id: '3-2', name: 'Food and Drug Administration (FDA)' },
        { id: '3-3', name: 'National Institutes of Health (NIH)' }
      ]
    };
    return agencyMap[departmentId] || [];
  };

  const loadComplianceFrameworks = async () => {
    setLoadingFrameworks(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.COMPLIANCE}/frameworks`, {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        setComplianceFrameworks(result.data.frameworksByCategory || {});
      } else {
        console.warn('Failed to load compliance frameworks from API');
      }
    } catch (error) {
      console.error('Error loading compliance frameworks:', error);
    } finally {
      setLoadingFrameworks(false);
    }
  };

  const loadAgencyFrameworks = async (agencyId, departmentId = null) => {
    if (!agencyId) return;

    try {
      const url = departmentId
        ? `/api/compliance/frameworks/agency/${agencyId}?departmentId=${departmentId}`
        : `/api/compliance/frameworks/agency/${agencyId}`;

      const response = await fetch(url, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setAgencyFrameworks(result.data.frameworks || []);

        // Auto-select default frameworks for this agency
        const defaultFrameworks = result.data.frameworks
          .filter(fw => fw.isDefault)
          .map(fw => fw.id);

        if (defaultFrameworks.length > 0) {
          setFormData(prev => ({
            ...prev,
            compliance_frameworks: [...new Set([...prev.compliance_frameworks, ...defaultFrameworks])]
          }));
        }
      }
    } catch (error) {
      console.error('Error loading agency frameworks:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear related errors
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }

    // Handle department change
    if (field === 'department_id' && value) {
      loadAgencies(value);
      setFormData(prev => ({
        ...prev,
        agency_id: '',
        sub_agency_id: '',
        program_office_id: ''
      }));
    }
  };

  const selectTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      project_type: template.project_type,
      compliance_framework: template.compliance_framework
    }));
    setCurrentStep(2);
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 2: // Basic Info
        if (!formData.title.trim()) newErrors.title = 'Project title is required';
        if (!formData.description.trim()) newErrors.description = 'Project description is required';
        if (!formData.due_date) newErrors.due_date = 'Due date is required';
        if (!formData.owner) newErrors.owner = 'Project owner is required';
        break;
      case 3: // Government Hierarchy
        if (!formData.department_id) newErrors.department_id = 'Department is required';
        break;
      case 4: // Project Details - all optional but validate formats
        if (formData.estimated_value && isNaN(parseFloat(formData.estimated_value))) {
          newErrors.estimated_value = 'Estimated value must be a number';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);
    try {
      const projectData = {
        ...formData,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null
      };

      const response = await fetch(API_ENDPOINTS.PROJECTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(projectData)
      });

      if (response.ok) {
        const result = await response.json();
        onProjectCreated?.(result.data);
        onClose();
        // Reset form
        setCurrentStep(1);
        setFormData({
          title: '',
          description: '',
          project_type: 'Solicitation Response',
          due_date: '',
          owner: null,
          department_id: '',
          agency_id: '',
          sub_agency_id: '',
          program_office_id: '',
          priority_level: 3,
          estimated_value: '',
          estimated_completion_date: '',
          classification_level: 'Unclassified',
          compliance_frameworks: [],
          is_collaborative: true
        });
      } else {
        const errorResult = await response.json();
        console.error('Error creating project:', errorResult);
        setErrors({ submit: errorResult.error || 'Failed to create project' });
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Template Selection
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: theme.text }}>Choose a Project Template</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              {projectTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  style={{
                    border: `2px solid ${theme.border}`,
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: theme.surface,
                    ':hover': {
                      borderColor: theme.primary,
                      transform: 'translateY(-2px)'
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = theme.primary;
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = theme.border;
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>{template.icon}</div>
                  <h4 style={{ margin: '0 0 8px 0', color: theme.text }}>{template.name}</h4>
                  <p style={{
                    margin: '0',
                    color: theme.textSecondary,
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    {template.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      case 2: // Basic Information
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: theme.text }}>Basic Information</h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: theme.text
              }}>
                Project Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${errors.title ? '#dc3545' : theme.border}`,
                  borderRadius: '8px',
                  backgroundColor: theme.background,
                  color: theme.text,
                  fontSize: '14px'
                }}
                placeholder="Enter project title..."
              />
              {errors.title && (
                <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                  {errors.title}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: theme.text
              }}>
                Project Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${errors.description ? '#dc3545' : theme.border}`,
                  borderRadius: '8px',
                  backgroundColor: theme.background,
                  color: theme.text,
                  fontSize: '14px',
                  minHeight: '100px',
                  resize: 'vertical'
                }}
                placeholder="Enter project description..."
              />
              {errors.description && (
                <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                  {errors.description}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: theme.text
              }}>
                Project Type
              </label>
              <select
                value={formData.project_type}
                onChange={(e) => handleInputChange('project_type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  backgroundColor: theme.background,
                  color: theme.text,
                  fontSize: '14px'
                }}
              >
                <option value="Solicitation Response">Solicitation Response</option>
                <option value="RFI Response">RFI Response</option>
                <option value="Past Performance">Past Performance</option>
                <option value="Internal Research">Internal Research</option>
              </select>
            </div>

            {/* Sub-type for Solicitation Response */}
            {formData.project_type === 'Solicitation Response' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  Solicitation Type
                </label>
                <select
                  value={formData.solicitation_subtype || ''}
                  onChange={(e) => handleInputChange('solicitation_subtype', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select solicitation type...</option>
                  <option value="RFP">RFP - Request for Proposal</option>
                  <option value="SOW">SOW - Statement of Work</option>
                  <option value="PWS">PWS - Performance Work Statement</option>
                  <option value="RFQ">RFQ - Request for Quote</option>
                  <option value="IFB">IFB - Invitation for Bid</option>
                </select>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${errors.due_date ? '#dc3545' : theme.border}`,
                    borderRadius: '8px',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: '14px'
                  }}
                />
                {errors.due_date && (
                  <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                    {errors.due_date}
                  </div>
                )}
                {formData.due_date && (
                  <small style={{ color: theme.textSecondary, fontSize: '12px', display: 'block', marginTop: '2px' }}>
                    Due in {Math.ceil((new Date(formData.due_date) - new Date()) / (1000 * 60 * 60 * 24))} days
                  </small>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  Project Owner *
                </label>
                <select
                  value={formData.owner ? formData.owner.id : ''}
                  onChange={(e) => {
                    const selectedUser = mockUsers.find(user => user.id === parseInt(e.target.value));
                    handleInputChange('owner', selectedUser);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${errors.owner ? '#dc3545' : theme.border}`,
                    borderRadius: '8px',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select owner...</option>
                  {mockUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                {errors.owner && (
                  <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                    {errors.owner}
                  </div>
                )}
                {formData.owner && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: theme.surface,
                    borderRadius: '4px',
                    border: `1px solid ${theme.border}`
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: formData.owner.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {formData.owner.avatar}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: theme.text }}>{formData.owner.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 3: // Government Hierarchy
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: theme.text }}>Government Hierarchy</h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: theme.text
              }}>
                Department *
              </label>
              <select
                value={formData.department_id}
                onChange={(e) => handleInputChange('department_id', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${errors.department_id ? '#dc3545' : theme.border}`,
                  borderRadius: '8px',
                  backgroundColor: theme.background,
                  color: theme.text,
                  fontSize: '14px'
                }}
              >
                <option value="">Select Department...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {errors.department_id && (
                <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                  {errors.department_id}
                </div>
              )}
            </div>

            {formData.department_id && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  Agency
                </label>
                <select
                  value={formData.agency_id}
                  onChange={(e) => handleInputChange('agency_id', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Agency...</option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );

      case 4: // Project Details
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: theme.text }}>Project Details</h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  Priority Level
                </label>
                <select
                  value={formData.priority_level}
                  onChange={(e) => handleInputChange('priority_level', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: '14px'
                  }}
                >
                  <option value={1}>⚡ High (1)</option>
                  <option value={2}>🔥 Medium-High (2)</option>
                  <option value={3}>⭐ Normal (3)</option>
                  <option value={4}>❄️ Low (4)</option>
                  <option value={5}>💤 Very Low (5)</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  Classification Level
                </label>
                <select
                  value={formData.classification_level}
                  onChange={(e) => handleInputChange('classification_level', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: '14px'
                  }}
                >
                  <option value="Unclassified">Unclassified</option>
                  <option value="CUI">CUI (Controlled Unclassified Information)</option>
                  <option value="Confidential">Confidential</option>
                  <option value="Secret">Secret</option>
                  <option value="Top Secret">Top Secret</option>
                </select>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  Estimated Value ($)
                </label>
                <input
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => handleInputChange('estimated_value', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${errors.estimated_value ? '#dc3545' : theme.border}`,
                    borderRadius: '8px',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: '14px'
                  }}
                  placeholder="e.g. 1000000"
                />
                {errors.estimated_value && (
                  <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                    {errors.estimated_value}
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  Estimated Completion Date
                </label>
                <input
                  type="date"
                  value={formData.estimated_completion_date}
                  onChange={(e) => handleInputChange('estimated_completion_date', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Compliance Frameworks Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <label style={{
                  fontWeight: '600',
                  color: theme.text,
                  fontSize: '16px'
                }}>
                  Compliance Requirements
                </label>
                {loadingFrameworks && (
                  <div style={{ color: theme.textSecondary, fontSize: '12px' }}>
                    Loading frameworks...
                  </div>
                )}
              </div>

              {agencyFrameworks.length > 0 && (
                <div style={{
                  backgroundColor: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <h5 style={{ margin: '0 0 8px 0', color: theme.text, fontSize: '14px' }}>
                    📋 Suggested for {agencies.find(a => a.id === formData.agency_id)?.name || 'Selected Agency'}
                  </h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {agencyFrameworks.filter(fw => fw.isDefault).map(framework => (
                      <span
                        key={framework.id}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: theme.primary,
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {framework.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                backgroundColor: theme.background
              }}>
                {Object.entries(complianceFrameworks).map(([categoryKey, category]) => (
                  <div key={categoryKey} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: theme.surface,
                      borderBottom: `1px solid ${theme.border}`,
                      fontWeight: '600',
                      color: theme.text,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: category.colorCode || theme.primary
                        }}
                      />
                      {category.displayName}
                    </div>
                    <div style={{ padding: '8px' }}>
                      {category.frameworks?.map(framework => (
                        <div
                          key={framework.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px',
                            borderRadius: '4px',
                            marginBottom: '2px',
                            backgroundColor: formData.compliance_frameworks.includes(framework.id) ? theme.surface : 'transparent',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            const frameworkId = framework.id;
                            if (formData.compliance_frameworks.includes(frameworkId)) {
                              handleInputChange('compliance_frameworks', formData.compliance_frameworks.filter(id => id !== frameworkId));
                            } else {
                              handleInputChange('compliance_frameworks', [...formData.compliance_frameworks, frameworkId]);
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (!formData.compliance_frameworks.includes(framework.id)) {
                              e.currentTarget.style.backgroundColor = theme.surface;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!formData.compliance_frameworks.includes(framework.id)) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.compliance_frameworks.includes(framework.id)}
                            onChange={() => {}} // Controlled by div click
                            style={{ marginRight: '8px', transform: 'scale(1.1)', pointerEvents: 'none' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontWeight: '500',
                              color: theme.text,
                              fontSize: '13px',
                              marginBottom: '2px'
                            }}>
                              {framework.code} - {framework.name}
                            </div>
                            {framework.description && (
                              <div style={{
                                fontSize: '11px',
                                color: theme.textSecondary,
                                lineHeight: '1.3'
                              }}>
                                {framework.description}
                              </div>
                            )}
                          </div>
                          {framework.agencySpecific && (
                            <span style={{
                              fontSize: '10px',
                              color: theme.textSecondary,
                              backgroundColor: theme.surface,
                              padding: '2px 6px',
                              borderRadius: '8px',
                              marginLeft: '8px'
                            }}>
                              Agency-Specific
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {formData.compliance_frameworks.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{
                    fontSize: '12px',
                    color: theme.textSecondary,
                    marginBottom: '8px'
                  }}>
                    Selected Compliance Frameworks ({formData.compliance_frameworks.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {formData.compliance_frameworks.map(frameworkId => {
                      const framework = Object.values(complianceFrameworks)
                        .flatMap(cat => cat.frameworks || [])
                        .find(fw => fw.id === frameworkId);

                      if (!framework) return null;

                      return (
                        <span
                          key={frameworkId}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: theme.surface,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: theme.text,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {framework.code}
                          <button
                            onClick={() => {
                              handleInputChange('compliance_frameworks', formData.compliance_frameworks.filter(id => id !== frameworkId));
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: theme.textSecondary,
                              cursor: 'pointer',
                              fontSize: '10px',
                              padding: '0',
                              marginLeft: '2px'
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{
                fontSize: '12px',
                color: theme.textSecondary,
                marginTop: '8px',
                fontStyle: 'italic'
              }}>
                Select all compliance frameworks that apply to this {formData.project_type.toLowerCase()}.
                Multiple frameworks often apply to government contracts.
              </div>
            </div>
          </div>
        );

      case 5: // Team Settings & Review
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: theme.text }}>Team Settings & Review</h3>

            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: theme.text
              }}>
                <input
                  type="checkbox"
                  checked={formData.is_collaborative}
                  onChange={(e) => handleInputChange('is_collaborative', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span style={{ fontWeight: '600' }}>Enable Team Collaboration</span>
              </label>
              <small style={{
                display: 'block',
                marginTop: '8px',
                color: theme.textSecondary,
                fontSize: '12px'
              }}>
                Allow multiple team members to collaborate on this project
              </small>
            </div>

            {/* Project Summary */}
            <div style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 16px 0', color: theme.text }}>Project Summary</h4>

              <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.textSecondary }}>Title:</span>
                  <span style={{ color: theme.text, fontWeight: '600' }}>{formData.title}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.textSecondary }}>Type:</span>
                  <span style={{ color: theme.text }}>{formData.project_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.textSecondary }}>Priority:</span>
                  <span style={{ color: theme.text }}>Level {formData.priority_level}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.textSecondary }}>Compliance:</span>
                  <span style={{ color: theme.text }}>{formData.compliance_framework}</span>
                </div>
                {formData.estimated_value && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: theme.textSecondary }}>Est. Value:</span>
                    <span style={{ color: theme.primary, fontWeight: '600' }}>
                      ${parseFloat(formData.estimated_value).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return <div>Step {currentStep} content coming soon...</div>;
    }
  };

  if (!isOpen) return null;

  return (
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
        borderRadius: '16px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, color: theme.text }}>Create New Project</h2>
            <div style={{
              fontSize: '14px',
              color: theme.textSecondary,
              marginTop: '4px'
            }}>
              Step {currentStep} of 5
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: theme.textSecondary
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{
            width: '100%',
            height: '4px',
            backgroundColor: theme.border,
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(currentStep / 5) * 100}%`,
              height: '100%',
              backgroundColor: theme.primary,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '0 24px',
          maxHeight: 'calc(90vh - 200px)',
          overflowY: 'auto'
        }}>
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div style={{
          padding: '24px',
          borderTop: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              style={{
                padding: '10px 20px',
                border: `1px solid ${theme.border}`,
                backgroundColor: 'transparent',
                color: theme.text,
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Previous
            </button>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {errors.submit && (
              <div style={{
                color: '#dc3545',
                fontSize: '14px',
                alignSelf: 'center'
              }}>
                {errors.submit}
              </div>
            )}

            {currentStep === 5 ? (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  backgroundColor: theme.primary,
                  color: 'white',
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? 'Creating...' : 'Create Project'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  backgroundColor: theme.primary,
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCreationWizard;