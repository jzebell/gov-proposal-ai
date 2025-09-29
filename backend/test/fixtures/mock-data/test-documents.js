/**
 * Mock Test Documents
 * Sample documents and data for testing Context Management System
 */

const mockDocuments = {
  solicitation1: {
    id: 'sol-001',
    title: 'IT Modernization Solicitation',
    type: 'solicitation',
    content: `
      SOLICITATION NUMBER: 123-IT-2025
      TITLE: IT Infrastructure Modernization Services

      The Government requires comprehensive IT modernization services including:
      - Cloud migration services
      - Legacy system integration
      - Cybersecurity enhancement
      - Data analytics platform implementation

      REQUIREMENTS:
      1. Minimum 5 years experience in federal IT modernization
      2. Current FedRAMP certification required
      3. Proven track record with similar scale projects
      4. 24/7 support capabilities

      TECHNICAL SPECIFICATIONS:
      - Must support hybrid cloud architecture
      - Compliance with FISMA and NIST frameworks
      - Integration with existing government systems
      - Scalable architecture for 10,000+ users
    `,
    metadata: {
      agency: 'Department of Technology',
      solicitation_number: '123-IT-2025',
      due_date: '2025-12-01',
      estimated_value: '$50M',
      naics_code: '541511',
      keywords: ['IT modernization', 'cloud', 'cybersecurity', 'FedRAMP']
    },
    chunks: [
      {
        id: 'sol-001-chunk-0',
        content: 'IT Infrastructure Modernization Services requirements including cloud migration, legacy integration, cybersecurity enhancement.',
        tokens: 156,
        relevance_score: 0.95
      },
      {
        id: 'sol-001-chunk-1',
        content: 'Technical specifications: hybrid cloud architecture, FISMA compliance, NIST frameworks, scalable for 10,000+ users.',
        tokens: 142,
        relevance_score: 0.88
      }
    ]
  },

  requirement1: {
    id: 'req-001',
    title: 'Technical Requirements Document',
    type: 'requirements',
    content: `
      TECHNICAL REQUIREMENTS DOCUMENT
      Project: Government Data Analytics Platform

      1. SYSTEM ARCHITECTURE REQUIREMENTS
      - Microservices architecture
      - Container-based deployment (Docker/Kubernetes)
      - API-first design approach
      - Event-driven architecture

      2. PERFORMANCE REQUIREMENTS
      - Response time: <500ms for 95% of requests
      - Throughput: 10,000 concurrent users
      - Availability: 99.9% uptime
      - Data processing: 1TB/day capacity

      3. SECURITY REQUIREMENTS
      - End-to-end encryption
      - Multi-factor authentication
      - Role-based access control
      - Audit logging for all actions

      4. INTEGRATION REQUIREMENTS
      - RESTful API interfaces
      - SAML/OAuth2 authentication
      - Database compatibility: PostgreSQL, MongoDB
      - Message queuing: Apache Kafka support
    `,
    metadata: {
      document_type: 'technical_requirements',
      classification: 'unclassified',
      version: '2.1',
      last_updated: '2025-09-01',
      keywords: ['microservices', 'API', 'security', 'integration']
    },
    chunks: [
      {
        id: 'req-001-chunk-0',
        content: 'System architecture: microservices, containers, API-first design, event-driven architecture.',
        tokens: 98,
        relevance_score: 0.92
      },
      {
        id: 'req-001-chunk-1',
        content: 'Performance requirements: <500ms response, 10K users, 99.9% uptime, 1TB/day processing.',
        tokens: 112,
        relevance_score: 0.89
      }
    ]
  },

  pastPerformance1: {
    id: 'pp-001',
    title: 'Federal Agency Digital Transformation',
    type: 'past-performance',
    content: `
      PROJECT SUMMARY
      Client: Department of Health Services
      Contract Value: $15M
      Duration: 24 months (2023-2025)

      PROJECT DESCRIPTION:
      Led comprehensive digital transformation initiative for federal health services agency.
      Modernized legacy systems serving 2M+ citizens with improved user experience and
      reduced processing times by 60%.

      KEY ACHIEVEMENTS:
      - Migrated 15 legacy applications to cloud-native architecture
      - Implemented modern API gateway serving 1M+ daily requests
      - Reduced system downtime from 8 hours/month to <1 hour/month
      - Achieved FedRAMP High authorization ahead of schedule

      TECHNOLOGIES USED:
      - AWS GovCloud infrastructure
      - Microservices architecture with Docker/Kubernetes
      - React-based user interfaces
      - PostgreSQL and MongoDB databases
      - Elasticsearch for search capabilities

      CLIENT TESTIMONIAL:
      "Outstanding delivery of complex modernization project. The team exceeded
      expectations in both technical execution and project management."
      - Director of IT Modernization
    `,
    metadata: {
      client: 'Department of Health Services',
      contract_value: '$15M',
      duration_months: 24,
      completion_year: 2025,
      keywords: ['digital transformation', 'cloud migration', 'FedRAMP', 'microservices']
    },
    chunks: [
      {
        id: 'pp-001-chunk-0',
        content: 'Digital transformation for Department of Health Services: $15M, 24 months, 2M+ citizens served.',
        tokens: 134,
        relevance_score: 0.96
      },
      {
        id: 'pp-001-chunk-1',
        content: 'Key achievements: 15 apps migrated, 1M+ API requests/day, <1hr downtime, FedRAMP High.',
        tokens: 118,
        relevance_score: 0.91
      }
    ]
  },

  reference1: {
    id: 'ref-001',
    title: 'Cloud Security Framework Guide',
    type: 'references',
    content: `
      CLOUD SECURITY FRAMEWORK REFERENCE
      Publication: NIST Special Publication 800-144

      OVERVIEW:
      This framework provides guidelines for secure cloud computing implementations
      in federal environments. Covers security controls, risk management, and
      compliance requirements for cloud service adoption.

      KEY SECURITY CONTROLS:
      1. Identity and Access Management (IAM)
      2. Data Protection and Encryption
      3. Network Security and Segmentation
      4. Monitoring and Incident Response
      5. Compliance and Audit Management

      IMPLEMENTATION PHASES:
      Phase 1: Security Assessment and Planning
      Phase 2: Infrastructure Hardening
      Phase 3: Application Security Integration
      Phase 4: Continuous Monitoring Setup

      COMPLIANCE REQUIREMENTS:
      - FISMA compliance mandatory
      - FedRAMP authorization required
      - SOC 2 Type II certification recommended
      - Regular security assessments (quarterly)
    `,
    metadata: {
      publication: 'NIST SP 800-144',
      category: 'security_framework',
      compliance_level: 'federal',
      last_reviewed: '2025-06-01',
      keywords: ['cloud security', 'NIST', 'FISMA', 'FedRAMP']
    },
    chunks: [
      {
        id: 'ref-001-chunk-0',
        content: 'NIST cloud security framework: IAM, encryption, network security, monitoring, compliance.',
        tokens: 103,
        relevance_score: 0.87
      },
      {
        id: 'ref-001-chunk-1',
        content: 'Implementation phases: assessment, hardening, application security, continuous monitoring.',
        tokens: 89,
        relevance_score: 0.85
      }
    ]
  }
};

