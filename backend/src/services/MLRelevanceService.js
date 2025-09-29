/**
 * ML-Powered Document Relevance Service
 * Phase 4.1: Machine Learning Engine for intelligent document relevance scoring
 */

class MLRelevanceService {
  constructor() {
    this.trainingData = [];
    this.model = {
      weights: {
        documentType: 0.25,
        keywordMatch: 0.30,
        recency: 0.15,
        userInteraction: 0.20,
        contextualFit: 0.10
      },
      documentTypePriority: {
        'solicitation': 1.0,
        'requirements': 0.95,
        'past-performance': 0.90,
        'references': 0.80,
        'proposals': 0.75,
        'compliance': 0.70,
        'media': 0.60
      }
    };

    // Performance metrics
    this.metrics = {
      predictions: 0,
      accuracySum: 0,
      lastTrained: null
    };
  }

  /**
   * Calculate ML-enhanced relevance score for a document
   * @param {Object} document - Document object with content and metadata
   * @param {string} context - Context or requirements text
   * @param {Object} userHistory - User interaction history
   * @returns {number} Relevance score (0-100)
   */
  async calculateMLRelevanceScore(document, context = '', userHistory = {}) {
    try {
      const features = this.extractFeatures(document, context, userHistory);
      const baseScore = this.calculateBaseRelevance(features);
      const mlAdjustment = this.applyMLAdjustments(features, baseScore);

      const finalScore = Math.min(100, Math.max(0, baseScore + mlAdjustment));

      this.metrics.predictions++;

      return {
        score: Math.round(finalScore * 100) / 100,
        confidence: this.calculateConfidence(features),
        factors: {
          documentType: features.documentType * this.model.weights.documentType,
          keywordMatch: features.keywordMatch * this.model.weights.keywordMatch,
          recency: features.recency * this.model.weights.recency,
          userInteraction: features.userInteraction * this.model.weights.userInteraction,
          contextualFit: features.contextualFit * this.model.weights.contextualFit
        },
        mlAdjustment
      };
    } catch (error) {
      console.error('Error calculating ML relevance score:', error);
      return {
        score: 50, // Fallback score
        confidence: 0.5,
        factors: {},
        error: error.message
      };
    }
  }

  /**
   * Extract features from document and context for ML processing
   * @param {Object} document - Document object
   * @param {string} context - Context text
   * @param {Object} userHistory - User interaction data
   * @returns {Object} Feature vector
   */
  extractFeatures(document, context, userHistory) {
    const features = {
      documentType: this.getDocumentTypeScore(document.type),
      keywordMatch: this.calculateKeywordMatch(document, context),
      recency: this.calculateRecencyScore(document),
      userInteraction: this.calculateUserInteractionScore(document, userHistory),
      contextualFit: this.calculateContextualFit(document, context),
      documentLength: this.normalizeDocumentLength(document),
      metadataRichness: this.calculateMetadataRichness(document)
    };

    return features;
  }

  /**
   * Calculate base relevance score using traditional methods
   */
  calculateBaseRelevance(features) {
    const weightedSum =
      features.documentType * this.model.weights.documentType * 100 +
      features.keywordMatch * this.model.weights.keywordMatch * 100 +
      features.recency * this.model.weights.recency * 100 +
      features.userInteraction * this.model.weights.userInteraction * 100 +
      features.contextualFit * this.model.weights.contextualFit * 100;

    return weightedSum;
  }

  /**
   * Apply ML-based adjustments to base score
   */
  applyMLAdjustments(features, baseScore) {
    let adjustment = 0;

    // Pattern-based adjustments learned from training data
    if (this.trainingData.length > 0) {
      // Find similar patterns in training data
      const similarPatterns = this.findSimilarPatterns(features);

      if (similarPatterns.length > 0) {
        const avgSuccessRate = similarPatterns.reduce((sum, pattern) =>
          sum + pattern.success, 0) / similarPatterns.length;

        // Adjust based on historical success
        adjustment += (avgSuccessRate - 0.5) * 20; // +/- 20 point adjustment
      }
    }

    // Contextual adjustments
    if (features.keywordMatch > 0.8 && features.documentType > 0.9) {
      adjustment += 10; // Bonus for high-relevance, high-priority documents
    }

    if (features.userInteraction > 0.7) {
      adjustment += 5; // Bonus for frequently accessed documents
    }

    // Penalty for very long documents without high keyword match
    if (features.documentLength > 0.8 && features.keywordMatch < 0.3) {
      adjustment -= 15;
    }

    return adjustment;
  }

