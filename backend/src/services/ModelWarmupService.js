/**
 * Model Warm-up Service
 * Handles automatic model warm-up for improved response times
 */

const axios = require('axios');
const logger = require('../utils/logger');

class ModelWarmupService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.warmupCache = new Map(); // Track warm-up status for each model
    this.warmupQueue = new Set(); // Track models currently being warmed up
    this.defaultModel = process.env.OLLAMA_MODEL || 'gemma2:9b';

    // Configuration
    this.warmupTimeout = 30000; // 30 second timeout for warmup operations
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes - how long to consider a model "warm"
    this.maxConcurrentWarmups = 2; // Limit concurrent warm-ups to prevent resource exhaustion

    // Warm-up test prompts (lightweight)
    this.testPrompts = {
      small: "Hi", // For quick models (2B-3B)
      medium: "Write a brief greeting.", // For medium models (7B-14B)
      large: "Hello, please respond briefly." // For large models (27B+)
    };

    this.initializeService();
  }

  async initializeService() {
    logger.info('Initializing Model Warm-up Service');

    // Clean up expired warm-up cache on startup
    this.cleanupExpiredCache();

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 2 * 60 * 1000); // Every 2 minutes
  }

  /**
   * Get warm-up status for all models or specific model
   */
  getWarmupStatus(modelName = null) {
    if (modelName) {
      const status = this.warmupCache.get(modelName);
      return {
        model: modelName,
        isWarm: status && (Date.now() - status.warmedAt) < this.cacheExpiry,
        isWarming: this.warmupQueue.has(modelName),
        lastWarmed: status ? status.warmedAt : null,
        warmupDuration: status ? status.duration : null
      };
    }

    // Return status for all models
    const allModels = Array.from(this.warmupCache.keys());
    const status = {};

    allModels.forEach(model => {
      const modelStatus = this.warmupCache.get(model);
      status[model] = {
        isWarm: modelStatus && (Date.now() - modelStatus.warmedAt) < this.cacheExpiry,
        isWarming: this.warmupQueue.has(model),
        lastWarmed: modelStatus ? modelStatus.warmedAt : null,
        warmupDuration: modelStatus ? modelStatus.duration : null
      };
    });

    return {
      models: status,
      overallStatus: this.getOverallWarmupStatus()
    };
  }

  /**
   * Get overall system warm-up status
   */
  getOverallWarmupStatus() {
    const activeWarmups = this.warmupQueue.size;
    const warmModels = Array.from(this.warmupCache.values())
      .filter(status => (Date.now() - status.warmedAt) < this.cacheExpiry).length;

    return {
      isSystemWarming: activeWarmups > 0,
      activeWarmups: activeWarmups,
      warmModelCount: warmModels,
      totalCachedModels: this.warmupCache.size
    };
  }

  /**
   * Warm up a specific model
   */
  async warmupModel(modelName, priority = 'normal') {
    // Check if already warm
    const status = this.warmupCache.get(modelName);
    if (status && (Date.now() - status.warmedAt) < this.cacheExpiry) {
      logger.debug(`Model ${modelName} already warm, skipping warmup`);
      return { success: true, alreadyWarm: true, duration: 0 };
    }

    // Check if already warming up
    if (this.warmupQueue.has(modelName)) {
      logger.debug(`Model ${modelName} already warming up, skipping duplicate request`);
      return { success: true, alreadyWarming: true, duration: 0 };
    }

    // Check concurrent warm-up limit
    if (this.warmupQueue.size >= this.maxConcurrentWarmups && priority !== 'high') {
      logger.debug(`Max concurrent warmups reached, queueing ${modelName} for later`);
      // For normal priority, we'll skip and try again later
      return { success: false, reason: 'queue_full', queued: false };
    }

    return await this.performWarmup(modelName);
  }

  /**
   * Warm up multiple models in sequence
   */
  async warmupModels(modelNames, priority = 'normal') {
    const results = {};

    for (const modelName of modelNames) {
      try {
        results[modelName] = await this.warmupModel(modelName, priority);

        // Small delay between warmups to prevent overloading
        if (modelNames.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        results[modelName] = {
          success: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Automatic smart warm-up based on usage patterns
   */
  async smartWarmup(context = {}) {
    const {
      userPreferences = [],
      projectModels = [],
      recentlyUsed = [],
      triggerType = 'page_load'
    } = context;

    // Determine which models to warm up based on context
    const modelsToWarm = this.selectModelsForWarmup({
      userPreferences,
      projectModels,
      recentlyUsed,
      triggerType
    });

    logger.info(`Smart warmup triggered by ${triggerType}, warming ${modelsToWarm.length} models`);

    // Prioritize the list (most important models first)
    const prioritizedModels = this.prioritizeModels(modelsToWarm, context);

    return await this.warmupModels(prioritizedModels, 'normal');
  }

  /**
   * Select models for warm-up based on context
   */
  selectModelsForWarmup(context) {
    const { userPreferences, projectModels, recentlyUsed, triggerType } = context;
    const modelsToWarm = new Set();

    // Always include the default model
    modelsToWarm.add(this.defaultModel);

    // Add user's preferred models
    userPreferences.forEach(model => modelsToWarm.add(model));

    // Add project-specific models
    projectModels.forEach(model => modelsToWarm.add(model));

    // Add recently used models (if not too many)
    if (recentlyUsed.length <= 3) {
      recentlyUsed.forEach(model => modelsToWarm.add(model));
    }

    // Different strategies based on trigger type
    switch (triggerType) {
      case 'session_start':
        // On session start, be more aggressive
        break;
      case 'page_load':
        // On page load, moderate warm-up
        if (modelsToWarm.size > 2) {
          // Limit to top 2 models to avoid overwhelming the system
          return Array.from(modelsToWarm).slice(0, 2);
        }
        break;
      case 'model_switch':
        // When switching models, only warm the new one
        return recentlyUsed.slice(0, 1);
      default:
        break;
    }

    return Array.from(modelsToWarm);
  }

  /**
   * Prioritize models for warm-up
   */
  prioritizeModels(models, context) {
    const { recentlyUsed = [] } = context;

    // Priority order: recently used > default > others
    const prioritized = [];

    // First: Recently used models
    recentlyUsed.forEach(model => {
      if (models.includes(model) && !prioritized.includes(model)) {
        prioritized.push(model);
      }
    });

    // Second: Default model
    if (models.includes(this.defaultModel) && !prioritized.includes(this.defaultModel)) {
      prioritized.push(this.defaultModel);
    }

    // Third: All other models
    models.forEach(model => {
      if (!prioritized.includes(model)) {
        prioritized.push(model);
      }
    });

    return prioritized;
  }

  /**
   * Perform the actual warm-up for a model
   */
  async performWarmup(modelName) {
    const startTime = Date.now();

    try {
      // Add to warming queue
      this.warmupQueue.add(modelName);

      logger.info(`Starting warmup for model: ${modelName}`);

      // Get appropriate test prompt based on model size
      const testPrompt = this.getTestPrompt(modelName);

      // Warm up the model with a lightweight request
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: modelName,
        prompt: testPrompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent, fast responses
          max_tokens: 5,    // Very short response
          top_p: 0.9
        }
      }, {
        timeout: this.warmupTimeout
      });

      const duration = Date.now() - startTime;

      // Cache the warm-up result
      this.warmupCache.set(modelName, {
        warmedAt: Date.now(),
        duration: duration,
        success: true
      });

      logger.info(`Model ${modelName} warmed up successfully in ${duration}ms`);

      return {
        success: true,
        duration: duration,
        modelName: modelName
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.warn(`Model warmup failed for ${modelName}: ${error.message} (${duration}ms)`);

      // Cache the failure (but with shorter expiry)
      this.warmupCache.set(modelName, {
        warmedAt: Date.now(),
        duration: duration,
        success: false,
        error: error.message
      });

      return {
        success: false,
        duration: duration,
        modelName: modelName,
        error: error.message
      };

    } finally {
      // Remove from warming queue
      this.warmupQueue.delete(modelName);
    }
  }

  /**
   * Get appropriate test prompt based on model size
   */
  getTestPrompt(modelName) {
    const lowerName = modelName.toLowerCase();

    if (lowerName.includes('70b') || lowerName.includes('32b')) {
      return this.testPrompts.large;
    } else if (lowerName.includes('14b') || lowerName.includes('27b')) {
      return this.testPrompts.medium;
    } else {
      return this.testPrompts.small;
    }
  }

  /**
   * Clean up expired warm-up cache entries
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const expired = [];

    this.warmupCache.forEach((status, modelName) => {
      if ((now - status.warmedAt) > this.cacheExpiry) {
        expired.push(modelName);
      }
    });

    expired.forEach(modelName => {
      this.warmupCache.delete(modelName);
    });

    if (expired.length > 0) {
      logger.debug(`Cleaned up ${expired.length} expired warmup cache entries`);
    }
  }

  /**
   * Check if Ollama is available for warm-up operations
   */
  async isOllamaAvailable() {
    try {
      await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
      return true;
    } catch (error) {
      logger.warn(`Ollama not available for warmup: ${error.message}`);
      return false;
    }
  }

  /**
   * Get warm-up service health status
   */
  async getServiceHealth() {
    const ollamaAvailable = await this.isOllamaAvailable();
    const status = this.getWarmupStatus();

    return {
      service: 'Model Warm-up Service',
      available: ollamaAvailable,
      warmupQueue: this.warmupQueue.size,
      cachedModels: this.warmupCache.size,
      overallStatus: status.overallStatus,
      lastCleanup: new Date().toISOString(),
      config: {
        maxConcurrentWarmups: this.maxConcurrentWarmups,
        cacheExpiry: this.cacheExpiry / 1000 / 60, // in minutes
        warmupTimeout: this.warmupTimeout / 1000 // in seconds
      }
    };
  }
}

module.exports = ModelWarmupService;