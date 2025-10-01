import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UploadModal from './UploadModal';
import { API_ENDPOINTS } from '../config/api';
import useModelWarmup from '../hooks/useModelWarmup';

const AIWritingThreePanel = ({ theme, selectedProject, onAiHealthChange }) => {
  const { user: currentUser } = useAuth();

  // Initialize model warm-up hook
  const {
    getSystemStatus,
    triggerModelSwitchWarmup,
    isModelWarm,
    isModelWarming,
    warmModelCount,
    isSystemWarming
  } = useModelWarmup({
    autoWarmup: true,
    enableSmartWarmup: true,
    warmupOnMount: true,
    warmupOnModelSwitch: true
  });

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiHealth, setAiHealth] = useState(null);
  const [noHallucinations, setNoHallucinations] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('');
  const [availablePersonas, setAvailablePersonas] = useState([]);
  const [showOptions, setShowOptions] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [panelSizes, setPanelSizes] = useState({ left: 25, center: 50, right: 25 });
  const [rightPanelWidth, setRightPanelWidth] = useState(250); // pixels
  const [isMobile, setIsMobile] = useState(false);
  const [projectDocuments, setProjectDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState([]);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingPanel, setResizingPanel] = useState(null); // 'left' or 'right'
  const [leftPanelSplit, setLeftPanelSplit] = useState(40); // percentage for reading pane
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const [selectedDocumentContent, setSelectedDocumentContent] = useState(null);
  const [loadingDocumentContent, setLoadingDocumentContent] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [projectEditMode, setProjectEditMode] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [editableProject, setEditableProject] = useState({});
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);

  // Document filtering state
  const [documentFilters, setDocumentFilters] = useState({
    documentType: 'all', // 'all' or specific type like 'solicitations', 'past-performance', etc.
    fileType: 'all', // 'all', 'pdf', 'docx', 'txt', etc.
    dateRange: 'all', // 'all', 'last7days', 'last30days', 'last90days', 'custom'
    customDateFrom: '',
    customDateTo: '',
    sizeRange: 'all', // 'all', 'small', 'medium', 'large'
    searchTerm: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Mock users data for owner selection (matching Layout.js)
  const mockUsers = [
    { id: 1, name: 'Alice Johnson', email: 'alice.johnson@agency.gov', avatar: 'A', color: '#007bff' },
    { id: 2, name: 'Bob Williams', email: 'bob.williams@agency.gov', avatar: 'B', color: '#28a745' },
    { id: 3, name: 'Carol Martinez', email: 'carol.martinez@agency.gov', avatar: 'C', color: '#dc3545' },
    { id: 4, name: 'David Chen', email: 'david.chen@agency.gov', avatar: 'D', color: '#6f42c1' },
    { id: 5, name: 'Elena Rodriguez', email: 'elena.rodriguez@agency.gov', avatar: 'E', color: '#fd7e14' },
    { id: 6, name: 'Frank Thompson', email: 'frank.thompson@agency.gov', avatar: 'F', color: '#20c997' }
  ];

  // Context state
  const [contextSummary, setContextSummary] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);

  // Notification helpers
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 4000);
  };

  const showConfirmDialog = (message, onConfirm) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        message,
        onConfirm: () => {
          setConfirmDialog(null);
          onConfirm();
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        }
      });
    });
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    checkAIHealth();
    loadAvailableModels();
    loadAvailablePersonas();

    // Listen for right panel toggle event from header
    const handleToggleRightPanel = () => {
      setRightPanelCollapsed(prev => !prev);
    };

    window.addEventListener('toggleRightPanel', handleToggleRightPanel);
    return () => {
      window.removeEventListener('toggleRightPanel', handleToggleRightPanel);
    };
  }, []);

  // Update health status when warmup status changes
  useEffect(() => {
    if (aiHealth) {
      checkAIHealth();
    }
  }, [isSystemWarming, warmModelCount]);


  // Permission checking
  const canEditDocuments = () => {
    if (!currentUser) return false;

    // Admin users can always edit documents
    if (currentUser.role === 'admin') return true;

    // Project owners can edit their documents
    if (selectedProject && selectedProject.owner?.username === currentUser.username) return true;

    return false;
  };

  // Document management functions
  const handleEditModeToggle = () => {
    setEditMode(!editMode);
    setSelectedDocuments(new Set()); // Clear selections when toggling
  };

  // Left panel toggle function (not used - this was for the wrong element)
  const toggleLeftPanel = () => {
    if (panelSizes.left === 0) {
      setPanelSizes(prev => ({
        ...prev,
        left: 25,
        center: 75 - prev.right
      }));
    } else {
      setPanelSizes(prev => ({
        ...prev,
        left: 0,
        center: 100 - prev.right
      }));
    }
  };

  // Project info editing functions
  const handleProjectEditToggle = () => {
    if (!projectEditMode) {
      // Entering edit mode - copy current project data
      setEditableProject({
        title: selectedProject?.title || '',
        dueDate: selectedProject?.dueDate || '',
        owner: selectedProject?.owner || null,
        status: selectedProject?.status || 'active'
      });
    }
    setProjectEditMode(!projectEditMode);
  };

  const handleProjectSave = async () => {
    try {
      // TODO: Implement API call to save project changes
      // Project changes: editableProject

      // For now, just show a notification
      setNotification({
        type: 'success',
        message: 'Project information updated successfully'
      });

      setProjectEditMode(false);
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to update project information'
      });
    }
  };

  const handleDocumentSelection = (docId, isSelected) => {
    const newSelected = new Set(selectedDocuments);
    if (isSelected) {
      newSelected.add(docId);
    } else {
      newSelected.delete(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === projectDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(projectDocuments.map(doc => doc.id)));
    }
  };

  useEffect(() => {
    if (selectedProject) {
      loadProjectDocuments();
    }
  }, [selectedProject, showArchived, documentFilters]);

  // Load context summary when project or documents change
  useEffect(() => {
    if (selectedProject && projectDocuments.length > 0) {
      const documentType = (selectedProject.documentType || 'solicitations').toLowerCase();
      loadContextSummary(selectedProject.title, documentType);
    }
  }, [selectedProject, projectDocuments]);

  // Handle global mouse events for resizing
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isResizing) {
        // Find the main container
        const container = document.querySelector('[data-resize-container]');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const mouseX = e.clientX - containerRect.left;
          const containerWidth = containerRect.width;
          const mousePercentage = (mouseX / containerWidth) * 100;

          if (resizingPanel === 'left') {
            const newLeftSize = Math.max(15, Math.min(40, mousePercentage));
            const remainingSpace = 100 - newLeftSize;
            const rightSize = panelSizes.right;
            const newCenterSize = remainingSpace - rightSize;

            if (newCenterSize >= 30) {
              setPanelSizes({
                left: newLeftSize,
                center: newCenterSize,
                right: rightSize
              });
            }
          } else if (resizingPanel === 'right') {
            const distanceFromRight = containerWidth - mouseX;
            const newRightWidth = Math.max(200, Math.min(500, distanceFromRight));
            setRightPanelWidth(newRightWidth);
          }
        }
      } else if (isResizingVertical) {
        // Handle vertical resizing for left panel split
        const leftPanel = document.querySelector('[data-left-panel]');
        if (leftPanel) {
          const panelRect = leftPanel.getBoundingClientRect();
          const mouseY = e.clientY - panelRect.top;
          const panelHeight = panelRect.height;
          const mousePercentage = (mouseY / panelHeight) * 100;

          // Constrain between 20% and 80%
          const newSplit = Math.max(20, Math.min(80, mousePercentage));
          setLeftPanelSplit(newSplit);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (isResizing) {
        handleResizeEnd();
      } else if (isResizingVertical) {
        handleVerticalResizeEnd();
      }
    };

    if (isResizing || isResizingVertical) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isResizing, resizingPanel, panelSizes, isResizingVertical, leftPanelSplit]);

  // Helper function to extract parameter size for sorting
  const extractParameterSize = (modelName) => {
    const sizeMatch = modelName.match(/(\d+)b/i);
    if (sizeMatch) {
      return parseInt(sizeMatch[1]);
    }
    return 0;
  };

  const getModelDescription = (modelName) => {
    const descriptions = {
      // Qwen 2.5 models - Alibaba's latest instruction-following models
      'qwen2.5:3b-instruct': 'Qwen 2.5 (3B): Excellent for structured documents and technical writing. Fast and efficient for routine proposal work. (Alibaba)',
      'qwen2.5:7b-instruct': 'Qwen 2.5 (7B): High-quality responses with strong reasoning. Ideal for complex proposals and strategic content. (Alibaba)',
      'qwen2.5:14b-instruct-q4_0': 'Qwen 2.5 (14B): Large model with superior reasoning. Best for comprehensive analysis and high-stakes documents. (Alibaba)',
      'qwen2.5:32b-instruct-q4_K_M': 'Qwen 2.5 (32B): Premium large-scale model with exceptional performance. Maximum quality for critical documents. (Alibaba)',

      // Meta Llama models - Strong general-purpose capabilities
      'llama3.2:3b': 'Llama 3.2 (3B): Balanced speed and quality for most writing tasks. Good for routine sections and summaries. (Meta)',
      'llama3.1:8b': 'Llama 3.1 (8B): Premium model with sophisticated reasoning. Excellent for important proposals and final drafts. (Meta)',
      'llama3.1:70b-instruct-q4_k_m': 'Llama 3.1 (70B): Ultra-large model with exceptional capabilities. Best for the most critical and complex documents. (Meta)',

      // Google Gemma models - Efficient and capable
      'gemma2:2b': 'Gemma 2 (2B): Ultra-efficient for clear, concise writing. Perfect for quick drafts and executive summaries. (Google)',
      'gemma2:9b': 'Gemma 2 (9B): **RECOMMENDED** Advanced reasoning with excellent performance. Ideal for most proposal writing tasks. (Google)',
      'gemma2:27b': 'Gemma 2 (27B): Large-scale model with superior capabilities. Best for complex analysis and comprehensive proposals. (Google)',

      // DeepSeek models - Code-aware and reasoning-focused
      'deepseek-coder:6.7b': 'DeepSeek Coder (6.7B): Specialized for technical documents with code examples and system architectures. (DeepSeek)',
      'deepseek-coder:33b-instruct-q4_k_m': 'DeepSeek Coder (33B): Large code-aware model for complex technical proposals and system designs. (DeepSeek)',
      'deepseek-r1:8b': 'DeepSeek R1 (8B): Advanced reasoning model for analytical and strategic content. Good for problem-solving sections. (DeepSeek)',
      'deepseek-r1:14b': 'DeepSeek R1 (14B): Large reasoning model for complex analysis and strategic planning documents. (DeepSeek)',
      'llama3.2:latest': 'Meta: Latest version with improved capabilities. Versatile choice for most professional writing needs. (Q4 quantized)',
      'llama3.1:latest': 'Meta: Mature, reliable model with consistent output. Excellent fallback option for all document types. (Q4 quantized)',
      'qwen2.5:latest': 'Alibaba: Advanced reasoning and instruction following. Perfect for complex analysis and detailed technical documentation. (Q4 quantized)'
    };

    // Try exact match first
    if (descriptions[modelName]) {
      return descriptions[modelName];
    }

    // Try partial matches for common patterns (check larger models first, all Q4 quantized)
    if (modelName.includes('32b')) return 'Alibaba: Premium large-scale model with exceptional performance. Best for the most important documents requiring maximum quality and sophistication. (Q4 quantized)';
    if (modelName.includes('27b')) return 'Google: Large-scale model with superior capabilities. Best for complex analysis, comprehensive proposals, and high-stakes documents. (Q4 quantized)';
    if (modelName.includes('14b')) return 'Alibaba: Large model with superior reasoning capabilities. Ideal for complex analysis, comprehensive proposals, and high-stakes documents. (Q4 quantized)';
    if (modelName.includes('9b')) return 'Google: Advanced reasoning with excellent performance. Ideal for complex proposals, detailed analysis, and professional documentation. (Q4 quantized)';
    if (modelName.includes('8b') && modelName.includes('llama')) return 'Meta: Premium model for sophisticated writing tasks. Best for final drafts, important proposals, and when maximum quality is needed. (Q4 quantized)';
    if (modelName.includes('7b') && modelName.includes('qwen')) return 'Alibaba: High-quality responses with strong reasoning. Use for complex proposals, strategic content, and when accuracy is critical. (Q4 quantized)';
    if (modelName.includes('3b') && modelName.includes('qwen')) return 'Alibaba: Excellent instruction-following for structured documents. Perfect for technical writing, compliance sections, and detailed requirements. (Q4 quantized)';
    if (modelName.includes('3b') && modelName.includes('llama')) return 'Meta: Balanced speed and quality for most writing tasks. Ideal for routine proposal sections, summaries, and general content creation. (Q4 quantized)';
    if (modelName.includes('2b')) return 'Google: Lightweight but capable model for clear, concise writing. Great for executive summaries, abstracts, and brief communications. (Q4 quantized)';
    if (modelName.includes('1b')) return 'Meta: Ultra-fast responses for simple tasks, quick drafts, and when speed matters most. Best for basic text generation and rapid iterations. (Q4 quantized)';

    // Default description for unknown models
    return 'Capable AI model for various writing tasks. Experiment to find the best fit for your specific needs. (Q4 quantized)';
  };

  const getModelCompany = (modelName) => {
    if (modelName.startsWith('qwen')) return 'Alibaba';
    if (modelName.startsWith('llama')) return 'Meta';
    if (modelName.startsWith('gemma')) return 'Google';
    if (modelName.startsWith('deepseek')) return 'DeepSeek';
    return 'Unknown';
  };

  const loadAvailableModels = async () => {
    try {
      const response = await fetch('/api/ai-writing/models');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && Array.isArray(data.data.models)) {
          // Transform Ollama models to frontend format with descriptions
          let models = data.data.models.map(model => ({
            id: model.model || model.name,
            name: model.name,
            provider: 'Ollama',
            description: getModelDescription(model.name),
            parameterSize: extractParameterSize(model.name)
          }));

          // Sort models alphabetically, with gemma2:9b (recommended) first
          models.sort((a, b) => {
            // Prioritize gemma2:9b as the recommended default
            if (a.name === 'gemma2:9b') return -1;
            if (b.name === 'gemma2:9b') return 1;
            // Then sort alphabetically by name
            return a.name.localeCompare(b.name);
          });

          setAvailableModels(models);

          // Set default model to gemma2:9b if available, otherwise first model
          const defaultModel = models.find(model => model.name === 'gemma2:9b') || models[0];
          if (defaultModel) {
            setSelectedModel(defaultModel.id);
          }
          return; // Exit early if successful
        }
      }
      // If API fails or returns invalid data, use fallback
      throw new Error('API returned invalid data or failed');
    } catch (error) {
      // Using fallback models (API not available)
      // Fallback models if API fails - prioritize gemma2:9b
      const fallbackModels = [
        {
          id: 'gemma2:9b',
          name: 'gemma2:9b',
          provider: 'Ollama (offline)',
          description: 'Gemma 2 (9B): **RECOMMENDED** Advanced reasoning with excellent performance. Ideal for most proposal writing tasks. (Google)',
          parameterSize: 9
        },
        {
          id: 'qwen2.5:14b-instruct-q4_0',
          name: 'qwen2.5:14b-instruct-q4_0',
          provider: 'Ollama (offline)',
          description: 'Qwen 2.5 (14B): Large model with superior reasoning. Best for comprehensive analysis and high-stakes documents. (Alibaba)',
          parameterSize: 14
        },
        {
          id: 'llama3.1:8b',
          name: 'llama3.1:8b',
          provider: 'Ollama (offline)',
          description: 'Llama 3.1 (8B): Premium model with sophisticated reasoning. Excellent for important proposals and final drafts. (Meta)',
          parameterSize: 8
        }
      ];
      setAvailableModels(fallbackModels);
      // Default to gemma2:9b even in fallback mode
      setSelectedModel('gemma2:9b');
      // Fallback mode: Default model set to gemma2:9b
    }
  };

  const loadAvailablePersonas = async () => {
    try {
      const response = await fetch('/api/personas/dropdown');

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.data && Array.isArray(data.data)) {
          setAvailablePersonas(data.data);

          // Set default persona if available and none selected
          const defaultPersona = data.data.find(p => p.is_default);
          if (defaultPersona && !selectedPersona) {
            setSelectedPersona(defaultPersona.id);
          } else if (data.data.length > 0 && !selectedPersona) {
            setSelectedPersona(data.data[0].id);
          }
        }
      }
    } catch (error) {
      // Error loading personas - using defaults
      // Set fallback to empty array
      setAvailablePersonas([]);
    }
  };

  const checkAIHealth = async () => {
    try {
      const response = await fetch('/api/ai-writing/health');
      const data = await response.json();
      if (data.success) {
        // Integrate warmup status with health data
        const warmupStatus = getSystemStatus();
        const combinedHealth = {
          ...data.data,
          warmupStatus: warmupStatus.status,
          isWarming: isSystemWarming,
          warmModelCount,
          statusLabel: isSystemWarming ? 'Warming up models...' : data.data.available ? 'AI Online' : 'AI Offline'
        };
        setAiHealth(combinedHealth);
        if (onAiHealthChange) onAiHealthChange(combinedHealth);
      }
    } catch (error) {
      // Error checking AI health - using offline status
      const healthData = {
        available: false,
        error: error.message,
        warmupStatus: 'error',
        isWarming: false
      };
      setAiHealth(healthData);
      if (onAiHealthChange) onAiHealthChange(healthData);
    }
  };

  const loadProjectDocuments = async () => {
    if (!selectedProject) return;

    setLoadingDocuments(true);
    try {
      // Build query parameters with filters
      const params = new URLSearchParams();
      params.append('projectName', selectedProject.title);

      // Status filter (archived/active)
      if (showArchived) {
        params.append('status', 'active');
        params.append('status', 'archived');
      } else {
        params.append('status', 'active');
      }

      // Document type filter
      if (documentFilters.documentType !== 'all') {
        params.append('documentType', documentFilters.documentType);
      }

      // Search term filter
      if (documentFilters.searchTerm) {
        params.append('searchTerm', documentFilters.searchTerm);
      }

      const url = `/api/documents/list?${params.toString()}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          let documents = data.data.documents || [];

          // Apply client-side filters
          documents = documents.filter(doc => {
            // File type filter
            if (documentFilters.fileType !== 'all') {
              const docExtension = doc.extension?.toLowerCase().replace('.', '');
              if (docExtension !== documentFilters.fileType) return false;
            }

            // Date range filter
            if (documentFilters.dateRange !== 'all') {
              const docDate = new Date(doc.createdAt);
              const now = new Date();

              switch (documentFilters.dateRange) {
                case 'last7days':
                  if (now - docDate > 7 * 24 * 60 * 60 * 1000) return false;
                  break;
                case 'last30days':
                  if (now - docDate > 30 * 24 * 60 * 60 * 1000) return false;
                  break;
                case 'last90days':
                  if (now - docDate > 90 * 24 * 60 * 60 * 1000) return false;
                  break;
                case 'custom':
                  if (documentFilters.customDateFrom) {
                    if (docDate < new Date(documentFilters.customDateFrom)) return false;
                  }
                  if (documentFilters.customDateTo) {
                    if (docDate > new Date(documentFilters.customDateTo)) return false;
                  }
                  break;
              }
            }

            // Size range filter
            if (documentFilters.sizeRange !== 'all') {
              const sizeInMB = parseInt(doc.size) / (1024 * 1024);
              switch (documentFilters.sizeRange) {
                case 'small':
                  if (sizeInMB > 1) return false; // < 1MB
                  break;
                case 'medium':
                  if (sizeInMB <= 1 || sizeInMB > 10) return false; // 1-10MB
                  break;
                case 'large':
                  if (sizeInMB <= 10) return false; // > 10MB
                  break;
              }
            }

            return true;
          });

          // Sort documents: active first, then archived
          documents.sort((a, b) => {
            if (a.status === b.status) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return a.status === 'active' ? -1 : 1;
          });

          setProjectDocuments(documents);
        }
      } else if (response.status === 404) {
        // Project documents endpoint not found - this is expected if backend doesn't have this endpoint yet
        // Document list API not available yet, using empty document list
        setProjectDocuments([]);
      } else {
        // Error loading project documents - response not ok
        setProjectDocuments([]);
      }
    } catch (error) {
      // Error loading project documents
      setProjectDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const loadDocumentContent = async (document) => {
    if (!document || !selectedProject) return;

    setLoadingDocumentContent(true);
    try {
      // Use the document's actual category instead of project's documentType
      const documentCategory = document.category || 'solicitations';
      // API call to get document content
      const response = await fetch(`/api/documents/content/${documentCategory}/${selectedProject.title}/${encodeURIComponent(document.originalName || document.filename)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedDocumentContent({
            ...document,
            content: data.data.content || 'Document content could not be loaded.',
            contentType: data.data.contentType || 'text/plain'
          });
        } else {
          setSelectedDocumentContent({
            ...document,
            content: 'Error loading document content: ' + data.message,
            contentType: 'text/plain'
          });
        }
      } else {
        setSelectedDocumentContent({
          ...document,
          content: 'Error loading document content: ' + response.statusText,
          contentType: 'text/plain'
        });
      }
    } catch (error) {
      // Error loading document content
      setSelectedDocumentContent({
        ...document,
        content: 'Error loading document content: ' + error.message,
        contentType: 'text/plain'
      });
    } finally {
      setLoadingDocumentContent(false);
    }
  };

  // Context management functions
  const loadContextSummary = async (projectName = 'AI Writing Test Project', documentType = 'solicitations') => {
    if (!projectName) return;

    try {
      setLoadingContext(true);
      const encodedProject = encodeURIComponent(projectName);
      const response = await fetch(`/api/context/summary/${encodedProject}/${documentType}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setContextSummary(data.data);
        }
      } else {
        // Failed to load context summary
        setContextSummary(null);
      }
    } catch (error) {
      // Error loading context summary
      setContextSummary(null);
    } finally {
      setLoadingContext(false);
    }
  };

  const triggerContextBuild = async (projectName = 'AI Writing Test Project', documentType = 'solicitations') => {
    if (!projectName) return;

    try {
      const encodedProject = encodeURIComponent(projectName);
      const response = await fetch(`/api/context/${encodedProject}/${documentType}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Context is building, reload summary in a few seconds
          setTimeout(() => loadContextSummary(projectName, documentType), 3000);
        }
      }
    } catch (error) {
      // Error triggering context build
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files) => {
    // Store the dropped files and open upload modal
    setDroppedFiles(Array.from(files));
    setShowUploadModal(true);
  };

  const handleResizeStart = (panel) => {
    setIsResizing(true);
    setResizingPanel(panel);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = (e) => {
    if (!isResizing || !resizingPanel) return;

    const containerRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const containerWidth = containerRect.width;
    const mousePercentage = (mouseX / containerWidth) * 100;

    if (resizingPanel === 'left') {
      // Resize left panel (min 15%, max 40%)
      const newLeftSize = Math.max(15, Math.min(40, mousePercentage));
      const remainingSpace = 100 - newLeftSize;
      const rightSize = panelSizes.right;
      const newCenterSize = remainingSpace - rightSize;

      if (newCenterSize >= 30) { // Ensure center panel has minimum width
        setPanelSizes({
          left: newLeftSize,
          center: newCenterSize,
          right: rightSize
        });
      }
    } else if (resizingPanel === 'right') {
      // Resize right panel (min 200px, max 500px)
      const distanceFromRight = containerWidth - mouseX;
      const newRightWidth = Math.max(200, Math.min(500, distanceFromRight));
      setRightPanelWidth(newRightWidth);
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizingPanel(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleVerticalResizeStart = () => {
    setIsResizingVertical(true);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handleVerticalResizeEnd = () => {
    setIsResizingVertical(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const generateContent = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setLoading(true);
    setGeneratedContent('Generating content with AI...');

    try {
      const response = await fetch('/api/ai-writing/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          model: selectedModel,
          noHallucinations: noHallucinations,
          showThinking: showThinking,
          personaId: selectedPersona,
          projectContext: selectedProject ? {
            title: selectedProject.title,
            documentType: selectedProject.documentType,
            documents: projectDocuments
          } : null
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

  const handleArchiveDocument = async (documentId, action) => {
    try {
      const endpoint = action === 'archive' ? 'archive' : 'unarchive';
      const response = await fetch(`/api/documents/${documentId}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success) {
        // Reload documents to reflect the change
        await loadProjectDocuments();
        showNotification(`Document ${action}d successfully`, 'success');
      } else {
        // Failed to update document status
        showNotification(`Failed to ${action} document: ${data.message}`, 'error');
      }
    } catch (error) {
      // Error updating document status
      showNotification(`Error ${action}ing document: ${error.message}`, 'error');
    }
  };

  const handleDeleteDocument = async (documentId) => {
    await showConfirmDialog(
      'Are you sure you want to delete this document? This action cannot be undone.',
      async () => {
        try {
          const response = await fetch(`/api/documents/${documentId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          const data = await response.json();

          if (data.success) {
            // Reload documents to reflect the change
            await loadProjectDocuments();
            // Clear selected document if it was the deleted one
            if (selectedDocument?.id === documentId) {
              setSelectedDocument(null);
              setDocumentContent('');
            }
            showNotification('Document deleted successfully', 'success');
          } else {
            // Failed to delete document
            showNotification(`Failed to delete document: ${data.message}`, 'error');
          }
        } catch (error) {
          // Error deleting document
          showNotification(`Error deleting document: ${error.message}`, 'error');
        }
      }
    );
  };

  const handleBulkArchive = async () => {
    if (selectedDocuments.size === 0) return;

    const confirmMessage = `Are you sure you want to archive ${selectedDocuments.size} selected document${selectedDocuments.size > 1 ? 's' : ''}?`;

    await showConfirmDialog(confirmMessage, async () => {
      const documentIds = Array.from(selectedDocuments);
      const errors = [];

      for (const documentId of documentIds) {
        try {
          const response = await fetch(`/api/documents/${documentId}/archive`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          const data = await response.json();

          if (!data.success) {
            errors.push(`Failed to archive document ${documentId}: ${data.message}`);
          }
        } catch (error) {
          errors.push(`Error archiving document ${documentId}: ${error.message}`);
        }
      }

      // Reload documents to reflect changes
      await loadProjectDocuments();

      // Clear selection
      setSelectedDocuments(new Set());

      if (errors.length > 0) {
        // Some documents failed to archive
        showNotification(`Some documents could not be archived:\n${errors.join('\n')}`, 'error');
      } else {
        showNotification(`Successfully archived ${documentIds.length} documents`, 'success');
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedDocuments.size} selected document${selectedDocuments.size > 1 ? 's' : ''}? This action cannot be undone.`;

    await showConfirmDialog(confirmMessage, async () => {
      const documentIds = Array.from(selectedDocuments);
      const errors = [];

      for (const documentId of documentIds) {
        try {
          const response = await fetch(`/api/documents/${documentId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          const data = await response.json();

          if (!data.success) {
            errors.push(`Failed to delete document ${documentId}: ${data.message}`);
          }
        } catch (error) {
          errors.push(`Error deleting document ${documentId}: ${error.message}`);
        }
      }

      // Reload documents to reflect changes
      await loadProjectDocuments();

      // Clear selection and selected document if it was deleted
      setSelectedDocuments(new Set());
      if (selectedDocument && documentIds.includes(selectedDocument.id)) {
        setSelectedDocument(null);
        setDocumentContent('');
      }

      if (errors.length > 0) {
        // Some documents failed to delete
        showNotification(`Some documents could not be deleted:\n${errors.join('\n')}`, 'error');
      } else {
        showNotification(`Successfully deleted ${documentIds.length} documents`, 'success');
      }
    });
  };

  const sampleDocuments = [
    { id: 1, name: 'Federal Cloud Migration RFP', type: 'RFP', dueDate: '2024-01-15' },
    { id: 2, name: 'Cybersecurity Assessment SOW', type: 'SOW', dueDate: '2024-01-22' },
    { id: 3, name: 'Data Analytics Platform RFI', type: 'RFI', dueDate: '2024-02-05' }
  ];

  if (isMobile) {
    // Mobile view - stacked layout
    return (
      <div style={{
        height: '100%',
        backgroundColor: theme.background,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Mobile Header */}
        <div style={{
          padding: '16px',
          backgroundColor: theme.surface,
          borderBottom: `1px solid ${theme.border}`
        }}>
          <h2 style={{ margin: 0, color: theme.text }}>🤖 AI Writing Assistant</h2>
        </div>

        {/* Mobile Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* AI Health Status */}
          {aiHealth && (
            <div style={{
              padding: '12px',
              backgroundColor: aiHealth.available ? '#d4edda' : '#f8d7da',
              border: `1px solid ${aiHealth.available ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: aiHealth.available ? '#155724' : '#721c24'
              }}>
                <span>{aiHealth.available ? '✅' : '❌'}</span>
                <span style={{ fontWeight: '600' }}>
                  AI Service: {aiHealth.available ? 'Available' : 'Not Available'}
                </span>
              </div>
            </div>
          )}

          {/* Prompt Input */}
          <div style={{ marginBottom: '16px' }}>
            {/* Header row with title and options button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <label style={{
                fontWeight: '600',
                color: theme.text,
                margin: 0
              }}>
                Writing Prompt
              </label>

              {/* Options Toggle Button */}
              <button
                onClick={() => setShowOptions(!showOptions)}
                style={{
                  padding: '8px',
                  backgroundColor: showOptions ? '#10B981' : theme.surface,
                  color: showOptions ? '#fff' : theme.text,
                  border: `2px solid ${showOptions ? '#10B981' : theme.border}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  transform: showOptions ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: showOptions ? '0 2px 8px #10B98140, 0 0 0 2px #10B98130' : '0 1px 3px rgba(0,0,0,0.1)'
                }}
                title={showOptions ? "Close options" : "Open options"}
              >
                ⚙️
              </button>
            </div>

            {/* Collapsible Options Panel with smooth slide */}
            <div style={{
              overflow: 'hidden',
              transition: 'max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease',
              maxHeight: showOptions ? '400px' : '0px',
              opacity: showOptions ? 1 : 0,
              marginBottom: showOptions ? '12px' : '0px'
            }}>
              <div style={{
                padding: '16px',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                marginTop: '4px'
              }}>
                {/* Options Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  ⚙️ Options
                </div>

                {/* Options Content */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  {/* No Hallucinations Checkbox */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: theme.text
                  }}>
                    <input
                      type="checkbox"
                      checked={noHallucinations}
                      onChange={(e) => setNoHallucinations(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: theme.primary
                      }}
                    />
                    <span style={{ fontWeight: '500' }}>No Hallucinations - Verifiable Cited Answers Only</span>
                  </label>

                  {/* Show Thinking Checkbox */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: theme.text
                  }}>
                    <input
                      type="checkbox"
                      checked={showThinking}
                      onChange={(e) => setShowThinking(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: '#10B981'
                      }}
                    />
                    <span style={{ fontWeight: '500' }}>Show AI Thinking Process 🧠</span>
                  </label>

                  {/* Dropdowns Row */}
                  <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                    {/* Persona Selection */}
                    {availablePersonas.length > 0 && (
                      <div style={{ flex: 1 }}>
                        <label style={{
                          display: 'block',
                          marginBottom: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          color: theme.text
                        }}>
                          Writing Persona:
                        </label>
                        <select
                          value={selectedPersona}
                          onChange={(e) => setSelectedPersona(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '6px',
                            border: `1px solid ${theme.border}`,
                            backgroundColor: theme.surface,
                            color: theme.text,
                            fontSize: '14px'
                          }}
                        >
                          {(availablePersonas || []).map(persona => (
                            <option key={persona.id} value={persona.id}>
                              {persona.display_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Model Selection */}
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: theme.text
                      }}>
                        AI Model:
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => {
                          const newModel = e.target.value;
                          setSelectedModel(newModel);
                          // Trigger warmup for the newly selected model
                          triggerModelSwitchWarmup(newModel, {
                            userPreferences: [newModel],
                            recentlyUsed: [newModel]
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '6px',
                          border: `1px solid ${theme.border}`,
                          backgroundColor: theme.surface,
                          color: theme.text,
                          fontSize: '14px'
                        }}
                      >
                        {(availableModels || []).map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({getModelCompany(model.name)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Persona Description */}
                  {selectedPersona && availablePersonas.find(p => p.id === selectedPersona) && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: theme.surface,
                      borderRadius: '6px',
                      border: `1px solid ${theme.border}`,
                      fontSize: '12px',
                      color: theme.text + '80',
                      fontStyle: 'italic',
                      lineHeight: '1.4'
                    }}>
                      <strong style={{ color: theme.text, fontStyle: 'normal' }}>
                        {availablePersonas.find(p => p.id === selectedPersona)?.display_name}:
                      </strong>{' '}
                      {availablePersonas.find(p => p.id === selectedPersona)?.description}
                    </div>
                  )}

                  {/* Model Description */}
                  {selectedModel && availableModels.find(m => m.id === selectedModel) && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: theme.surface,
                      borderRadius: '6px',
                      border: `1px solid ${theme.border}`,
                      fontSize: '12px',
                      color: theme.text + '80',
                      fontStyle: 'italic',
                      lineHeight: '1.4',
                      marginTop: '8px'
                    }}>
                      <strong style={{ color: theme.text, fontStyle: 'normal' }}>
                        {availableModels.find(m => m.id === selectedModel)?.name}:
                      </strong>{' '}
                      {availableModels.find(m => m.id === selectedModel)?.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  generateContent();
                }
              }}
              placeholder="Ask the AI to write something creative or request strict answers based on the uploaded documents... (Press Enter to submit, Shift+Enter for new line)"
              style={{
                width: '100%',
                height: '120px',
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.surface,
                color: theme.text,
                resize: 'vertical'
              }}
            />
          </div>

          {/* Mobile Controls - Clean Layout */}
          <div style={{ marginBottom: '16px' }}>
            {/* Main Controls Row */}
            {/* Generate Button - Now standalone */}
            <button
              onClick={generateContent}
              disabled={loading || !aiHealth?.available}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: theme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading || !aiHealth?.available ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: loading || !aiHealth?.available ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '12px'
              }}
            >
              {loading ? '✨ Generating...' : (noHallucinations ? '📊 Just the facts - Strict Answers' : '✨ Generate')}
            </button>

          </div>

          {/* Generated Content */}
          {generatedContent && (
            <div style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: theme.text }}>Generated Content</h4>
              <div style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                color: theme.text
              }}>
                {generatedContent}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop view - three panel layout
  return (
    <div
      data-resize-container
      style={{
        height: '100%',
        display: 'flex',
        backgroundColor: theme.background,
        overflow: 'hidden',
        position: 'relative'
      }}>

      {/* Left Panel - Document Sources */}
      <div
        data-left-panel
        style={{
          width: `${panelSizes.left}%`,
          backgroundColor: theme.surface,
          display: 'flex',
          flexDirection: 'column',
          minWidth: '200px'
        }}
      >

        {/* Reading Pane */}
        <div style={{
          height: `${leftPanelSplit}%`,
          display: 'flex',
          flexDirection: 'column',
          borderBottom: `1px solid ${theme.border}`
        }}>
          {/* Reading Pane Header */}
          <div style={{
            padding: '16px',
            borderBottom: `1px solid ${theme.border}`,
            backgroundColor: theme.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <h4 style={{
                margin: 0,
                fontSize: '14px',
                color: theme.text,
                fontWeight: '600'
              }}>
                📄 Document Preview
              </h4>
              {selectedDocumentContent && (
                <div style={{
                  fontSize: '12px',
                  color: theme.textSecondary,
                  marginTop: '2px'
                }}>
                  {selectedDocumentContent.name}
                </div>
              )}
            </div>

          </div>

          {/* Reading Pane Content */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            backgroundColor: theme.background
          }}>
            {loadingDocumentContent ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: theme.textSecondary
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: `2px solid ${theme.border}`,
                    borderTop: `2px solid ${theme.primary}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Loading...
                </div>
              </div>
            ) : selectedDocumentContent ? (
              <div style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: theme.text,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace'
              }}>
                {selectedDocumentContent.content}
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: theme.textSecondary,
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📄</div>
                  <div style={{ fontSize: '14px' }}>Select a document to preview</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vertical Resize Handle */}
        <div
          style={{
            height: '4px',
            backgroundColor: theme.border,
            cursor: 'row-resize',
            position: 'relative',
            zIndex: 10,
            transition: isResizingVertical ? 'none' : 'background-color 0.2s'
          }}
          onMouseDown={handleVerticalResizeStart}
          onMouseEnter={(e) => {
            if (!isResizingVertical) {
              e.target.style.backgroundColor = theme.primary;
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizingVertical) {
              e.target.style.backgroundColor = theme.border;
            }
          }}
        >
          {/* Resize indicator */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '2px',
            backgroundColor: 'currentColor',
            opacity: 0.5
          }} />
        </div>

        {/* Documents List Section */}
        <div style={{
          height: `${100 - leftPanelSplit}%`,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: `1px solid ${theme.border}`,
            backgroundColor: editMode ? theme.primary + '10' : 'transparent',
            transition: 'background-color 0.2s'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                color: theme.text,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📁 Project Documents
                {loadingContext && (
                  <span style={{
                    fontSize: '12px',
                    color: theme.textSecondary,
                    fontWeight: 'normal'
                  }}>
                    (*spinner* reloading context...)
                  </span>
                )}
                {contextSummary && contextSummary.status === 'ready' && (
                  <span style={{
                    fontSize: '12px',
                    color: theme.textSecondary,
                    fontWeight: 'normal'
                  }}>
                    ({contextSummary.tokenCount} tokens)
                  </span>
                )}
                {contextSummary && contextSummary.status === 'building' && (
                  <span style={{
                    fontSize: '12px',
                    color: theme.warning || '#f59e0b',
                    fontWeight: 'normal'
                  }}>
                    (building context...)
                  </span>
                )}
                {contextSummary && contextSummary.status === 'error' && (
                  <span style={{
                    fontSize: '12px',
                    color: theme.error || '#ef4444',
                    fontWeight: 'normal'
                  }}>
                    (context error)
                  </span>
                )}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                {/* Filter Toggle Button - Only in Edit Mode */}
                {editMode && canEditDocuments() && (
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                      background: showFilters ? theme.primary : 'transparent',
                      border: `1px solid ${showFilters ? theme.primary : theme.border}`,
                      borderRadius: '6px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      color: showFilters ? '#fff' : theme.text,
                      fontSize: '12px',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={showFilters ? 'Hide filters' : 'Show filters'}
                  >
                    🔍 {showFilters ? 'Hide Filters' : 'Filters'}
                  </button>
                )}

                {/* Edit Mode Toggle Button */}
                {canEditDocuments() && (
                  <button
                    onClick={handleEditModeToggle}
                    style={{
                      background: editMode ? theme.primary : 'transparent',
                      border: `1px solid ${editMode ? theme.primary : theme.border}`,
                      borderRadius: '6px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      color: editMode ? '#fff' : theme.text,
                      fontSize: '14px',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={editMode ? 'Exit edit mode' : 'Edit documents'}
                  >
                    ✏️ {editMode ? 'Done' : 'Edit'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Document Filter Panel - Only visible when showFilters is true */}
          {editMode && showFilters && canEditDocuments() && (
            <div style={{
              padding: '16px',
              backgroundColor: theme.background,
              borderBottom: `1px solid ${theme.border}`,
              borderTop: `1px solid ${theme.border}`
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                alignItems: 'end'
              }}>
                {/* Document Type Filter */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: theme.text
                  }}>
                    Document Type
                  </label>
                  <select
                    value={documentFilters.documentType}
                    onChange={(e) => setDocumentFilters({...documentFilters, documentType: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.surface,
                      color: theme.text,
                      fontSize: '12px'
                    }}
                  >
                    <option value="all">All Types</option>
                    <option value="solicitations">Solicitations</option>
                    <option value="past-performance">Past Performance</option>
                    <option value="proposals">Proposals</option>
                    <option value="compliance">Compliance</option>
                    <option value="media">Media</option>
                    <option value="references">References</option>
                  </select>
                </div>

                {/* File Type Filter */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: theme.text
                  }}>
                    File Type
                  </label>
                  <select
                    value={documentFilters.fileType}
                    onChange={(e) => setDocumentFilters({...documentFilters, fileType: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.surface,
                      color: theme.text,
                      fontSize: '12px'
                    }}
                  >
                    <option value="all">All Files</option>
                    <option value="pdf">PDF</option>
                    <option value="docx">Word (DOCX)</option>
                    <option value="doc">Word (DOC)</option>
                    <option value="txt">Text</option>
                    <option value="pptx">PowerPoint</option>
                    <option value="xlsx">Excel</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: theme.text
                  }}>
                    Date Range
                  </label>
                  <select
                    value={documentFilters.dateRange}
                    onChange={(e) => setDocumentFilters({...documentFilters, dateRange: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.surface,
                      color: theme.text,
                      fontSize: '12px'
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="last7days">Last 7 Days</option>
                    <option value="last30days">Last 30 Days</option>
                    <option value="last90days">Last 90 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Size Filter */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: theme.text
                  }}>
                    File Size
                  </label>
                  <select
                    value={documentFilters.sizeRange}
                    onChange={(e) => setDocumentFilters({...documentFilters, sizeRange: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.surface,
                      color: theme.text,
                      fontSize: '12px'
                    }}
                  >
                    <option value="all">All Sizes</option>
                    <option value="small">Small (&lt; 1MB)</option>
                    <option value="medium">Medium (1-10MB)</option>
                    <option value="large">Large (&gt; 10MB)</option>
                  </select>
                </div>
              </div>

              {/* Custom Date Range Inputs */}
              {documentFilters.dateRange === 'custom' && (
                <div style={{
                  marginTop: '12px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: theme.text
                    }}>
                      From Date
                    </label>
                    <input
                      type="date"
                      value={documentFilters.customDateFrom}
                      onChange={(e) => setDocumentFilters({...documentFilters, customDateFrom: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.surface,
                        color: theme.text,
                        fontSize: '12px'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: theme.text
                    }}>
                      To Date
                    </label>
                    <input
                      type="date"
                      value={documentFilters.customDateTo}
                      onChange={(e) => setDocumentFilters({...documentFilters, customDateTo: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.surface,
                        color: theme.text,
                        fontSize: '12px'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Search and Show Archived */}
              <div style={{
                marginTop: '12px',
                display: 'flex',
                gap: '12px',
                alignItems: 'end'
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: theme.text
                  }}>
                    Search Documents
                  </label>
                  <input
                    type="text"
                    placeholder="Search by filename or content..."
                    value={documentFilters.searchTerm}
                    onChange={(e) => setDocumentFilters({...documentFilters, searchTerm: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.surface,
                      color: theme.text,
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: theme.text,
                    cursor: 'pointer',
                    padding: '6px 0'
                  }}>
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                      style={{
                        margin: 0,
                        accentColor: theme.primary
                      }}
                    />
                    Show archived
                  </label>
                </div>
              </div>

              {/* Clear Filters Button */}
              <div style={{ marginTop: '12px', textAlign: 'right' }}>
                <button
                  onClick={() => {
                    setDocumentFilters({
                      documentType: 'all',
                      fileType: 'all',
                      dateRange: 'all',
                      customDateFrom: '',
                      customDateTo: '',
                      sizeRange: 'all',
                      searchTerm: ''
                    });
                    setShowArchived(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    color: theme.text,
                    fontSize: '12px',
                    transition: 'all 0.2s'
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}

            {editMode && selectedDocuments.size > 0 && (
              <div style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: theme.primary,
                  fontWeight: '500'
                }}>
                  {selectedDocuments.size} selected
                </div>

                  {/* Bulk Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <button
                      onClick={() => handleBulkArchive()}
                      style={{
                        background: 'none',
                        border: `1px solid ${theme.warning}`,
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: theme.warning,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme.warning + '20';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                      title="Archive selected documents"
                    >
                      📦 Archive
                    </button>

                    <button
                      onClick={() => handleBulkDelete()}
                      style={{
                        background: 'none',
                        border: `1px solid ${theme.error}`,
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: theme.error,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme.error + '20';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                      title="Delete selected documents"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )}
        

        <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
        }}>
        {/* Documents Content Area */}
        <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            paddingBottom: '8px'
        }}>

        {loadingDocuments ? (
            <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            color: theme.textSecondary
            }}>
            <div style={{
                width: '20px',
                height: '20px',
                border: `2px solid ${theme.border}`,
                borderTop: `2px solid ${theme.primary}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '8px'
            }}></div>
            Loading documents...
            </div>
        ) : projectDocuments.length > 0 ? (
            <div>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
            }}>
                <h4 style={{
                margin: 0,
                fontSize: '14px',
                color: theme.textSecondary,
                textTransform: 'uppercase',
                fontWeight: '600'
                }}>
                Documents ({projectDocuments.length})
                </h4>

                {/* Select All Checkbox */}
                {editMode && projectDocuments.length > 0 && (
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: theme.textSecondary,
                    cursor: 'pointer'
                }}>
                    <input
                    type="checkbox"
                    checked={selectedDocuments.size === projectDocuments.length && projectDocuments.length > 0}
                    ref={(checkbox) => {
                        if (checkbox) {
                        checkbox.indeterminate = selectedDocuments.size > 0 && selectedDocuments.size < projectDocuments.length;
                        }
                    }}
                    onChange={(e) => {
                        if (e.target.checked) {
                        // Select all documents
                        setSelectedDocuments(new Set(projectDocuments.map(doc => doc.id)));
                        } else {
                        // Deselect all documents
                        setSelectedDocuments(new Set());
                        }
                    }}
                    style={{
                        margin: 0,
                        accentColor: theme.primary
                    }}
                    />
                    Select All
                </label>
                )}
            </div>
            {projectDocuments.map((doc, index) => {
                // Get file type icon based on extension
                const getFileIcon = (extension) => {
                const ext = (extension || '').toLowerCase();
                switch (ext) {
                    case '.pdf': return '📄';
                    case '.doc':
                    case '.docx': return '📝';
                    case '.xls':
                    case '.xlsx': return '📊';
                    case '.txt': return '📋';
                    case '.ppt':
                    case '.pptx': return '📑';
                    default: return '📄';
                }
                };

                // Format date
                const formatDate = (dateString) => {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                };

                return (
                <div
                    key={doc.id || index}
                    onClick={() => {
                    setSelectedDocument(doc);
                    loadDocumentContent(doc);
                    }}
                    style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedDocument?.id === doc.id ? theme.primary + '20' : theme.border + '20',
                    border: selectedDocument?.id === doc.id ? `1px solid ${theme.primary}` : `1px solid ${theme.border}`,
                    transition: 'all 0.2s ease',
                    opacity: doc.status === 'archived' ? 0.6 : 1,
                    filter: doc.status === 'archived' ? 'grayscale(0.4)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                    if (selectedDocument?.id !== doc.id) {
                        e.target.style.backgroundColor = theme.border + '40';
                    }
                    }}
                    onMouseLeave={(e) => {
                    if (selectedDocument?.id !== doc.id) {
                        e.target.style.backgroundColor = theme.border + '20';
                    }
                    }}
                >
                    <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                    }}>
                    {/* Checkbox for bulk selection */}
                    {editMode && (
                        <input
                        type="checkbox"
                        checked={selectedDocuments.has(doc.id)}
                        onChange={(e) => {
                            e.stopPropagation();
                            const newSelected = new Set(selectedDocuments);
                            if (e.target.checked) {
                            newSelected.add(doc.id);
                            } else {
                            newSelected.delete(doc.id);
                            }
                            setSelectedDocuments(newSelected);
                        }}
                        style={{
                            margin: 0,
                            accentColor: theme.primary,
                            flexShrink: 0
                        }}
                        />
                    )}

                    {/* File Icon */}
                    <div style={{
                        fontSize: '24px',
                        flexShrink: 0
                    }}>
                        {getFileIcon(doc.extension)}
                    </div>

                    {/* File Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {/* File Name */}
                        <div style={{
                        fontWeight: '500',
                        fontSize: '14px',
                        color: theme.text,
                        marginBottom: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                        }}>
                        {doc.originalName || doc.filename || 'Unknown Document'}
                        </div>

                        {/* Upload Date */}
                        <div style={{
                        fontSize: '12px',
                        color: theme.textSecondary
                        }}>
                        {doc.createdAt ? formatDate(doc.createdAt) : 'Unknown date'}
                        </div>
                    </div>

                    {/* File Size */}
                    {doc.size && (
                        <div style={{
                        fontSize: '11px',
                        color: theme.textSecondary,
                        flexShrink: 0
                        }}>
                        {(doc.size / 1024).toFixed(0)} KB
                        </div>
                    )}

                    {/* Archived Badge */}
                    {doc.status === 'archived' && (
                        <div style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: theme.warning + '20',
                        border: `1px solid ${theme.warning}`,
                        color: theme.warning,
                        fontWeight: '500',
                        flexShrink: 0
                        }}>
                        ARCHIVED
                        </div>
                    )}

                    {/* Edit Mode Actions */}
                    {editMode && canEditDocuments() && (
                        <div style={{
                        display: 'flex',
                        gap: '4px',
                        flexShrink: 0,
                        marginLeft: '8px'
                        }}>
                        {/* Archive/Unarchive Button */}
                        <button
                            onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveDocument(doc.id, doc.status === 'archived' ? 'unarchive' : 'archive');
                            }}
                            style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: doc.status === 'archived' ? theme.success : theme.warning,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                            e.target.style.backgroundColor = theme.border + '40';
                            }}
                            onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            }}
                            title={doc.status === 'archived' ? 'Unarchive document' : 'Archive document'}
                        >
                            {doc.status === 'archived' ? '📤' : '📦'}
                        </button>

                        {/* Delete Button */}
                        <button
                            onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.id);
                            }}
                            style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: theme.error,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                            e.target.style.backgroundColor = theme.error + '20';
                            }}
                            onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            }}
                            title="Delete document"
                        >
                            🗑️
                        </button>
                        </div>
                    )}
                    </div>
                </div>
                );
            })}
            </div>
        ) : (
            <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: theme.textSecondary
            }}>
            <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                opacity: 0.5
            }}>
                📄
            </div>
            <div style={{
                fontSize: '14px',
                marginBottom: '16px'
            }}>
                No documents uploaded yet
            </div>
            <button
                style={{
                backgroundColor: theme.primary,
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
                }}
                onClick={() => setShowUploadModal(true)}
            >
                📤 Upload Documents
            </button>
            </div>
        )}
        </div>

        {/* Drag and Drop Zone - Bottom of Pane */}
        <div style={{
            padding: '16px',
            paddingTop: '8px',
            borderTop: `1px solid ${theme.border}`
        }}>
            <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
                border: `2px dashed ${dragActive ? theme.primary : theme.border}`,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                backgroundColor: dragActive ? theme.primary + '10' : theme.background,
                transition: 'all 0.2s ease',
                cursor: 'pointer'
            }}
            onClick={() => setShowUploadModal(true)}
            >
            <div style={{
                fontSize: '20px',
                marginBottom: '6px',
                opacity: dragActive ? 1 : 0.6
            }}>
                📁
            </div>
            <div style={{
                fontSize: '13px',
                color: dragActive ? theme.primary : theme.textSecondary,
                fontWeight: dragActive ? '600' : '400'
            }}>
                {dragActive ? 'Drop files here' : 'Drag & drop files or click to upload'}
            </div>
            <div style={{
                fontSize: '11px',
                color: theme.textSecondary,
                marginTop: '3px'
            }}>
                PDF, DOC, DOCX, TXT files supported
            </div>
            </div>
        </div>
      </div>
      </div>
      </div>

      {/* Left Resize Handle */}
      <div
        style={{
          width: '4px',
          backgroundColor: theme.border,
          cursor: 'col-resize',
          position: 'relative',
          zIndex: 10,
          transition: isResizing ? 'none' : 'background-color 0.2s',
          ':hover': {
            backgroundColor: theme.primary
          }
        }}
        onMouseDown={() => handleResizeStart('left')}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.target.style.backgroundColor = theme.primary;
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.target.style.backgroundColor = theme.border;
          }
        }}
      >
        {/* Resize indicator */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '2px',
          height: '20px',
          backgroundColor: 'currentColor',
          opacity: 0.5
        }} />
      </div>

      {/* Center Panel - Writing Interface */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: '300px'
      }}>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Prompt Input */}
          <div style={{ padding: '16px', borderBottom: `1px solid ${theme.border}` }}>
            {/* Header row with title and options button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <label style={{
                fontWeight: '600',
                color: theme.text,
                fontSize: '14px',
                margin: 0
              }}>
                Writing Prompt
              </label>

              {/* Options Toggle Button */}
              <button
                onClick={() => setShowOptions(!showOptions)}
                style={{
                  padding: '6px',
                  backgroundColor: showOptions ? '#10B981' : theme.surface,
                  color: showOptions ? '#fff' : theme.text,
                  border: `2px solid ${showOptions ? '#10B981' : theme.border}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                  transform: showOptions ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: showOptions ? '0 2px 8px #10B98140, 0 0 0 2px #10B98130' : '0 1px 3px rgba(0,0,0,0.1)'
                }}
                title={showOptions ? "Close options" : "Open options"}
              >
                ⚙️
              </button>
            </div>

            {/* Collapsible Options Panel with smooth slide */}
            <div style={{
              overflow: 'hidden',
              transition: 'max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease',
              maxHeight: showOptions ? '400px' : '0px',
              opacity: showOptions ? 1 : 0,
              marginBottom: showOptions ? '12px' : '0px'
            }}>
              <div style={{
                padding: '16px',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                marginTop: '4px'
              }}>
                {/* Options Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: theme.text
                }}>
                  ⚙️ Options
                </div>

                {/* Options Content - Same as desktop */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  {/* No Hallucinations Checkbox */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: theme.text
                  }}>
                    <input
                      type="checkbox"
                      checked={noHallucinations}
                      onChange={(e) => setNoHallucinations(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: theme.primary
                      }}
                    />
                    <span style={{ fontWeight: '500' }}>No Hallucinations - Verifiable Cited Answers Only</span>
                  </label>

                  {/* Show Thinking Checkbox */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: theme.text
                  }}>
                    <input
                      type="checkbox"
                      checked={showThinking}
                      onChange={(e) => setShowThinking(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: '#10B981'
                      }}
                    />
                    <span style={{ fontWeight: '500' }}>Show AI Thinking Process 🧠</span>
                  </label>

                  {/* Dropdowns - Mobile optimized */}
                  <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                    {/* Persona Selection */}
                    {availablePersonas.length > 0 && (
                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          color: theme.text
                        }}>
                          Writing Persona:
                        </label>
                        <select
                          value={selectedPersona}
                          onChange={(e) => setSelectedPersona(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '6px',
                            border: `1px solid ${theme.border}`,
                            backgroundColor: theme.surface,
                            color: theme.text,
                            fontSize: '14px'
                          }}
                        >
                          {(availablePersonas || []).map(persona => (
                            <option key={persona.id} value={persona.id}>
                              {persona.display_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Model Selection */}
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: theme.text
                      }}>
                        AI Model:
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => {
                          const newModel = e.target.value;
                          setSelectedModel(newModel);
                          // Trigger warmup for the newly selected model
                          triggerModelSwitchWarmup(newModel, {
                            userPreferences: [newModel],
                            recentlyUsed: [newModel]
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '6px',
                          border: `1px solid ${theme.border}`,
                          backgroundColor: theme.surface,
                          color: theme.text,
                          fontSize: '14px'
                        }}
                      >
                        {(availableModels || []).map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({getModelCompany(model.name)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Persona Description */}
                  {selectedPersona && availablePersonas.find(p => p.id === selectedPersona) && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: theme.surface,
                      borderRadius: '6px',
                      border: `1px solid ${theme.border}`,
                      fontSize: '12px',
                      color: theme.text + '80',
                      fontStyle: 'italic',
                      lineHeight: '1.4'
                    }}>
                      <strong style={{ color: theme.text, fontStyle: 'normal' }}>
                        {availablePersonas.find(p => p.id === selectedPersona)?.display_name}:
                      </strong>{' '}
                      {availablePersonas.find(p => p.id === selectedPersona)?.description}
                    </div>
                  )}

                  {/* Model Description */}
                  {selectedModel && availableModels.find(m => m.id === selectedModel) && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: theme.surface,
                      borderRadius: '6px',
                      border: `1px solid ${theme.border}`,
                      fontSize: '12px',
                      color: theme.text + '80',
                      fontStyle: 'italic',
                      lineHeight: '1.4',
                      marginTop: '8px'
                    }}>
                      <strong style={{ color: theme.text, fontStyle: 'normal' }}>
                        {availableModels.find(m => m.id === selectedModel)?.name}:
                      </strong>{' '}
                      {availableModels.find(m => m.id === selectedModel)?.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  generateContent();
                }
              }}
              placeholder="Ask the AI to write something creative or request strict answers based on the uploaded documents... (Press Enter to submit, Shift+Enter for new line)"
              style={{
                width: '100%',
                height: '120px',
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.surface,
                color: theme.text,
                resize: 'vertical',
                fontSize: '14px'
              }}
            />

            {/* Generate Button - Mobile */}
            <button
              onClick={generateContent}
              disabled={loading || !aiHealth?.available}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '12px 16px',
                backgroundColor: theme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading || !aiHealth?.available ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: loading || !aiHealth?.available ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? '✨ Generating...' : (noHallucinations ? '📊 Just the facts - Strict Answers' : '✨ Generate Content')}
            </button>
          </div>

          {/* Generated Content */}
          <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h4 style={{ margin: 0, color: theme.text, fontSize: '14px', fontWeight: '600' }}>
                Generated Content
              </h4>
              {generatedContent && (
                <button style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  color: theme.text,
                  cursor: 'pointer'
                }}>
                  📋 Copy
                </button>
              )}
            </div>
            <div style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              padding: '16px',
              minHeight: '200px',
              fontSize: '14px',
              lineHeight: '1.6',
              color: theme.text,
              whiteSpace: 'pre-wrap'
            }}>
              {generatedContent || 'Generated content will appear here...'}
            </div>
          </div>
        </div>
      </div>

      {/* Right Resize Handle */}
      {!rightPanelCollapsed && (
        <div
          style={{
            width: '4px',
            backgroundColor: theme.border,
            cursor: 'col-resize',
            position: 'relative',
            zIndex: 10,
            transition: isResizing ? 'none' : 'background-color 0.2s'
          }}
        onMouseDown={() => handleResizeStart('right')}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.target.style.backgroundColor = theme.primary;
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.target.style.backgroundColor = theme.border;
          }
        }}
      >
        {/* Resize indicator */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '2px',
          height: '20px',
          backgroundColor: 'currentColor',
          opacity: 0.5
        }} />
      </div>
      )}

      {/* Right Panel - Tools & Features */}
      <div style={{
        width: rightPanelCollapsed ? '0px' : `${rightPanelWidth}px`,
        backgroundColor: theme.surface,
        display: 'flex',
        flexDirection: 'column',
        minWidth: rightPanelCollapsed ? '0px' : '200px',
        transition: 'width 0.3s ease, min-width 0.3s ease',
        overflow: rightPanelCollapsed ? 'hidden' : 'visible'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            color: theme.text,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📋 Project Info
          </h3>

          {/* Toggle button inside right panel */}
          <button
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            style={{
              padding: '6px',
              backgroundColor: theme.surface,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            title="Hide project details"
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {selectedProject ? (
            <div>
              {/* Edit Button for Owner */}
              <div style={{ marginBottom: '16px', textAlign: 'right' }}>
                <button
                  style={{
                    backgroundColor: editMode ? theme.secondary : theme.primary,
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                  onClick={handleProjectEditToggle}
                >
                  {projectEditMode ? '✓ Save Changes' : '✏️ Edit Project'}
                </button>
              </div>

              {/* Project Details */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  color: theme.textSecondary,
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Project Details
                </h4>

                {/* Title */}
                <div style={{
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: theme.background,
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    Title
                  </div>
                  {projectEditMode ? (
                    <input
                      type="text"
                      value={editableProject.title}
                      onChange={(e) => setEditableProject({...editableProject, title: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: theme.text,
                        backgroundColor: theme.surface,
                        fontWeight: '500',
                        boxSizing: 'border-box'
                      }}
                    />
                  ) : (
                    <div style={{
                      fontSize: '14px',
                      color: theme.text,
                      fontWeight: '500'
                    }}>
                      {selectedProject.title}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div style={{
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: theme.background,
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    Description
                  </div>
                  {projectEditMode ? (
                    <textarea
                      value={editableProject.description || ''}
                      onChange={(e) => setEditableProject({...editableProject, description: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: theme.text,
                        backgroundColor: theme.surface,
                        fontWeight: '500',
                        minHeight: '60px',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Enter project description..."
                    />
                  ) : (
                    <div style={{
                      fontSize: '14px',
                      color: theme.text,
                      fontWeight: '500',
                      minHeight: '20px'
                    }}>
                      {selectedProject.description || 'No description provided'}
                    </div>
                  )}
                </div>

                {/* Due Date */}
                <div style={{
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: theme.background,
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    Due Date
                  </div>
                  {projectEditMode ? (
                    <input
                      type="date"
                      value={editableProject.dueDate}
                      onChange={(e) => setEditableProject({...editableProject, dueDate: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: theme.text,
                        backgroundColor: theme.surface,
                        fontWeight: '500',
                        boxSizing: 'border-box'
                      }}
                    />
                  ) : (
                    <div style={{
                      fontSize: '14px',
                      color: theme.text,
                      fontWeight: '500'
                    }}>
                      {selectedProject.dueDate}
                    </div>
                  )}
                </div>

                {/* Owner */}
                <div style={{
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: theme.background,
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    Owner
                  </div>
                  {projectEditMode ? (
                    <select
                      value={editableProject.owner ? editableProject.owner.id : ''}
                      onChange={(e) => {
                        const selectedUser = mockUsers.find(user => user.id === parseInt(e.target.value));
                        setEditableProject({ ...editableProject, owner: selectedUser });
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: theme.text,
                        backgroundColor: theme.surface,
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Select Owner</option>
                      {mockUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: selectedProject.owner?.color || theme.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {selectedProject.owner?.avatar || 'U'}
                      </div>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          color: theme.text,
                          fontWeight: '500'
                        }}>
                          {selectedProject.owner?.name || 'Unassigned'}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: theme.textSecondary
                        }}>
                          {selectedProject.owner?.email || ''}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div style={{
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: theme.background,
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    Status
                  </div>
                  {projectEditMode ? (
                    <select
                      value={editableProject.status}
                      onChange={(e) => setEditableProject({...editableProject, status: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: theme.text,
                        backgroundColor: theme.surface,
                        fontWeight: '500',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  ) : (
                    <div style={{
                      fontSize: '14px',
                      color: theme.text,
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {selectedProject.status}
                    </div>
                  )}
                </div>

                {/* Award Value */}
                <div style={{
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: theme.background,
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    Award Value
                  </div>
                  {projectEditMode ? (
                    <input
                      type="text"
                      value={editableProject.estimatedValue || ''}
                      onChange={(e) => setEditableProject({...editableProject, estimatedValue: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: theme.text,
                        backgroundColor: theme.surface,
                        fontWeight: '500',
                        boxSizing: 'border-box'
                      }}
                      placeholder="e.g., $500,000"
                    />
                  ) : (
                    <div style={{
                      fontSize: '14px',
                      color: theme.text,
                      fontWeight: '500'
                    }}>
                      {selectedProject.estimatedValue || 'Not specified'}
                    </div>
                  )}
                </div>

                {/* Manage Team Button */}
                <div style={{
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  <button
                    onClick={() => {
                      // Need to get the handleManageTeam function from parent
                      const event = new CustomEvent('manageTeam', { detail: selectedProject });
                      window.dispatchEvent(event);
                    }}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      width: '100%'
                    }}
                  >
                    👥 Manage Team
                  </button>
                </div>

                {/* Created Date */}
                <div style={{
                  padding: '12px',
                  backgroundColor: theme.background,
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    Created
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: theme.text,
                    fontWeight: '500'
                  }}>
                    {new Date(selectedProject.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: theme.textSecondary
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                opacity: 0.5
              }}>
                📋
              </div>
              <div style={{
                fontSize: '14px'
              }}>
                Select a project to view details
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Modal */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          backgroundColor: notification.type === 'error' ? theme.error :
                          notification.type === 'success' ? theme.success : theme.primary,
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          maxWidth: '400px',
          fontSize: '14px',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>
              {notification.type === 'error' ? '❌' :
               notification.type === 'success' ? '✅' : 'ℹ️'}
            </span>
            <span style={{ whiteSpace: 'pre-line' }}>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                marginLeft: 'auto',
                opacity: 0.8,
                padding: '0 4px'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: theme.surface,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{
              fontSize: '16px',
              color: theme.text,
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              {confirmDialog.message}
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={confirmDialog.onCancel}
                style={{
                  background: 'none',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: theme.text,
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                style={{
                  backgroundColor: theme.error,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '14px'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setDroppedFiles([]);
        }}
        onProjectCreated={() => {
          if (selectedProject) {
            loadProjectDocuments();
          }
        }}
        selectedProject={selectedProject}
        droppedFiles={droppedFiles}
        theme={theme}
      />
    </div>
  );
};

export default AIWritingThreePanel;