  /**
   * Calculate document type priority score
   */
  getDocumentTypeScore(docType) {
    return this.model.documentTypePriority[docType] || 0.5;
  }

  /**
   * Calculate keyword match score between document and context
   */
  calculateKeywordMatch(document, context) {
    if (!context || !document.content) return 0;

    const contextWords = this.extractKeywords(context.toLowerCase());
    const documentWords = this.extractKeywords(
      (document.content || '').toLowerCase() + ' ' +
      (document.title || '').toLowerCase()
    );

    if (contextWords.length === 0 || documentWords.length === 0) return 0;

    const matches = contextWords.filter(word => documentWords.includes(word));
    return matches.length / contextWords.length;
  }

  /**
   * Calculate document recency score
   */
  calculateRecencyScore(document) {
    if (!document.metadata?.date && !document.metadata?.created_date) return 0.5;

    const docDate = new Date(document.metadata.date || document.metadata.created_date);
    const now = new Date();
    const daysDiff = (now - docDate) / (1000 * 60 * 60 * 24);

    // Sigmoid function for recency scoring
    return Math.max(0, 1 / (1 + daysDiff / 365)); // 1-year half-life
  }

  /**
   * Calculate user interaction score
   */
  calculateUserInteractionScore(document, userHistory) {
    if (!userHistory.documentAccess) return 0.5;

    const docAccess = userHistory.documentAccess[document.id] || {};
    const accessCount = docAccess.count || 0;
    const avgRating = docAccess.avgRating || 0;

    // Normalize access count (logarithmic scale)
    const normalizedAccess = Math.min(1, Math.log(accessCount + 1) / Math.log(10));
    const normalizedRating = avgRating / 5; // Assuming 5-star rating

    return (normalizedAccess * 0.6) + (normalizedRating * 0.4);
  }

  /**
   * Calculate contextual fit score
   */
  calculateContextualFit(document, context) {
    if (!context || !document.content) return 0.5;

    // Simple TF-IDF-like calculation
    const contextTerms = this.extractImportantTerms(context);
    const documentTerms = this.extractImportantTerms(document.content);

    let fitScore = 0;
    for (const term of contextTerms) {
      if (documentTerms.includes(term)) {
        fitScore += 1;
      }
    }

    return Math.min(1, fitScore / Math.max(1, contextTerms.length));
  }

  /**
   * Normalize document length score
   */
  normalizeDocumentLength(document) {
    const content = document.content || '';
    const length = content.length;

    // Optimal length around 2000-5000 characters
    if (length < 500) return 0.3; // Too short
    if (length > 20000) return 0.2; // Too long
    if (length >= 2000 && length <= 5000) return 1.0; // Optimal

    return 0.7; // Reasonable length
  }

