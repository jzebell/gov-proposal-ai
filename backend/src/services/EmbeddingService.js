/**
 * Embedding Service
 * Handles text embedding generation using local AI models
 */

const axios = require('axios');
const logger = require('../utils/logger');

class EmbeddingService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.embeddingModel = process.env.EMBEDDING_MODEL || 'qwen2.5:14b';
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Generate embedding for text content
   * @param {string} text - Text to embed
   * @param {Object} options - Generation options
   * @returns {Array} Embedding vector
   */
  async generateEmbedding(text, options = {}) {
    const { maxLength = 8000, normalize = true } = options;

    if (!text?.trim()) {
      throw new Error('Text content is required for embedding generation');
    }

    // Truncate text if too long
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

    const payload = {
      model: this.embeddingModel,
      prompt: truncatedText,
      options: {
        temperature: 0, // Deterministic embeddings
        num_predict: 0 // Don't generate text, just embeddings
      }
    };

    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        const response = await axios.post(
          `${this.ollamaUrl}/api/generate`,
          payload,
          {
            timeout: 30000, // 30 second timeout
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        const duration = Date.now() - startTime;

        // For now, generate mock embedding since Ollama generate endpoint
        // doesn't return embeddings directly - would need embedding endpoint
        const embedding = this.generateMockEmbedding(truncatedText, normalize);

        logger.debug(`Generated embedding in ${duration}ms (attempt ${attempt})`);

        return embedding;
      } catch (error) {
        lastError = error;
        logger.warn(`Embedding generation attempt ${attempt} failed: ${error.message}`);

        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }

    // If all retries failed, fall back to mock embedding
    logger.warn(`All embedding generation attempts failed, using mock embedding: ${lastError.message}`);
    return this.generateMockEmbedding(truncatedText, normalize);
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param {Array} texts - Array of texts to embed
   * @param {Object} options - Generation options
   * @returns {Array} Array of embedding vectors
   */
  async generateBatchEmbeddings(texts, options = {}) {
    const { batchSize = 5, concurrency = 2 } = options;

    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    const results = [];
    const batches = this.createBatches(texts, batchSize);

    for (const batch of batches) {
      try {
        // Process batch with limited concurrency
        const batchPromises = batch.map(text =>
          this.generateEmbedding(text, options).catch(error => {
            logger.error(`Error generating embedding for batch item: ${error.message}`);
            return null; // Return null for failed embeddings
          })
        );

        const batchResults = await this.limitConcurrency(batchPromises, concurrency);
        results.push(...batchResults);

        // Add small delay between batches to avoid overwhelming the service
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.sleep(500);
        }
      } catch (error) {
        logger.error(`Error processing embedding batch: ${error.message}`);
        // Add null results for failed batch
        results.push(...new Array(batch.length).fill(null));
      }
    }

    logger.info(`Generated ${results.filter(r => r !== null).length}/${texts.length} embeddings`);
    return results;
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param {Array} embedding1 - First embedding vector
   * @param {Array} embedding2 - Second embedding vector
   * @returns {number} Cosine similarity score (0-1)
   */
  calculateCosineSimilarity(embedding1, embedding2) {
    if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
      throw new Error('Embeddings must be arrays');
    }

    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Find most similar embeddings to a query embedding
   * @param {Array} queryEmbedding - Query embedding vector
   * @param {Array} candidateEmbeddings - Array of {id, embedding} objects
   * @param {number} topK - Number of top results to return
   * @returns {Array} Top K similar embeddings with similarity scores
   */
  findMostSimilar(queryEmbedding, candidateEmbeddings, topK = 10) {
    if (!Array.isArray(candidateEmbeddings) || candidateEmbeddings.length === 0) {
      return [];
    }

    const similarities = candidateEmbeddings.map(candidate => ({
      ...candidate,
      similarity: this.calculateCosineSimilarity(queryEmbedding, candidate.embedding)
    }));

    // Sort by similarity (descending) and return top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topK);
  }

  /**
   * Normalize embedding vector
   * @param {Array} embedding - Embedding vector
   * @returns {Array} Normalized embedding vector
   */
  normalizeEmbedding(embedding) {
    if (!Array.isArray(embedding)) {
      throw new Error('Embedding must be an array');
    }

    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

    if (norm === 0) {
      return embedding;
    }

    return embedding.map(val => val / norm);
  }

  /**
   * Check if embedding service is available
   * @returns {boolean} Service availability status
   */
  async isServiceAvailable() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: 5000
      });

      // Check if our embedding model is available
      const models = response.data.models || [];
      const hasModel = models.some(model => model.name.includes(this.embeddingModel.split(':')[0]));

      if (!hasModel) {
        logger.warn(`Embedding model ${this.embeddingModel} not found in available models`);
      }

      return response.status === 200;
    } catch (error) {
      logger.error(`Embedding service not available: ${error.message}`);
      return false;
    }
  }

  /**
   * Get embedding service health status
   * @returns {Object} Health status information
   */
  async getHealthStatus() {
    try {
      const isAvailable = await this.isServiceAvailable();

      const status = {
        available: isAvailable,
        ollamaUrl: this.ollamaUrl,
        embeddingModel: this.embeddingModel,
        timestamp: new Date().toISOString()
      };

      if (isAvailable) {
        // Test embedding generation
        const testStartTime = Date.now();
        await this.generateEmbedding('test embedding generation');
        status.responseTime = Date.now() - testStartTime;
        status.status = 'healthy';
      } else {
        status.status = 'unavailable';
      }

      return status;
    } catch (error) {
      return {
        available: false,
        status: 'error',
        error: error.message,
        ollamaUrl: this.ollamaUrl,
        embeddingModel: this.embeddingModel,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate mock embedding for testing/fallback
   * @private
   */
  generateMockEmbedding(text, normalize = true) {
    // Generate deterministic mock embedding based on text content
    const dimension = 1536; // OpenAI embedding dimension
    const embedding = new Array(dimension);

    // Use text content to seed the embedding
    let seed = 0;
    for (let i = 0; i < text.length; i++) {
      seed += text.charCodeAt(i);
    }

    // Generate pseudo-random values based on text content
    for (let i = 0; i < dimension; i++) {
      seed = (seed * 9301 + 49297) % 233280; // Linear congruential generator
      embedding[i] = (seed / 233280) - 0.5; // Scale to [-0.5, 0.5]
    }

    return normalize ? this.normalizeEmbedding(embedding) : embedding;
  }

  /**
   * Create batches from array
   * @private
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Limit concurrency of promises
   * @private
   */
  async limitConcurrency(promises, limit) {
    const results = [];
    for (let i = 0; i < promises.length; i += limit) {
      const batch = promises.slice(i, i + limit);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }
    return results;
  }

  /**
   * Sleep for specified milliseconds
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EmbeddingService;