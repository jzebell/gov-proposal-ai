/**
 * Compliance Management Service
 * Epic 4: Regulatory compliance, requirements tracking, and risk assessment
 * Enhanced with cross-reference detection and semantic matching
 */

const axios = require('axios');
const logger = require('../utils/logger');
const CrossReferenceService = require('./CrossReferenceService');
const ComplianceFramework = require('../models/ComplianceFramework');

class ComplianceService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.defaultModel = process.env.OLLAMA_MODEL || 'qwen2.5:14b';

    // Initialize cross-reference service
    this.crossReferenceService = new CrossReferenceService();

    // Initialize database-driven compliance framework model
    this.complianceFrameworkModel = new ComplianceFramework();

    // Legacy frameworks (kept for backward compatibility)
    this.frameworks = {
      'FAR': 'Federal Acquisition Regulation',
      'NIST': 'National Institute of Standards and Technology',
      'FISMA': 'Federal Information Security Management Act',
      'SOC2': 'Service Organization Control 2',
      'CMMC': 'Cybersecurity Maturity Model Certification',
      'ITAR': 'International Traffic in Arms Regulations',
      'EAR': 'Export Administration Regulations',
      'SECTION508': 'Section 508 Accessibility',
      'FIPS140': 'Federal Information Processing Standards'
    };

    // Initialize database on startup
    this.initializeDatabase();
  }

  /**
   * Initialize database tables and seed data
   */
  async initializeDatabase() {
    try {
      await this.complianceFrameworkModel.initializeTables();
      logger.info('Compliance framework database initialized');
    } catch (error) {
      logger.error('Failed to initialize compliance framework database:', error);
    }
  }

  /**
   * Get compliance frameworks organized by category (database-driven)
   */
  async getFrameworksByCategory() {
    try {
      return await this.complianceFrameworkModel.getFrameworksByCategory();
    } catch (error) {
      logger.warn('Failed to load frameworks from database, falling back to legacy:', error);
      // Fallback to legacy frameworks
      return {
        acquisition: {
          name: 'acquisition',
          displayName: 'Acquisition & Procurement',
          frameworks: [
            { code: 'FAR', name: this.frameworks.FAR, isDefault: true }
          ]
        },
        security: {
          name: 'security',
          displayName: 'Security & Cybersecurity',
          frameworks: [
            { code: 'FISMA', name: this.frameworks.FISMA, isDefault: true },
            { code: 'NIST', name: this.frameworks.NIST, isDefault: true },
            { code: 'CMMC', name: this.frameworks.CMMC, isDefault: false }
          ]
        }
      };
    }
  }

  /**
   * Get frameworks for specific agency (database-driven)
   */
  async getFrameworksForAgency(agencyId, departmentId = null) {
    try {
      return await this.complianceFrameworkModel.getFrameworksForAgency(agencyId, departmentId);
    } catch (error) {
      logger.warn('Failed to load agency frameworks from database, falling back to legacy:', error);
      // Fallback to default frameworks
      return Object.entries(this.frameworks).map(([code, name]) => ({
        code,
        name,
        isDefault: ['FAR', 'FISMA', 'SECTION508'].includes(code)
      }));
    }
  }

  /**
   * Extract requirements from solicitation document
   */
  async extractRequirements(documentText) {
    try {
      logger.info('Extracting compliance requirements from document');

      const prompt = `
Analyze this government solicitation document and extract all compliance requirements:

Document:
${documentText.substring(0, 6000)}...

Identify and categorize:
1. MANDATORY requirements (must-have)
2. TECHNICAL requirements (specifications, standards)
3. REGULATORY compliance (FAR, NIST, FISMA, etc.)
4. SECURITY requirements (CMMC, FIPS, etc.)
5. ACCESSIBILITY requirements (Section 508)
6. PERFORMANCE requirements (SLAs, metrics)
7. DOCUMENTATION requirements
8. REPORTING requirements
9. CERTIFICATION requirements
10. TESTING requirements

For each requirement, provide:
- Requirement ID/section reference
- Description
- Category (mandatory/technical/regulatory/etc.)
- Compliance framework (if applicable)
- Risk level (high/medium/low)
- Evidence needed for compliance

Format as structured text with clear categories.
`;

      const response = await this.callOllama({
        model: this.defaultModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          max_tokens: 2500
        }
      });

      const requirements = this.parseRequirements(response);

      // Detect cross-references between requirements
      let crossReferences = null;
      try {
        logger.info('Detecting cross-references between requirements...');
        crossReferences = await this.crossReferenceService.detectCrossReferences(requirements);
      } catch (error) {
        logger.warn(`Cross-reference detection failed: ${error.message}`);
      }

      return {
        extractedRequirements: requirements,
        crossReferences: crossReferences,
        rawAnalysis: response,
        documentLength: documentText.length,
        extractedAt: new Date().toISOString(),
        totalRequirements: requirements.length,
        requirementsByCategory: this.categorizeRequirements(requirements),
        relationshipInsights: crossReferences ? this.generateRelationshipInsights(requirements, crossReferences) : null
      };

    } catch (error) {
      logger.error(`Error extracting requirements: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assess compliance gap analysis
   */
  async assessCompliance(requirements, currentCapabilities) {
    try {
      logger.info('Performing compliance gap analysis');

      const prompt = `
Perform a compliance gap analysis:

REQUIREMENTS:
${requirements.map(req => `- ${req.id}: ${req.description} (${req.category})`).join('\n')}

CURRENT CAPABILITIES:
${currentCapabilities.map(cap => `- ${cap.name}: ${cap.description} (Status: ${cap.status})`).join('\n')}

Analyze:
1. Which requirements are FULLY MET
2. Which requirements have PARTIAL COMPLIANCE
3. Which requirements have GAPS
4. Risk assessment for each gap
5. Recommended actions to achieve compliance
6. Priority order for addressing gaps
7. Estimated effort/cost for remediation

Provide specific, actionable recommendations.
`;

      const response = await this.callOllama({
        model: this.defaultModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          max_tokens: 2000
        }
      });

      return {
        gapAnalysis: response,
        assessmentDate: new Date().toISOString(),
        totalRequirements: requirements.length,
        currentCapabilities: currentCapabilities.length,
        complianceScore: this.calculateComplianceScore(requirements, currentCapabilities)
      };

    } catch (error) {
      logger.error(`Error assessing compliance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate compliance matrix
   */
  async generateComplianceMatrix(requirements, evidence) {
    try {
      logger.info('Generating compliance matrix');

      const matrix = requirements.map(req => {
        const relatedEvidence = evidence.filter(ev =>
          ev.requirementIds?.includes(req.id) ||
          ev.description?.toLowerCase().includes(req.description?.toLowerCase().substring(0, 20))
        );

        return {
          requirementId: req.id,
          description: req.description,
          category: req.category,
          framework: req.framework,
          riskLevel: req.riskLevel,
          complianceStatus: this.determineComplianceStatus(req, relatedEvidence),
          evidence: relatedEvidence.map(ev => ({
            type: ev.type,
            description: ev.description,
            status: ev.status,
            lastUpdated: ev.lastUpdated
          })),
          gaps: this.identifyGaps(req, relatedEvidence),
          recommendations: this.generateRecommendations(req, relatedEvidence)
        };
      });

      return {
        complianceMatrix: matrix,
        summary: {
          totalRequirements: requirements.length,
          fullyCompliant: matrix.filter(m => m.complianceStatus === 'compliant').length,
          partiallyCompliant: matrix.filter(m => m.complianceStatus === 'partial').length,
          nonCompliant: matrix.filter(m => m.complianceStatus === 'non-compliant').length,
          overallScore: this.calculateMatrixScore(matrix)
        },
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error generating compliance matrix: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform risk assessment
   */
  async performRiskAssessment(requirements, threats = []) {
    try {
      logger.info('Performing compliance risk assessment');

      const prompt = `
Perform a comprehensive risk assessment for these compliance requirements:

REQUIREMENTS:
${requirements.map(req => `- ${req.id}: ${req.description} (Framework: ${req.framework}, Risk: ${req.riskLevel})`).join('\n')}

${threats.length > 0 ? `KNOWN THREATS/RISKS:\n${threats.map(t => `- ${t.name}: ${t.description}`).join('\n')}` : ''}

Assess:
1. REGULATORY RISKS - penalties for non-compliance
2. OPERATIONAL RISKS - impact on business operations
3. SECURITY RISKS - vulnerabilities and threats
4. FINANCIAL RISKS - costs of compliance vs non-compliance
5. REPUTATIONAL RISKS - impact on organization reputation
6. TECHNICAL RISKS - implementation challenges

For each risk:
- Likelihood (high/medium/low)
- Impact (high/medium/low)
- Risk level (critical/high/medium/low)
- Mitigation strategies
- Contingency plans

Prioritize risks by overall impact.
`;

      const response = await this.callOllama({
        model: this.defaultModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          max_tokens: 2200
        }
      });

      return {
        riskAssessment: response,
        assessmentDate: new Date().toISOString(),
        requirementsAnalyzed: requirements.length,
        overallRiskLevel: this.calculateOverallRisk(requirements),
        criticalRisks: requirements.filter(req => req.riskLevel === 'high').length
      };

    } catch (error) {
      logger.error(`Error performing risk assessment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate compliance checklist
   */
  generateComplianceChecklist(requirements, framework = null) {
    try {
      logger.info(`Generating compliance checklist${framework ? ` for ${framework}` : ''}`);

      let filteredRequirements = requirements;
      if (framework) {
        filteredRequirements = requirements.filter(req =>
          req.framework?.toLowerCase() === framework.toLowerCase()
        );
      }

      const checklist = {
        framework: framework || 'All Frameworks',
        categories: {},
        totalItems: 0,
        generatedAt: new Date().toISOString()
      };

      filteredRequirements.forEach(req => {
        const category = req.category || 'General';

        if (!checklist.categories[category]) {
          checklist.categories[category] = {
            items: [],
            completed: 0,
            total: 0
          };
        }

        checklist.categories[category].items.push({
          id: req.id,
          description: req.description,
          required: req.mandatory || false,
          framework: req.framework,
          riskLevel: req.riskLevel,
          evidenceRequired: req.evidenceRequired || [],
          status: 'pending',
          notes: '',
          assignedTo: null,
          dueDate: null
        });

        checklist.categories[category].total++;
        checklist.totalItems++;
      });

      return checklist;

    } catch (error) {
      logger.error(`Error generating compliance checklist: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate proposal against requirements
   */
  async validateProposal(proposalContent, requirements) {
    try {
      logger.info('Validating proposal against compliance requirements');

      const prompt = `
Validate this proposal content against the specified requirements:

PROPOSAL CONTENT:
${proposalContent.substring(0, 4000)}...

REQUIREMENTS TO VALIDATE:
${requirements.map(req => `- ${req.id}: ${req.description} (${req.mandatory ? 'MANDATORY' : 'OPTIONAL'})`).join('\n')}

For each requirement:
1. Is it addressed in the proposal? (Yes/No/Partial)
2. Where is it addressed? (section/paragraph reference)
3. How well is it addressed? (Excellent/Good/Fair/Poor)
4. What evidence is provided?
5. What's missing or needs improvement?

Provide an overall compliance score (0-100%) and summary of critical gaps.
`;

      const response = await this.callOllama({
        model: this.defaultModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          max_tokens: 2000
        }
      });

      return {
        validationResults: response,
        proposalLength: proposalContent.length,
        requirementsChecked: requirements.length,
        validatedAt: new Date().toISOString(),
        complianceScore: this.extractComplianceScore(response)
      };

    } catch (error) {
      logger.error(`Error validating proposal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(data) {
    try {
      logger.info('Generating comprehensive compliance report');

      const {
        requirements = [],
        gapAnalysis = null,
        riskAssessment = null,
        complianceMatrix = null,
        validationResults = null
      } = data;

      const report = {
        executiveSummary: {
          totalRequirements: requirements.length,
          mandatoryRequirements: requirements.filter(r => r.mandatory).length,
          highRiskRequirements: requirements.filter(r => r.riskLevel === 'high').length,
          complianceScore: this.calculateOverallComplianceScore(data),
          reportDate: new Date().toISOString()
        },
        requirementsSummary: this.summarizeRequirements(requirements),
        gapAnalysis: gapAnalysis,
        riskAssessment: riskAssessment,
        complianceMatrix: complianceMatrix,
        validationResults: validationResults,
        recommendations: this.generateOverallRecommendations(data),
        actionPlan: this.createActionPlan(requirements, gapAnalysis)
      };

      return report;

    } catch (error) {
      logger.error(`Error generating compliance report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse requirements from AI response
   */
  parseRequirements(analysisText) {
    const requirements = [];
    const lines = analysisText.split('\n');
    let currentCategory = 'general';
    let requirementCounter = 1;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect category headers
      if (trimmed.match(/^\d+\.\s*(MANDATORY|TECHNICAL|REGULATORY|SECURITY|ACCESSIBILITY|PERFORMANCE|DOCUMENTATION|REPORTING|CERTIFICATION|TESTING)/i)) {
        currentCategory = trimmed.toLowerCase().replace(/^\d+\.\s*/, '').split(' ')[0];
        continue;
      }

      // Parse requirement lines
      if (trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
        const description = trimmed.replace(/^[-\d.]\s*/, '');
        if (description.length > 10) {
          requirements.push({
            id: `REQ-${String(requirementCounter).padStart(3, '0')}`,
            description: description,
            category: currentCategory,
            mandatory: currentCategory === 'mandatory',
            framework: this.detectFramework(description),
            riskLevel: this.assessRiskLevel(description, currentCategory),
            evidenceRequired: this.suggestEvidence(description, currentCategory)
          });
          requirementCounter++;
        }
      }
    }

    return requirements;
  }

  /**
   * Detect compliance framework from requirement text
   */
  detectFramework(text) {
    const textLower = text.toLowerCase();
    for (const [code, name] of Object.entries(this.frameworks)) {
      if (textLower.includes(code.toLowerCase()) || textLower.includes(name.toLowerCase())) {
        return code;
      }
    }
    return null;
  }

  /**
   * Assess risk level based on requirement content
   */
  assessRiskLevel(description, category) {
    const highRiskKeywords = ['security', 'critical', 'mandatory', 'compliance', 'audit', 'penalty'];
    const mediumRiskKeywords = ['performance', 'availability', 'backup', 'monitoring'];

    const descLower = description.toLowerCase();

    if (category === 'mandatory' || highRiskKeywords.some(keyword => descLower.includes(keyword))) {
      return 'high';
    }
    if (mediumRiskKeywords.some(keyword => descLower.includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Suggest evidence types for requirement
   */
  suggestEvidence(description, category) {
    const evidenceMap = {
      security: ['Security documentation', 'Penetration test results', 'Vulnerability assessments'],
      technical: ['Technical specifications', 'Architecture diagrams', 'Test results'],
      regulatory: ['Compliance certificates', 'Audit reports', 'Policy documents'],
      documentation: ['User manuals', 'Training materials', 'Process documentation'],
      performance: ['Performance benchmarks', 'SLA reports', 'Monitoring data']
    };

    return evidenceMap[category] || ['Documentation', 'Verification evidence'];
  }

  /**
   * Calculate compliance scores and metrics
   */
  calculateComplianceScore(requirements, capabilities) {
    if (!requirements.length) return 0;

    let score = 0;
    requirements.forEach(req => {
      const matchingCap = capabilities.find(cap =>
        cap.description?.toLowerCase().includes(req.description?.toLowerCase().substring(0, 20))
      );

      if (matchingCap) {
        if (matchingCap.status === 'compliant') score += 100;
        else if (matchingCap.status === 'partial') score += 50;
      }
    });

    return Math.round(score / requirements.length);
  }

  calculateOverallComplianceScore(data) {
    // Simplified calculation - would be more sophisticated in production
    return 85; // Placeholder
  }

  categorizeRequirements(requirements) {
    return requirements.reduce((acc, req) => {
      const category = req.category || 'general';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  }

  determineComplianceStatus(requirement, evidence) {
    if (!evidence.length) return 'non-compliant';
    if (evidence.some(e => e.status === 'complete')) return 'compliant';
    return 'partial';
  }

  identifyGaps(requirement, evidence) {
    const gaps = [];
    if (!evidence.length) {
      gaps.push('No evidence provided');
    }
    return gaps;
  }

  generateRecommendations(requirement, evidence) {
    const recommendations = [];
    if (!evidence.length) {
      recommendations.push(`Provide evidence for: ${requirement.description}`);
    }
    return recommendations;
  }

  calculateMatrixScore(matrix) {
    const scores = { 'compliant': 100, 'partial': 50, 'non-compliant': 0 };
    const total = matrix.reduce((sum, item) => sum + scores[item.complianceStatus], 0);
    return Math.round(total / matrix.length);
  }

  calculateOverallRisk(requirements) {
    const riskScores = { 'high': 3, 'medium': 2, 'low': 1 };
    const totalScore = requirements.reduce((sum, req) => sum + riskScores[req.riskLevel], 0);
    const avgScore = totalScore / requirements.length;

    if (avgScore >= 2.5) return 'high';
    if (avgScore >= 1.5) return 'medium';
    return 'low';
  }

  extractComplianceScore(text) {
    const match = text.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }

  summarizeRequirements(requirements) {
    return {
      total: requirements.length,
      byCategory: this.categorizeRequirements(requirements),
      byFramework: requirements.reduce((acc, req) => {
        const fw = req.framework || 'none';
        acc[fw] = (acc[fw] || 0) + 1;
        return acc;
      }, {}),
      byRiskLevel: requirements.reduce((acc, req) => {
        acc[req.riskLevel] = (acc[req.riskLevel] || 0) + 1;
        return acc;
      }, {})
    };
  }

  generateOverallRecommendations(data) {
    return [
      'Implement automated compliance monitoring',
      'Establish regular compliance audits',
      'Create compliance training program',
      'Maintain up-to-date documentation',
      'Implement continuous risk assessment'
    ];
  }

  createActionPlan(requirements, gapAnalysis) {
    const highPriorityReqs = requirements.filter(req => req.riskLevel === 'high');
    return {
      immediate: highPriorityReqs.slice(0, 3).map(req => `Address ${req.id}: ${req.description}`),
      shortTerm: requirements.filter(req => req.riskLevel === 'medium').slice(0, 5).map(req => `Implement ${req.id}`),
      longTerm: requirements.filter(req => req.riskLevel === 'low').slice(0, 3).map(req => `Monitor ${req.id}`)
    };
  }

  /**
   * Generate insights from requirement relationships
   */
  generateRelationshipInsights(requirements, crossReferences) {
    const insights = {
      criticalRelationships: [],
      costImpactChains: [],
      staffingImplications: [],
      riskAmplifiers: [],
      implementationSequence: []
    };

    if (!crossReferences || !crossReferences.crossReferences) return insights;

    const relationships = crossReferences.crossReferences;

    // Find critical relationships (high confidence + high risk requirements)
    insights.criticalRelationships = relationships
      .filter(rel => rel.confidence > 0.6)
      .filter(rel => {
        const sourceReq = requirements.find(r => r.id === rel.sourceRequirement);
        const targetReq = requirements.find(r => r.id === rel.targetRequirement);
        return (sourceReq?.riskLevel === 'high') || (targetReq?.riskLevel === 'high');
      })
      .slice(0, 5);

    // Cost impact chains
    insights.costImpactChains = relationships
      .filter(rel => rel.relationshipType.includes('cost') || rel.description.toLowerCase().includes('cost'))
      .map(rel => ({
        chain: `${rel.sourceRequirement} → ${rel.targetRequirement}`,
        description: rel.description,
        confidence: rel.confidence
      }));

    // Staffing implications
    insights.staffingImplications = relationships
      .filter(rel => rel.relationshipType === 'requires_expertise')
      .map(rel => {
        const sourceReq = requirements.find(r => r.id === rel.sourceRequirement);
        return {
          requirement: rel.sourceRequirement,
          description: sourceReq?.description,
          expertiseNeeded: rel.description
        };
      });

    // Risk amplifiers (requirements that increase risk of others)
    insights.riskAmplifiers = relationships
      .filter(rel => {
        const sourceReq = requirements.find(r => r.id === rel.sourceRequirement);
        const targetReq = requirements.find(r => r.id === rel.targetRequirement);
        return sourceReq?.riskLevel === 'high' && targetReq?.riskLevel !== 'low';
      })
      .slice(0, 3);

    return insights;
  }

  /**
   * Analyze cascading compliance impacts
   */
  async analyzeCascadingCompliance(requirements, crossReferences) {
    try {
      logger.info('Analyzing cascading compliance impacts');

      if (!crossReferences?.crossReferences?.length) {
        return { cascadingAnalysis: 'No cross-references available for analysis' };
      }

      // Build impact chains
      const impactChains = this.buildImpactChains(requirements, crossReferences.crossReferences);

      // Analyze cost implications
      const costAnalysis = this.analyzeCostImplications(impactChains);

      // Analyze staffing implications
      const staffingAnalysis = this.analyzeStaffingImplications(impactChains);

      // Generate recommendations
      const recommendations = this.generateCascadingRecommendations(impactChains);

      return {
        impactChains: impactChains.slice(0, 10), // Top 10 most important chains
        costAnalysis,
        staffingAnalysis,
        recommendations,
        analyzedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error analyzing cascading compliance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build impact chains from relationships
   */
  buildImpactChains(requirements, relationships) {
    const chains = [];
    const reqMap = requirements.reduce((acc, req) => {
      acc[req.id] = req;
      return acc;
    }, {});

    // Group relationships by source
    const bySource = relationships.reduce((acc, rel) => {
      if (!acc[rel.sourceRequirement]) acc[rel.sourceRequirement] = [];
      acc[rel.sourceRequirement].push(rel);
      return acc;
    }, {});

    // Build chains starting from high-impact requirements
    Object.entries(bySource).forEach(([sourceId, rels]) => {
      const sourceReq = reqMap[sourceId];
      if (sourceReq && rels.length >= 2) { // Requirements with multiple impacts
        chains.push({
          rootRequirement: sourceReq,
          impacts: rels.map(rel => ({
            targetRequirement: reqMap[rel.targetRequirement],
            relationshipType: rel.relationshipType,
            confidence: rel.confidence,
            description: rel.description
          })),
          totalImpacts: rels.length,
          avgConfidence: rels.reduce((sum, rel) => sum + rel.confidence, 0) / rels.length
        });
      }
    });

    return chains.sort((a, b) => b.totalImpacts - a.totalImpacts);
  }

  /**
   * Analyze cost implications from impact chains
   */
  analyzeCostImplications(impactChains) {
    const costChains = impactChains.filter(chain =>
      chain.impacts.some(impact =>
        impact.relationshipType.includes('cost') ||
        impact.description.toLowerCase().includes('cost')
      )
    );

    return {
      directCostImpacts: costChains.length,
      highConfidenceCostImpacts: costChains.filter(chain => chain.avgConfidence > 0.6).length,
      costDrivers: costChains.slice(0, 5).map(chain => ({
        requirement: chain.rootRequirement.id,
        description: chain.rootRequirement.description,
        costImpacts: chain.impacts.filter(i => i.relationshipType.includes('cost')).length
      }))
    };
  }

  /**
   * Analyze staffing implications from impact chains
   */
  analyzeStaffingImplications(impactChains) {
    const staffingChains = impactChains.filter(chain =>
      chain.impacts.some(impact =>
        impact.relationshipType === 'requires_expertise' ||
        impact.description.toLowerCase().includes('staff') ||
        impact.description.toLowerCase().includes('skill')
      )
    );

    return {
      requirementsNeedingExpertise: staffingChains.length,
      highPriorityStaffingNeeds: staffingChains.filter(chain =>
        chain.rootRequirement.riskLevel === 'high'
      ).length,
      expertiseAreas: staffingChains.slice(0, 5).map(chain => ({
        requirement: chain.rootRequirement.id,
        description: chain.rootRequirement.description,
        category: chain.rootRequirement.category
      }))
    };
  }

  /**
   * Generate cascading recommendations
   */
  generateCascadingRecommendations(impactChains) {
    return [
      {
        priority: 'high',
        title: 'Address High-Impact Requirements First',
        description: `Focus on requirements with ${impactChains.slice(0, 3).map(c => c.rootRequirement.id).join(', ')} as they have cascading effects`,
        rationale: 'These requirements impact multiple other areas and should be planned comprehensively'
      },
      {
        priority: 'medium',
        title: 'Plan Cross-Functional Coordination',
        description: 'Requirements have cross-dependencies requiring coordinated implementation',
        rationale: 'Avoid implementation conflicts by planning related requirements together'
      },
      {
        priority: 'medium',
        title: 'Budget for Cascading Costs',
        description: 'Include indirect costs from requirement relationships in budget planning',
        rationale: 'Cross-referenced requirements often have hidden cost implications'
      }
    ];
  }

  /**
   * Call Ollama API
   */
  async callOllama(params) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, params, {
        timeout: 90000 // 90 second timeout for complex analysis
      });

      return response.data.response || response.data.content || '';
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama service is not running. Please start Ollama and try again.');
      }
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  /**
   * Check if service is available
   */
  async isAvailable() {
    try {
      await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = ComplianceService;