const mockProjects = {
  testProject: {
    name: 'TestProject',
    documents: ['sol-001', 'req-001', 'pp-001'],
    settings: {
      ragStrictness: 70,
      metadataWeights: {
        agency_match: 8,
        technology_match: 7,
        recency: 5,
        keyword_relevance: 9
      }
    }
  },

  integrationTest: {
    name: 'IntegrationTest',
    documents: ['sol-001', 'req-001', 'pp-001', 'ref-001'],
    settings: {
      ragStrictness: 80,
      metadataWeights: {
        agency_match: 9,
        technology_match: 8,
        recency: 3,
        keyword_relevance: 8
      }
    }
  }
};

const mockAnalyticsData = {
  contextBuilds: [
    {
      id: 'build-001',
      projectName: 'TestProject',
      timestamp: '2025-09-24T10:00:00Z',
      buildDuration: 1500,
      tokenCount: 8000,
      documentCount: 3,
      success: true,
      userId: 'test-user-1'
    },
    {
      id: 'build-002',
      projectName: 'TestProject',
      timestamp: '2025-09-24T11:30:00Z',
      buildDuration: 2200,
      tokenCount: 12000,
      documentCount: 4,
      success: true,
      userId: 'test-user-2'
    },
    {
      id: 'build-003',
      projectName: 'IntegrationTest',
      timestamp: '2025-09-24T14:15:00Z',
      buildDuration: 1800,
      tokenCount: 9500,
      documentCount: 3,
      success: false,
      error: 'Context overflow',
      userId: 'test-user-1'
    }
  ],

  citationAccesses: [
    {
      id: 'access-001',
      citationId: 'cit-001',
      documentId: 'sol-001',
      userId: 'test-user-1',
      accessType: 'click',
      timestamp: '2025-09-24T10:05:00Z',
      sessionDuration: 120
    },
    {
      id: 'access-002',
      citationId: 'cit-002',
      documentId: 'req-001',
      userId: 'test-user-2',
      accessType: 'preview',
      timestamp: '2025-09-24T11:35:00Z',
      sessionDuration: 45
    }
  ],

  overflowEvents: [
    {
      id: 'overflow-001',
      projectName: 'IntegrationTest',
      timestamp: '2025-09-24T14:15:00Z',
      originalTokenCount: 25000,
      maxTokenCount: 16000,
      overflowAmount: 9000,
      documentsSelected: ['sol-001', 'req-001', 'pp-001', 'ref-001'],
      recommendedDocuments: ['sol-001', 'req-001', 'pp-001'],
      userOverride: false,
      resolutionTime: 30
    }
  ]
};

