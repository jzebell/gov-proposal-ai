/**
 * Compliance Management API Routes
 * Epic 4: Regulatory compliance and requirements tracking endpoints
 */

const express = require('express');
const ComplianceService = require('../services/ComplianceService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const complianceService = new ComplianceService();

/**
 * @route POST /api/compliance/extract-requirements
 * @desc Extract compliance requirements from solicitation document
 * @access Public
 */
router.post('/extract-requirements', sanitizeInput, asyncHandler(async (req, res) => {
  const { documentText } = req.body;

  if (!documentText || documentText.trim().length < 100) {
    return res.status(400).json({
      success: false,
      message: 'Document text is required and must be at least 100 characters'
    });
  }

  logger.info('Extracting requirements from document');

  const result = await complianceService.extractRequirements(documentText);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/compliance/assess-gaps
 * @desc Perform compliance gap analysis
 * @access Public
 */
router.post('/assess-gaps', sanitizeInput, asyncHandler(async (req, res) => {
  const { requirements, currentCapabilities } = req.body;

  if (!requirements || !Array.isArray(requirements) || requirements.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Requirements array is required and cannot be empty'
    });
  }

  if (!currentCapabilities || !Array.isArray(currentCapabilities)) {
    return res.status(400).json({
      success: false,
      message: 'Current capabilities array is required'
    });
  }

  logger.info(`Assessing gaps for ${requirements.length} requirements`);

  const result = await complianceService.assessCompliance(requirements, currentCapabilities);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/compliance/compliance-matrix
 * @desc Generate comprehensive compliance matrix
 * @access Public
 */
router.post('/compliance-matrix', sanitizeInput, asyncHandler(async (req, res) => {
  const { requirements, evidence } = req.body;

  if (!requirements || !Array.isArray(requirements)) {
    return res.status(400).json({
      success: false,
      message: 'Requirements array is required'
    });
  }

  logger.info(`Generating compliance matrix for ${requirements.length} requirements`);

  const result = await complianceService.generateComplianceMatrix(requirements, evidence || []);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/compliance/risk-assessment
 * @desc Perform comprehensive risk assessment
 * @access Public
 */
router.post('/risk-assessment', sanitizeInput, asyncHandler(async (req, res) => {
  const { requirements, threats } = req.body;

  if (!requirements || !Array.isArray(requirements)) {
    return res.status(400).json({
      success: false,
      message: 'Requirements array is required'
    });
  }

  logger.info(`Performing risk assessment for ${requirements.length} requirements`);

  const result = await complianceService.performRiskAssessment(requirements, threats || []);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/compliance/generate-checklist
 * @desc Generate compliance checklist
 * @access Public
 */
router.post('/generate-checklist', sanitizeInput, asyncHandler(async (req, res) => {
  const { requirements, framework } = req.body;

  if (!requirements || !Array.isArray(requirements)) {
    return res.status(400).json({
      success: false,
      message: 'Requirements array is required'
    });
  }

  logger.info(`Generating checklist${framework ? ` for ${framework}` : ''}`);

  const result = complianceService.generateComplianceChecklist(requirements, framework);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/compliance/validate-proposal
 * @desc Validate proposal content against requirements
 * @access Public
 */
router.post('/validate-proposal', sanitizeInput, asyncHandler(async (req, res) => {
  const { proposalContent, requirements } = req.body;

  if (!proposalContent || proposalContent.trim().length < 100) {
    return res.status(400).json({
      success: false,
      message: 'Proposal content is required and must be substantial'
    });
  }

  if (!requirements || !Array.isArray(requirements)) {
    return res.status(400).json({
      success: false,
      message: 'Requirements array is required'
    });
  }

  logger.info(`Validating proposal against ${requirements.length} requirements`);

  const result = await complianceService.validateProposal(proposalContent, requirements);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route POST /api/compliance/generate-report
 * @desc Generate comprehensive compliance report
 * @access Public
 */
router.post('/generate-report', sanitizeInput, asyncHandler(async (req, res) => {
  const reportData = req.body;

  if (!reportData.requirements || !Array.isArray(reportData.requirements)) {
    return res.status(400).json({
      success: false,
      message: 'Requirements array is required in report data'
    });
  }

  logger.info('Generating comprehensive compliance report');

  const result = await complianceService.generateComplianceReport(reportData);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route GET /api/compliance/frameworks
 * @desc Get supported compliance frameworks
 * @access Public
 */
router.get('/frameworks', asyncHandler(async (req, res) => {
  const frameworks = complianceService.frameworks;

  res.json({
    success: true,
    data: {
      frameworks,
      count: Object.keys(frameworks).length,
      supported: [
        'Federal Acquisition Regulation (FAR)',
        'NIST Cybersecurity Framework',
        'FISMA Security Requirements',
        'CMMC Cybersecurity Standards',
        'Section 508 Accessibility',
        'SOC 2 Controls',
        'ITAR/EAR Export Controls',
        'FIPS 140 Standards'
      ]
    }
  });
}));

/**
 * @route GET /api/compliance/templates
 * @desc Get compliance requirement templates
 * @access Public
 */
router.get('/templates', asyncHandler(async (req, res) => {
  const templates = {
    'security-requirements': {
      name: 'Security Requirements Template',
      description: 'Standard security and cybersecurity requirements',
      framework: 'NIST',
      categories: ['Access Control', 'Data Protection', 'Incident Response', 'Risk Management'],
      sampleRequirements: [
        'Implement multi-factor authentication for all user accounts',
        'Encrypt data at rest and in transit using FIPS 140-2 approved algorithms',
        'Maintain security incident response plan with 24/7 monitoring',
        'Conduct regular vulnerability assessments and penetration testing'
      ]
    },
    'accessibility-requirements': {
      name: 'Section 508 Accessibility Template',
      description: 'Federal accessibility compliance requirements',
      framework: 'SECTION508',
      categories: ['Visual Access', 'Audio Access', 'Keyboard Navigation', 'Screen Reader'],
      sampleRequirements: [
        'Provide alternative text for all images and graphics',
        'Ensure keyboard accessibility for all interactive elements',
        'Maintain color contrast ratios of at least 4.5:1',
        'Provide captions for all audio and video content'
      ]
    },
    'performance-requirements': {
      name: 'Performance and SLA Template',
      description: 'System performance and service level requirements',
      framework: 'TECHNICAL',
      categories: ['Response Time', 'Availability', 'Scalability', 'Reliability'],
      sampleRequirements: [
        'System response time must not exceed 3 seconds for 95% of requests',
        'Maintain 99.9% uptime with planned maintenance windows',
        'Support concurrent user load of up to 10,000 users',
        'Implement automated backup and disaster recovery procedures'
      ]
    },
    'documentation-requirements': {
      name: 'Documentation Standards Template',
      description: 'Required documentation and deliverables',
      framework: 'FAR',
      categories: ['Technical Docs', 'User Manuals', 'Training', 'Compliance'],
      sampleRequirements: [
        'Provide comprehensive system documentation including architecture diagrams',
        'Deliver user manuals and training materials in multiple formats',
        'Maintain current security documentation and compliance certificates',
        'Submit monthly progress reports and quarterly compliance assessments'
      ]
    }
  };

  res.json({
    success: true,
    data: templates
  });
}));

/**
 * @route GET /api/compliance/health
 * @desc Check compliance service health
 * @access Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  const isAvailable = await complianceService.isAvailable();

  res.json({
    success: true,
    data: {
      available: isAvailable,
      service: 'Compliance Management',
      aiService: 'Ollama',
      supportedFrameworks: Object.keys(complianceService.frameworks).length,
      timestamp: new Date().toISOString()
    }
  });
}));

/**
 * @route POST /api/compliance/quick-scan
 * @desc Perform quick compliance scan of document
 * @access Public
 */
router.post('/quick-scan', sanitizeInput, asyncHandler(async (req, res) => {
  const { documentText, targetFramework } = req.body;

  if (!documentText || documentText.trim().length < 50) {
    return res.status(400).json({
      success: false,
      message: 'Document text is required for scanning'
    });
  }

  logger.info(`Performing quick scan${targetFramework ? ` for ${targetFramework}` : ''}`);

  // Quick scan - faster analysis with less detail
  const quickResults = {
    documentLength: documentText.length,
    scannedAt: new Date().toISOString(),
    targetFramework: targetFramework || 'all',
    findings: {
      securityMentions: (documentText.match(/security|secure|cybersecurity/gi) || []).length,
      complianceMentions: (documentText.match(/compliance|compliant|requirement/gi) || []).length,
      accessibilityMentions: (documentText.match(/accessibility|508|accessible/gi) || []).length,
      performanceMentions: (documentText.match(/performance|sla|uptime|response/gi) || []).length
    },
    estimatedRequirements: Math.floor(documentText.length / 500), // Rough estimate
    recommendedAction: documentText.length > 2000 ? 'full-analysis' : 'manual-review'
  };

  // Add framework-specific insights
  if (targetFramework) {
    const frameworkKeywords = {
      'NIST': ['nist', 'cybersecurity framework', 'risk management'],
      'FISMA': ['fisma', 'federal information security', 'security controls'],
      'SECTION508': ['section 508', 'accessibility', 'disability'],
      'SOC2': ['soc 2', 'service organization', 'trust services'],
      'CMMC': ['cmmc', 'cybersecurity maturity', 'defense contractor']
    };

    const keywords = frameworkKeywords[targetFramework.toUpperCase()] || [];
    quickResults.frameworkRelevance = keywords.reduce((count, keyword) => {
      return count + (documentText.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
    }, 0);
  }

  res.json({
    success: true,
    data: quickResults
  });
}));

/**
 * @route POST /api/compliance/compare-frameworks
 * @desc Compare requirements across different frameworks
 * @access Public
 */
router.post('/compare-frameworks', sanitizeInput, asyncHandler(async (req, res) => {
  const { frameworks, requirements } = req.body;

  if (!frameworks || !Array.isArray(frameworks) || frameworks.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'At least two frameworks are required for comparison'
    });
  }

  logger.info(`Comparing frameworks: ${frameworks.join(', ')}`);

  const comparison = {
    frameworks: frameworks,
    comparedAt: new Date().toISOString(),
    analysis: {},
    commonRequirements: [],
    uniqueRequirements: {},
    overlapPercentage: 0
  };

  // Analyze each framework
  frameworks.forEach(framework => {
    const frameworkReqs = requirements?.filter(req => req.framework === framework) || [];
    comparison.analysis[framework] = {
      totalRequirements: frameworkReqs.length,
      categories: frameworkReqs.reduce((acc, req) => {
        acc[req.category] = (acc[req.category] || 0) + 1;
        return acc;
      }, {}),
      riskLevels: frameworkReqs.reduce((acc, req) => {
        acc[req.riskLevel] = (acc[req.riskLevel] || 0) + 1;
        return acc;
      }, {})
    };

    comparison.uniqueRequirements[framework] = frameworkReqs
      .filter(req => !frameworks.some(otherFw =>
        otherFw !== framework &&
        requirements?.some(otherReq =>
          otherReq.framework === otherFw &&
          otherReq.description.toLowerCase().includes(req.description.toLowerCase().substring(0, 20))
        )
      ))
      .map(req => req.description);
  });

  res.json({
    success: true,
    data: comparison
  });
}));

module.exports = router;