/**
 * Cross-Reference Detection Service
 * Advanced semantic matching to identify requirement relationships and cascading impacts
 */

const logger = require('../utils/logger');
const axios = require('axios');

class CrossReferenceService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.defaultModel = process.env.OLLAMA_MODEL || 'qwen2.5:14b';

    // Define relationship types and their patterns
    this.relationshipTypes = {
      'impacts_cost': {
        description: 'Requirement directly impacts project costs',
        patterns: ['hardware', 'software', 'licensing', 'infrastructure', 'personnel', 'travel', 'facilities'],
        weight: 0.9
      },
      'requires_expertise': {
        description: 'Requirement needs specialized skills or personnel',
        patterns: ['security clearance', 'certification', 'specialized', 'expert', 'architect', 'engineer'],
        weight: 0.8
      },
      'impacts_performance': {
        description: 'Requirement affects system performance',
        patterns: ['response time', 'throughput', 'scalability', 'availability', 'performance', 'sla'],
        weight: 0.8
      },
      'regulatory_dependency': {
        description: 'Requirement creates regulatory compliance needs',
        patterns: ['compliance', 'audit', 'certification', 'standards', 'regulation', 'framework'],
        weight: 0.9
      },
      'technical_dependency': {
        description: 'Technical requirement creates other technical needs',
        patterns: ['architecture', 'integration', 'api', 'database', 'network', 'security'],
        weight: 0.7
      },
      'geographic_impact': {
        description: 'Geographic requirements affect multiple areas',
        patterns: ['location', 'facility', 'onsite', 'travel', 'regional', 'datacenter'],
        weight: 0.6
      }
    };

    // Cross-reference impact chains
    this.impactChains = {
      'security_chain': [
        { category: 'security', impacts: ['technical', 'cost', 'staffing'] },
        { category: 'technical', impacts: ['performance', 'cost'] },
        { category: 'performance', impacts: ['infrastructure', 'cost'] }
      ],
      'geographic_chain': [
        { category: 'geographic', impacts: ['travel', 'facilities', 'cost'] },
        { category: 'travel', impacts: ['staffing', 'cost'] },
        { category: 'facilities', impacts: ['infrastructure', 'cost'] }
      ],
      'compliance_chain': [
        { category: 'regulatory', impacts: ['security', 'documentation', 'audit'] },
        { category: 'security', impacts: ['technical', 'staffing'] },
        { category: 'documentation', impacts: ['staffing', 'cost'] }
      ]
    };
  }

  /**
   * Analyze requirements and detect cross-references
   */
  async detectCrossReferences(requirements) {
    try {
      logger.info(`Analyzing cross-references for ${requirements.length} requirements`);

      const crossReferences = [];

      // Phase 1: Direct semantic matching
      const semanticMatches = await this.performSemanticMatching(requirements);
      crossReferences.push(...semanticMatches);

      // Phase 2: Pattern-based relationship detection
      const patternMatches = this.detectPatternRelationships(requirements);
      crossReferences.push(...patternMatches);

      // Phase 3: Impact chain analysis
      const chainMatches = this.analyzeImpactChains(requirements);
      crossReferences.push(...chainMatches);

      // Phase 4: AI-powered relationship detection
      const aiMatches = await this.detectAIRelationships(requirements);
      crossReferences.push(...aiMatches);

      // Deduplicate and score relationships
      const finalReferences = this.consolidateReferences(crossReferences);

      return {
        totalRequirements: requirements.length,
        crossReferences: finalReferences,
        relationshipStats: this.calculateRelationshipStats(finalReferences),
        impactAnalysis: this.generateImpactAnalysis(requirements, finalReferences),
        analyzedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error detecting cross-references: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform semantic matching using AI
   */
  async performSemanticMatching(requirements) {
    try {
      if (requirements.length < 2) return [];

      const prompt = `
Analyze these government proposal requirements and identify relationships between them:

REQUIREMENTS:
${requirements.map(req => `${req.id}: ${req.description} (Category: ${req.category})`).join('\n')}

Identify relationships where one requirement IMPACTS or DEPENDS ON another:

1. TECHNICAL-TO-COST relationships (security requirements → infrastructure costs)
2. TECHNICAL-TO-STAFFING relationships (complex systems → specialized expertise)
3. PERFORMANCE-TO-INFRASTRUCTURE relationships (SLA requirements → hardware sizing)
4. SECURITY-TO-COMPLIANCE relationships (security controls → regulatory frameworks)
5. GEOGRAPHIC-TO-COST relationships (location requirements → travel/facility costs)
6. REGULATORY-DEPENDENCY relationships (compliance creates other compliance needs)

For each relationship found, provide:
- Source requirement ID
- Target requirement ID
- Relationship type
- Confidence (high/medium/low)
- Brief explanation

Format as: SOURCE_ID -> TARGET_ID | RELATIONSHIP_TYPE | CONFIDENCE | EXPLANATION
`;

      const response = await this.callOllama({
        model: this.defaultModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent analysis
          max_tokens: 1500
        }
      });

      return this.parseSemanticMatches(response, requirements);

    } catch (error) {
      logger.warn(`Semantic matching failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Detect relationships using pattern matching
   */
  detectPatternRelationships(requirements) {
    const relationships = [];

    for (let i = 0; i < requirements.length; i++) {
      for (let j = 0; j < requirements.length; j++) {
        if (i === j) continue;

        const sourceReq = requirements[i];
        const targetReq = requirements[j];

        // Check for pattern-based relationships
        for (const [relType, config] of Object.entries(this.relationshipTypes)) {
          const confidence = this.calculatePatternConfidence(sourceReq, targetReq, config);

          if (confidence > 0.3) { // Threshold for relationship detection
            relationships.push({
              sourceRequirement: sourceReq.id,
              targetRequirement: targetReq.id,
              relationshipType: relType,
              confidence: confidence,
              description: this.generateRelationshipDescription(sourceReq, targetReq, relType),
              detectionMethod: 'pattern_matching',
              sourceCategory: sourceReq.category,
              targetCategory: targetReq.category
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Analyze impact chains between requirements
   */
  analyzeImpactChains(requirements) {
    const relationships = [];

    for (const [chainName, chain] of Object.entries(this.impactChains)) {
      // Group requirements by category
      const reqsByCategory = requirements.reduce((acc, req) => {
        const category = req.category.toLowerCase();
        if (!acc[category]) acc[category] = [];
        acc[category].push(req);
        return acc;
      }, {});

      // Analyze each step in the impact chain
      chain.forEach(step => {
        const sourceReqs = reqsByCategory[step.category] || [];

        step.impacts.forEach(impactCategory => {
          const targetReqs = reqsByCategory[impactCategory] || [];

          // Create relationships between categories
          sourceReqs.forEach(sourceReq => {
            targetReqs.forEach(targetReq => {
              const confidence = this.calculateChainConfidence(sourceReq, targetReq, step.category, impactCategory);

              if (confidence > 0.2) {
                relationships.push({
                  sourceRequirement: sourceReq.id,
                  targetRequirement: targetReq.id,
                  relationshipType: 'cascading_impact',
                  confidence: confidence,
                  description: `${step.category} requirement cascades to ${impactCategory}`,
                  detectionMethod: 'impact_chain',
                  chainName: chainName,
                  sourceCategory: sourceReq.category,
                  targetCategory: targetReq.category
                });
              }
            });
          });
        });
      });
    }

    return relationships;
  }

  /**
   * Use AI to detect complex relationships
   */
  async detectAIRelationships(requirements) {
    try {
      // Only run AI analysis for complex sets
      if (requirements.length < 3 || requirements.length > 20) return [];

      const highPriorityReqs = requirements.filter(req =>
        req.riskLevel === 'high' || req.mandatory === true
      );

      if (highPriorityReqs.length < 2) return [];

      const prompt = `
Analyze these HIGH-PRIORITY government requirements for complex interdependencies:

${highPriorityReqs.map(req => `${req.id}: ${req.description} (Risk: ${req.riskLevel})`).join('\n')}

Identify COMPLEX RELATIONSHIPS that might not be obvious:

1. Requirements that create CASCADING COSTS across multiple areas
2. Requirements that create SKILL DEPENDENCIES (one req needs expertise for another)
3. Requirements that create TIMING DEPENDENCIES (one must be completed before another)
4. Requirements that create RISK MULTIPLIERS (combination increases risk significantly)
5. Requirements that create INTEGRATION CHALLENGES (difficult to implement together)

Only identify HIGH-CONFIDENCE relationships with clear business impact.

Format: REQ-ID -> REQ-ID | TYPE | IMPACT | EXPLANATION
`;

      const response = await this.callOllama({
        model: this.defaultModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          max_tokens: 1000
        }
      });

      return this.parseAIMatches(response, requirements);

    } catch (error) {
      logger.warn(`AI relationship detection failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate pattern-based confidence score
   */
  calculatePatternConfidence(sourceReq, targetReq, config) {
    const sourceText = `${sourceReq.description} ${sourceReq.category}`.toLowerCase();
    const targetText = `${targetReq.description} ${targetReq.category}`.toLowerCase();

    let confidence = 0;

    // Check if source contains patterns that would impact target
    config.patterns.forEach(pattern => {
      if (sourceText.includes(pattern)) {
        confidence += 0.3;
      }
      if (targetText.includes(pattern)) {
        confidence += 0.2;
      }
    });

    // Category-based scoring
    const categoryMap = {
      'security': ['technical', 'cost', 'staffing'],
      'performance': ['technical', 'infrastructure'],
      'geographic': ['travel', 'cost', 'facilities'],
      'regulatory': ['security', 'documentation']
    };

    const sourceCat = sourceReq.category.toLowerCase();
    const targetCat = targetReq.category.toLowerCase();

    if (categoryMap[sourceCat]?.includes(targetCat)) {
      confidence += 0.4;
    }

    // Risk level amplification
    if (sourceReq.riskLevel === 'high' && targetReq.riskLevel === 'high') {
      confidence += 0.2;
    }

    return Math.min(confidence * config.weight, 1.0);
  }

  /**
   * Calculate impact chain confidence
   */
  calculateChainConfidence(sourceReq, targetReq, sourceCategory, targetCategory) {
    let confidence = 0.1; // Base confidence

    // Exact category match
    if (sourceReq.category.toLowerCase() === sourceCategory) confidence += 0.3;
    if (targetReq.category.toLowerCase() === targetCategory) confidence += 0.3;

    // Description analysis for chain indicators
    const sourceText = sourceReq.description.toLowerCase();
    const targetText = targetReq.description.toLowerCase();

    const chainKeywords = {
      'security': ['encryption', 'authentication', 'secure', 'cybersecurity'],
      'cost': ['budget', 'price', 'cost', 'expense', 'funding'],
      'staffing': ['personnel', 'staff', 'team', 'resource', 'skills'],
      'infrastructure': ['hardware', 'server', 'network', 'capacity']
    };

    const sourceKeywords = chainKeywords[sourceCategory] || [];
    const targetKeywords = chainKeywords[targetCategory] || [];

    sourceKeywords.forEach(keyword => {
      if (sourceText.includes(keyword)) confidence += 0.1;
    });

    targetKeywords.forEach(keyword => {
      if (targetText.includes(keyword)) confidence += 0.1;
    });

    return Math.min(confidence, 0.8);
  }

  /**
   * Parse semantic matching results from AI
   */
  parseSemanticMatches(response, requirements) {
    const matches = [];
    const lines = response.split('\n');

    const reqMap = requirements.reduce((acc, req) => {
      acc[req.id] = req;
      return acc;
    }, {});

    lines.forEach(line => {
      const match = line.match(/(\w+-\d+)\s*->\s*(\w+-\d+)\s*\|\s*(\w+)\s*\|\s*(\w+)\s*\|\s*(.*)/);
      if (match) {
        const [, sourceId, targetId, relType, confidence, explanation] = match;

        if (reqMap[sourceId] && reqMap[targetId]) {
          matches.push({
            sourceRequirement: sourceId,
            targetRequirement: targetId,
            relationshipType: relType.toLowerCase(),
            confidence: this.parseConfidence(confidence),
            description: explanation.trim(),
            detectionMethod: 'semantic_ai',
            sourceCategory: reqMap[sourceId].category,
            targetCategory: reqMap[targetId].category
          });
        }
      }
    });

    return matches;
  }

  /**
   * Parse AI relationship matches
   */
  parseAIMatches(response, requirements) {
    const matches = [];
    const lines = response.split('\n');

    const reqMap = requirements.reduce((acc, req) => {
      acc[req.id] = req;
      return acc;
    }, {});

    lines.forEach(line => {
      const match = line.match(/(\w+-\d+)\s*->\s*(\w+-\d+)\s*\|\s*(\w+)\s*\|\s*(\w+)\s*\|\s*(.*)/);
      if (match) {
        const [, sourceId, targetId, type, impact, explanation] = match;

        if (reqMap[sourceId] && reqMap[targetId]) {
          matches.push({
            sourceRequirement: sourceId,
            targetRequirement: targetId,
            relationshipType: type.toLowerCase(),
            confidence: 0.7, // AI matches get good confidence
            description: explanation.trim(),
            detectionMethod: 'ai_analysis',
            impact: impact.toLowerCase(),
            sourceCategory: reqMap[sourceId].category,
            targetCategory: reqMap[targetId].category
          });
        }
      }
    });

    return matches;
  }

  /**
   * Consolidate and deduplicate relationships
   */
  consolidateReferences(crossReferences) {
    // Group by source->target pair
    const grouped = crossReferences.reduce((acc, ref) => {
      const key = `${ref.sourceRequirement}->${ref.targetRequirement}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(ref);
      return acc;
    }, {});

    // Consolidate multiple detections of same relationship
    return Object.values(grouped).map(group => {
      if (group.length === 1) return group[0];

      // Multiple detections - combine them
      const combined = {
        sourceRequirement: group[0].sourceRequirement,
        targetRequirement: group[0].targetRequirement,
        relationshipType: this.selectBestRelationshipType(group),
        confidence: Math.max(...group.map(g => g.confidence)),
        description: this.combineDescriptions(group),
        detectionMethods: group.map(g => g.detectionMethod),
        sourceCategory: group[0].sourceCategory,
        targetCategory: group[0].targetCategory,
        consolidatedFrom: group.length
      };

      return combined;
    }).sort((a, b) => b.confidence - a.confidence); // Sort by confidence descending
  }

  /**
   * Generate relationship statistics
   */
  calculateRelationshipStats(relationships) {
    const stats = {
      totalRelationships: relationships.length,
      byType: {},
      byConfidence: { high: 0, medium: 0, low: 0 },
      byDetectionMethod: {},
      averageConfidence: 0
    };

    let confidenceSum = 0;

    relationships.forEach(rel => {
      // By type
      stats.byType[rel.relationshipType] = (stats.byType[rel.relationshipType] || 0) + 1;

      // By confidence level
      if (rel.confidence >= 0.7) stats.byConfidence.high++;
      else if (rel.confidence >= 0.4) stats.byConfidence.medium++;
      else stats.byConfidence.low++;

      confidenceSum += rel.confidence;

      // By detection method
      const methods = Array.isArray(rel.detectionMethods) ? rel.detectionMethods : [rel.detectionMethod];
      methods.forEach(method => {
        stats.byDetectionMethod[method] = (stats.byDetectionMethod[method] || 0) + 1;
      });
    });

    stats.averageConfidence = relationships.length > 0 ? confidenceSum / relationships.length : 0;

    return stats;
  }

  /**
   * Generate impact analysis
   */
  generateImpactAnalysis(requirements, relationships) {
    const analysis = {
      highImpactRequirements: [],
      costImpactChains: [],
      riskAmplification: [],
      criticalDependencies: []
    };

    // Find requirements with most outgoing relationships
    const outgoingCounts = relationships.reduce((acc, rel) => {
      acc[rel.sourceRequirement] = (acc[rel.sourceRequirement] || 0) + 1;
      return acc;
    }, {});

    analysis.highImpactRequirements = Object.entries(outgoingCounts)
      .filter(([, count]) => count >= 3)
      .map(([reqId, count]) => ({
        requirementId: reqId,
        outgoingRelationships: count,
        requirement: requirements.find(r => r.id === reqId)
      }))
      .sort((a, b) => b.outgoingRelationships - a.outgoingRelationships);

    // Find cost impact chains
    analysis.costImpactChains = relationships
      .filter(rel => rel.relationshipType.includes('cost') || rel.description.toLowerCase().includes('cost'))
      .map(rel => ({
        chain: `${rel.sourceRequirement} → ${rel.targetRequirement}`,
        impact: rel.description,
        confidence: rel.confidence
      }));

    return analysis;
  }

  /**
   * Utility methods
   */
  parseConfidence(confidenceText) {
    const text = confidenceText.toLowerCase();
    if (text.includes('high')) return 0.8;
    if (text.includes('medium')) return 0.6;
    if (text.includes('low')) return 0.4;
    return 0.5;
  }

  selectBestRelationshipType(group) {
    // Prefer more specific relationship types
    const typeRanking = {
      'impacts_cost': 5,
      'requires_expertise': 4,
      'regulatory_dependency': 4,
      'technical_dependency': 3,
      'cascading_impact': 2,
      'impacts_performance': 3
    };

    return group.reduce((best, current) =>
      (typeRanking[current.relationshipType] || 1) > (typeRanking[best.relationshipType] || 1)
        ? current : best
    ).relationshipType;
  }

  combineDescriptions(group) {
    const unique = [...new Set(group.map(g => g.description))];
    return unique.join('; ');
  }

  generateRelationshipDescription(sourceReq, targetReq, relType) {
    const templates = {
      'impacts_cost': `${sourceReq.id} requirement drives cost implications for ${targetReq.id}`,
      'requires_expertise': `${sourceReq.id} creates staffing expertise needs for ${targetReq.id}`,
      'impacts_performance': `${sourceReq.id} affects performance characteristics of ${targetReq.id}`,
      'regulatory_dependency': `${sourceReq.id} creates regulatory compliance requirements for ${targetReq.id}`,
      'technical_dependency': `${sourceReq.id} creates technical dependencies for ${targetReq.id}`,
      'geographic_impact': `${sourceReq.id} geographic requirements impact ${targetReq.id}`
    };

    return templates[relType] || `${sourceReq.id} relates to ${targetReq.id}`;
  }

  /**
   * Call Ollama API
   */
  async callOllama(params) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, params, {
        timeout: 60000 // 60 second timeout for analysis
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

module.exports = CrossReferenceService;