const mockConfigurations = {
  default: {
    ragStrictness: 60,
    documentTypesPriority: [
      'solicitations',
      'requirements',
      'references',
      'past-performance',
      'proposals',
      'compliance',
      'media'
    ],
    metadataWeights: {
      agency_match: 5,
      technology_match: 4,
      recency: 3,
      keyword_relevance: 6
    },
    modelCategories: {
      small: { max_tokens: 4000, models: [] },
      medium: { max_tokens: 16000, models: [] },
      large: { max_tokens: 32000, models: [] }
    },
    tokenAllocation: {
      context_percent: 70,
      generation_percent: 20,
      buffer_percent: 10
    }
  },

  highPerformance: {
    ragStrictness: 85,
    documentTypesPriority: [
      'requirements',
      'solicitations',
      'past-performance',
      'references',
      'proposals',
      'compliance',
      'media'
    ],
    metadataWeights: {
      agency_match: 9,
      technology_match: 8,
      recency: 4,
      keyword_relevance: 9
    }
  }
};

// Helper functions for test data
const testDataHelpers = {
  createMockDocument: (overrides = {}) => {
    const base = {
      id: 'test-doc-' + Date.now(),
      title: 'Test Document',
      type: 'requirements',
      content: 'Sample test document content for testing purposes.',
      metadata: {
        keywords: ['test', 'sample'],
        created_date: new Date().toISOString()
      },
      chunks: [
        {
          id: 'chunk-0',
          content: 'Sample content chunk',
          tokens: 50,
          relevance_score: 0.8
        }
      ]
    };
    return { ...base, ...overrides };
  },

  createMockContextBuild: (overrides = {}) => {
    const base = {
      id: 'build-' + Date.now(),
      projectName: 'TestProject',
      timestamp: new Date().toISOString(),
      buildDuration: Math.floor(Math.random() * 3000) + 1000,
      tokenCount: Math.floor(Math.random() * 10000) + 5000,
      documentCount: Math.floor(Math.random() * 5) + 2,
      success: Math.random() > 0.1, // 90% success rate
      userId: 'test-user'
    };
    return { ...base, ...overrides };
  },

  createMockCitationAccess: (overrides = {}) => {
    const base = {
      id: 'access-' + Date.now(),
      citationId: 'cit-' + Date.now(),
      documentId: 'doc-' + Date.now(),
      userId: 'test-user',
      accessType: ['click', 'preview', 'feedback'][Math.floor(Math.random() * 3)],
      timestamp: new Date().toISOString(),
      sessionDuration: Math.floor(Math.random() * 300) + 30
    };
    return { ...base, ...overrides };
  },

  generateLargeDocumentSet: (count = 20) => {
    const documents = [];
    const types = ['solicitation', 'requirements', 'past-performance', 'references'];

    for (let i = 0; i < count; i++) {
      documents.push(testDataHelpers.createMockDocument({
        id: `large-doc-${i}`,
        title: `Large Document Set Item ${i}`,
        type: types[i % types.length],
        content: `This is document ${i} in the large document set. `.repeat(100), // Larger content
        metadata: {
          keywords: [`keyword${i}`, `category${i % 5}`],
          priority: Math.floor(Math.random() * 10) + 1
        }
      }));
    }

    return documents;
  }
};

module.exports = {
  mockDocuments,
  mockProjects,
  mockAnalyticsData,
  mockConfigurations,
  testDataHelpers
};