  /**
   * Calculate metadata richness score
   */
  calculateMetadataRichness(document) {
    const metadata = document.metadata || {};
    const metadataFields = Object.keys(metadata).length;
    const hasKeywords = metadata.keywords && Array.isArray(metadata.keywords);
    const hasDate = metadata.date || metadata.created_date;
    const hasAgency = metadata.agency;

    let score = Math.min(1, metadataFields / 10); // Base score from field count

    if (hasKeywords) score += 0.2;
    if (hasDate) score += 0.1;
    if (hasAgency) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    if (!text) return [];

    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word))
      .slice(0, 20); // Limit to top 20 keywords
  }

  /**
   * Extract important terms using simple heuristics
   */
  extractImportantTerms(text) {
    const keywords = this.extractKeywords(text);

    // Prioritize longer, more specific terms
    return keywords
      .filter(word => word.length >= 4)
      .sort((a, b) => b.length - a.length)
      .slice(0, 10);
  }

  /**
   * Check if word is a stop word
   */
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'under', 'over',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
      'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);

    return stopWords.has(word.toLowerCase());
  }

  /**
   * Find similar patterns in training data
   */
  findSimilarPatterns(features) {
    const threshold = 0.8; // Similarity threshold

    return this.trainingData.filter(pattern => {
      const similarity = this.calculateFeatureSimilarity(features, pattern.features);
      return similarity >= threshold;
    });
  }

  /**
   * Calculate similarity between feature vectors
   */
  calculateFeatureSimilarity(features1, features2) {
    const keys = Object.keys(features1);
    let similarity = 0;

    for (const key of keys) {
      if (features2[key] !== undefined) {
        const diff = Math.abs(features1[key] - features2[key]);
        similarity += 1 - diff; // Closer values = higher similarity
      }
    }

    return similarity / keys.length;
  }

  /**
   * Calculate confidence in the prediction
   */
  calculateConfidence(features) {
    let confidence = 0.5; // Base confidence

    // Higher confidence for documents with rich metadata
    confidence += features.metadataRichness * 0.2;

    // Higher confidence when we have training data
    if (this.trainingData.length > 10) {
      confidence += 0.2;
    }

    // Higher confidence for clear keyword matches
    if (features.keywordMatch > 0.7) {
      confidence += 0.2;
    }

    return Math.min(1, confidence);
  }

  /**
   * Train the ML model with feedback data
   */
  async trainRelevanceModel(feedbackData) {
    try {
      if (!Array.isArray(feedbackData)) {
        throw new Error('Feedback data must be an array');
      }

      // Add to training data
      for (const feedback of feedbackData) {
        const trainingPoint = {
          features: feedback.features,
          success: feedback.userRating > 3 ? 1 : 0, // Binary success (>3 stars = success)
          userRating: feedback.userRating,
          timestamp: new Date(),
          documentId: feedback.documentId,
          userId: feedback.userId
        };

        this.trainingData.push(trainingPoint);
      }

      // Keep only recent training data (last 1000 points)
      if (this.trainingData.length > 1000) {
        this.trainingData = this.trainingData
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 1000);
      }

      // Update model weights based on training data
      await this.updateModelWeights();

      this.metrics.lastTrained = new Date();

      return {
        success: true,
        trainingDataSize: this.trainingData.length,
        modelAccuracy: this.calculateModelAccuracy()
      };

    } catch (error) {
      console.error('Error training relevance model:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update model weights based on training data
   */
  async updateModelWeights() {
    if (this.trainingData.length < 10) return; // Need minimum data

    const successfulPatterns = this.trainingData.filter(d => d.success === 1);
    const failedPatterns = this.trainingData.filter(d => d.success === 0);

    if (successfulPatterns.length === 0 || failedPatterns.length === 0) return;

    // Calculate feature importance
    const featureImportance = {};
    const features = ['documentType', 'keywordMatch', 'recency', 'userInteraction', 'contextualFit'];

    for (const feature of features) {
      const successAvg = successfulPatterns.reduce((sum, p) =>
        sum + (p.features[feature] || 0), 0) / successfulPatterns.length;
      const failureAvg = failedPatterns.reduce((sum, p) =>
        sum + (p.features[feature] || 0), 0) / failedPatterns.length;

      featureImportance[feature] = Math.abs(successAvg - failureAvg);
    }

    // Normalize importance scores
    const totalImportance = Object.values(featureImportance).reduce((a, b) => a + b, 0);

    if (totalImportance > 0) {
      for (const feature of features) {
        this.model.weights[feature] = featureImportance[feature] / totalImportance;
      }
    }
  }

  /**
   * Calculate model accuracy
   */
  calculateModelAccuracy() {
    if (this.trainingData.length < 5) return 0;

    let correct = 0;

    for (const data of this.trainingData) {
      const prediction = this.calculateBaseRelevance(data.features) > 60 ? 1 : 0;
      if (prediction === data.success) {
        correct++;
      }
    }

    return correct / this.trainingData.length;
  }

  /**
   * Predict optimal document combinations
   */
  async predictOptimalDocumentSet(documents, requirements, constraints = {}) {
    try {
      const maxTokens = constraints.maxTokens || 16000;
      const maxDocuments = constraints.maxDocuments || 10;

      // Score all documents
      const scoredDocuments = [];

      for (const doc of documents) {
        const relevanceResult = await this.calculateMLRelevanceScore(
          doc, requirements, constraints.userHistory || {}
        );

        scoredDocuments.push({
          ...doc,
          mlScore: relevanceResult.score,
          confidence: relevanceResult.confidence,
          factors: relevanceResult.factors,
          tokenCount: this.estimateTokenCount(doc.content || '')
        });
      }

      // Sort by ML score
      scoredDocuments.sort((a, b) => b.mlScore - a.mlScore);

      // Select optimal combination within constraints
      const selectedDocuments = [];
      let totalTokens = 0;

      for (const doc of scoredDocuments) {
        if (selectedDocuments.length >= maxDocuments) break;
        if (totalTokens + doc.tokenCount <= maxTokens) {
          selectedDocuments.push(doc);
          totalTokens += doc.tokenCount;
        }
      }

      return {
        success: true,
        selectedDocuments,
        totalTokens,
        averageScore: selectedDocuments.reduce((sum, doc) => sum + doc.mlScore, 0) / selectedDocuments.length,
        confidence: selectedDocuments.reduce((sum, doc) => sum + doc.confidence, 0) / selectedDocuments.length,
        reasoning: this.generateSelectionReasoning(selectedDocuments, requirements)
      };

    } catch (error) {
      console.error('Error predicting optimal document set:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate reasoning for document selection
   */
  generateSelectionReasoning(selectedDocuments, requirements) {
    const reasoning = [];

    if (selectedDocuments.length === 0) {
      return ['No documents met the relevance criteria'];
    }

    const topDoc = selectedDocuments[0];
    reasoning.push(`Selected ${selectedDocuments.length} documents based on ML relevance scoring`);
    reasoning.push(`Top document "${topDoc.title}" scored ${topDoc.mlScore.toFixed(1)}/100`);

    // Analyze selection factors
    const avgFactors = this.calculateAverageFactors(selectedDocuments);
    const topFactor = Object.entries(avgFactors).reduce((a, b) =>
      avgFactors[a[0]] > avgFactors[b[0]] ? a : b);

    reasoning.push(`Primary selection factor: ${topFactor[0]} (${(topFactor[1] * 100).toFixed(1)}%)`);

    return reasoning;
  }

  /**
   * Calculate average factors across selected documents
   */
  calculateAverageFactors(documents) {
    if (documents.length === 0) return {};

    const avgFactors = {};
    const factorNames = Object.keys(documents[0].factors || {});

    for (const factor of factorNames) {
      avgFactors[factor] = documents.reduce((sum, doc) =>
        sum + (doc.factors[factor] || 0), 0) / documents.length;
    }

    return avgFactors;
  }

  /**
   * Estimate token count for text
   */
  estimateTokenCount(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4); // Rough estimate: 4 chars per token
  }

  /**
   * Adapt scoring weights based on performance data
   */
  async adaptScoringWeights(performanceData) {
    try {
      // Performance data should include success rates for different weight combinations
      if (!performanceData || !Array.isArray(performanceData)) {
        throw new Error('Invalid performance data');
      }

      // Find the best performing weight configuration
      let bestPerformance = 0;
      let bestWeights = null;

      for (const data of performanceData) {
        if (data.successRate > bestPerformance) {
          bestPerformance = data.successRate;
          bestWeights = data.weights;
        }
      }

      if (bestWeights) {
        // Gradually adapt weights towards better configuration
        const adaptationRate = 0.1; // 10% adaptation per update

        for (const weight in this.model.weights) {
          if (bestWeights[weight] !== undefined) {
            const currentWeight = this.model.weights[weight];
            const targetWeight = bestWeights[weight];
            this.model.weights[weight] = currentWeight +
              (targetWeight - currentWeight) * adaptationRate;
          }
        }
      }

      return {
        success: true,
        adaptedWeights: this.model.weights,
        improvementRate: bestPerformance
      };

    } catch (error) {
      console.error('Error adapting scoring weights:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get model performance metrics
   */
  getModelMetrics() {
    return {
      predictions: this.metrics.predictions,
      accuracy: this.calculateModelAccuracy(),
      trainingDataSize: this.trainingData.length,
      lastTrained: this.metrics.lastTrained,
      currentWeights: { ...this.model.weights }
    };
  }

  /**
   * Reset model to default state
   */
  resetModel() {
    this.trainingData = [];
    this.model.weights = {
      documentType: 0.25,
      keywordMatch: 0.30,
      recency: 0.15,
      userInteraction: 0.20,
      contextualFit: 0.10
    };
    this.metrics = {
      predictions: 0,
      accuracySum: 0,
      lastTrained: null
    };

    return { success: true, message: 'Model reset to default state' };
  }
}

module.exports = MLRelevanceService;