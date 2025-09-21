/**
 * Document Management Service
 * Enhanced document organization with folders and categories
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class DocumentManagerService {
  constructor() {
    this.baseUploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
    this.documentTypes = {
      'solicitations': {
        name: 'Solicitations',
        description: 'RFPs, RFIs, Sources Sought, and other government solicitations',
        allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
        maxSize: 50 * 1024 * 1024, // 50MB
        subfolders: ['active', 'archived', 'drafts']
      },
      'past-performance': {
        name: 'Past Performance',
        description: 'Project documentation, case studies, and performance records',
        allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx'],
        maxSize: 100 * 1024 * 1024, // 100MB
        subfolders: ['federal', 'commercial', 'international', 'internal']
      },
      'proposals': {
        name: 'Proposals',
        description: 'Draft and final proposal documents',
        allowedExtensions: ['.pdf', '.doc', '.docx'],
        maxSize: 200 * 1024 * 1024, // 200MB
        subfolders: ['active', 'submitted', 'won', 'lost', 'templates']
      },
      'compliance': {
        name: 'Compliance Documents',
        description: 'Compliance certificates, audit reports, and regulatory documents',
        allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
        maxSize: 25 * 1024 * 1024, // 25MB
        subfolders: ['certificates', 'audits', 'policies', 'procedures']
      },
      'references': {
        name: 'Reference Materials',
        description: 'Templates, guidelines, and reference documents',
        allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx'],
        maxSize: 50 * 1024 * 1024, // 50MB
        subfolders: ['templates', 'guidelines', 'standards', 'training']
      },
      'media': {
        name: 'Media Files',
        description: 'Images, videos, and presentation materials',
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.ppt', '.pptx'],
        maxSize: 500 * 1024 * 1024, // 500MB
        subfolders: ['images', 'videos', 'presentations', 'graphics']
      }
    };

    this.initializeDirectories();
  }

  /**
   * Initialize directory structure
   */
  async initializeDirectories() {
    try {
      // Create base upload directory
      await fs.mkdir(this.baseUploadPath, { recursive: true });

      // Create category directories and subfolders
      for (const [categoryKey, category] of Object.entries(this.documentTypes)) {
        const categoryPath = path.join(this.baseUploadPath, categoryKey);
        await fs.mkdir(categoryPath, { recursive: true });

        // Create subfolders
        for (const subfolder of category.subfolders) {
          const subfolderPath = path.join(categoryPath, subfolder);
          await fs.mkdir(subfolderPath, { recursive: true });
        }
      }

      logger.info('Document directory structure initialized');
    } catch (error) {
      logger.error(`Error initializing directories: ${error.message}`);
    }
  }

  /**
   * Upload document to appropriate folder
   */
  async uploadDocument(file, metadata = {}) {
    try {
      const {
        category = 'references',
        subfolder = null,
        projectName = null,
        tags = [],
        description = '',
        uploadedBy = 'system'
      } = metadata;

      // Validate category
      if (!this.documentTypes[category]) {
        throw new Error(`Invalid document category: ${category}`);
      }

      const categoryConfig = this.documentTypes[category];

      // Validate file extension
      const fileExt = path.extname(file.originalname).toLowerCase();
      if (!categoryConfig.allowedExtensions.includes(fileExt)) {
        throw new Error(`File type ${fileExt} not allowed for ${category}. Allowed: ${categoryConfig.allowedExtensions.join(', ')}`);
      }

      // Validate file size
      if (file.size > categoryConfig.maxSize) {
        throw new Error(`File size exceeds limit for ${category}. Max: ${Math.round(categoryConfig.maxSize / 1024 / 1024)}MB`);
      }

      // Determine target directory
      let targetDir = path.join(this.baseUploadPath, category);
      if (subfolder && categoryConfig.subfolders.includes(subfolder)) {
        targetDir = path.join(targetDir, subfolder);
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const basename = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9-_]/g, '_');
      const uniqueFilename = `${timestamp}_${basename}${fileExt}`;
      const targetPath = path.join(targetDir, uniqueFilename);

      // Save file
      await fs.writeFile(targetPath, file.buffer);

      // Create document record
      const documentRecord = {
        id: this.generateDocumentId(),
        filename: uniqueFilename,
        originalName: file.originalname,
        path: targetPath,
        relativePath: path.relative(this.baseUploadPath, targetPath),
        category: category,
        subfolder: subfolder,
        size: file.size,
        mimeType: file.mimetype,
        extension: fileExt,
        projectName: projectName,
        tags: tags,
        description: description,
        uploadedBy: uploadedBy,
        uploadedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        downloadCount: 0,
        metadata: {
          checksum: await this.calculateChecksum(file.buffer),
          wordCount: this.estimateWordCount(file.buffer, fileExt),
          pageCount: this.estimatePageCount(file.buffer, fileExt)
        }
      };

      logger.info(`Document uploaded: ${uniqueFilename} to ${category}/${subfolder || 'root'}`);

      return documentRecord;

    } catch (error) {
      logger.error(`Error uploading document: ${error.message}`);
      throw error;
    }
  }

  /**
   * List documents by category and subfolder
   */
  async listDocuments(category = null, subfolder = null, filters = {}) {
    try {
      const {
        searchTerm = '',
        tags = [],
        dateFrom = null,
        dateTo = null,
        sortBy = 'uploadedAt',
        sortOrder = 'desc',
        limit = 50,
        offset = 0
      } = filters;

      let searchPath = this.baseUploadPath;
      if (category) {
        if (!this.documentTypes[category]) {
          throw new Error(`Invalid category: ${category}`);
        }
        searchPath = path.join(searchPath, category);

        if (subfolder) {
          if (!this.documentTypes[category].subfolders.includes(subfolder)) {
            throw new Error(`Invalid subfolder: ${subfolder} for category: ${category}`);
          }
          searchPath = path.join(searchPath, subfolder);
        }
      }

      const documents = await this.scanDirectory(searchPath, category, subfolder);

      // Apply filters
      let filteredDocs = documents;

      if (searchTerm) {
        filteredDocs = filteredDocs.filter(doc =>
          doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (doc.projectName && doc.projectName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      if (tags.length > 0) {
        filteredDocs = filteredDocs.filter(doc =>
          tags.some(tag => doc.tags.includes(tag))
        );
      }

      if (dateFrom) {
        filteredDocs = filteredDocs.filter(doc =>
          new Date(doc.uploadedAt) >= new Date(dateFrom)
        );
      }

      if (dateTo) {
        filteredDocs = filteredDocs.filter(doc =>
          new Date(doc.uploadedAt) <= new Date(dateTo)
        );
      }

      // Sort documents
      filteredDocs.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];

        if (sortBy.includes('At') || sortBy.includes('Date')) {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }

        if (sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        } else {
          return aVal > bVal ? 1 : -1;
        }
      });

      // Apply pagination
      const paginatedDocs = filteredDocs.slice(offset, offset + limit);

      return {
        documents: paginatedDocs,
        total: filteredDocs.length,
        offset: offset,
        limit: limit,
        hasMore: offset + limit < filteredDocs.length
      };

    } catch (error) {
      logger.error(`Error listing documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get document structure overview
   */
  async getDocumentStructure() {
    try {
      const structure = {};

      for (const [categoryKey, category] of Object.entries(this.documentTypes)) {
        const categoryPath = path.join(this.baseUploadPath, categoryKey);
        const categoryStats = await this.getDirectoryStats(categoryPath);

        structure[categoryKey] = {
          name: category.name,
          description: category.description,
          stats: categoryStats,
          subfolders: {}
        };

        // Get subfolder stats
        for (const subfolder of category.subfolders) {
          const subfolderPath = path.join(categoryPath, subfolder);
          const subfolderStats = await this.getDirectoryStats(subfolderPath);
          structure[categoryKey].subfolders[subfolder] = subfolderStats;
        }
      }

      return structure;

    } catch (error) {
      logger.error(`Error getting document structure: ${error.message}`);
      throw error;
    }
  }

  /**
   * Move document to different category/subfolder
   */
  async moveDocument(documentId, newCategory, newSubfolder = null) {
    try {
      // In a real implementation, this would update the database record
      // For now, we'll simulate the move operation

      if (!this.documentTypes[newCategory]) {
        throw new Error(`Invalid target category: ${newCategory}`);
      }

      const categoryConfig = this.documentTypes[newCategory];
      if (newSubfolder && !categoryConfig.subfolders.includes(newSubfolder)) {
        throw new Error(`Invalid target subfolder: ${newSubfolder}`);
      }

      logger.info(`Document ${documentId} moved to ${newCategory}/${newSubfolder || 'root'}`);

      return {
        documentId,
        newCategory,
        newSubfolder,
        movedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error moving document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId, documentPath) {
    try {
      const fullPath = path.join(this.baseUploadPath, documentPath);

      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch (error) {
        throw new Error('Document not found');
      }

      // Delete file
      await fs.unlink(fullPath);

      logger.info(`Document deleted: ${documentId}`);

      return {
        documentId,
        deletedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error deleting document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create project folder
   */
  async createProjectFolder(category, projectName, description = '') {
    try {
      if (!this.documentTypes[category]) {
        throw new Error(`Invalid category: ${category}`);
      }

      const sanitizedName = projectName.replace(/[^a-zA-Z0-9-_\s]/g, '_');
      const projectPath = path.join(this.baseUploadPath, category, sanitizedName);

      await fs.mkdir(projectPath, { recursive: true });

      // Create project metadata file
      const metadata = {
        name: projectName,
        description: description,
        createdAt: new Date().toISOString(),
        category: category,
        documents: []
      };

      await fs.writeFile(
        path.join(projectPath, '_project.json'),
        JSON.stringify(metadata, null, 2)
      );

      logger.info(`Project folder created: ${projectName} in ${category}`);

      return {
        projectName: sanitizedName,
        path: projectPath,
        metadata: metadata
      };

    } catch (error) {
      logger.error(`Error creating project folder: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scan directory for documents
   */
  async scanDirectory(dirPath, category = null, subfolder = null) {
    try {
      const documents = [];

      try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });

        for (const file of files) {
          if (file.isFile() && !file.name.startsWith('.') && !file.name.startsWith('_')) {
            const filePath = path.join(dirPath, file.name);
            const stats = await fs.stat(filePath);

            const doc = {
              id: this.generateDocumentId(),
              filename: file.name,
              originalName: file.name,
              path: filePath,
              relativePath: path.relative(this.baseUploadPath, filePath),
              category: category || 'unknown',
              subfolder: subfolder,
              size: stats.size,
              extension: path.extname(file.name).toLowerCase(),
              uploadedAt: stats.birthtime.toISOString(),
              lastModified: stats.mtime.toISOString(),
              tags: [],
              description: '',
              downloadCount: 0
            };

            documents.push(doc);
          }
        }
      } catch (error) {
        // Directory doesn't exist or is empty
        return [];
      }

      return documents;

    } catch (error) {
      logger.error(`Error scanning directory ${dirPath}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get directory statistics
   */
  async getDirectoryStats(dirPath) {
    try {
      let fileCount = 0;
      let totalSize = 0;
      let lastModified = null;

      try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });

        for (const file of files) {
          if (file.isFile() && !file.name.startsWith('.') && !file.name.startsWith('_')) {
            const filePath = path.join(dirPath, file.name);
            const stats = await fs.stat(filePath);

            fileCount++;
            totalSize += stats.size;

            if (!lastModified || stats.mtime > lastModified) {
              lastModified = stats.mtime;
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist
      }

      return {
        fileCount,
        totalSize,
        lastModified: lastModified ? lastModified.toISOString() : null,
        formattedSize: this.formatFileSize(totalSize)
      };

    } catch (error) {
      return {
        fileCount: 0,
        totalSize: 0,
        lastModified: null,
        formattedSize: '0 B'
      };
    }
  }

  /**
   * Helper methods
   */
  generateDocumentId() {
    return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async calculateChecksum(buffer) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  estimateWordCount(buffer, extension) {
    // Simple estimation - would be more sophisticated in production
    if (['.txt', '.md'].includes(extension)) {
      return buffer.toString().split(/\s+/).length;
    }
    return Math.floor(buffer.length / 6); // Rough estimate
  }

  estimatePageCount(buffer, extension) {
    // Simple estimation - would use proper document parsers in production
    if (extension === '.pdf') {
      return Math.ceil(buffer.length / 50000); // Rough estimate
    }
    return Math.ceil(buffer.length / 100000); // Very rough estimate
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get document categories and their configurations
   */
  getDocumentTypes() {
    return this.documentTypes;
  }

  /**
   * Search across all documents
   */
  async searchDocuments(query, filters = {}) {
    try {
      const allDocuments = [];

      // Search in all categories
      for (const categoryKey of Object.keys(this.documentTypes)) {
        const categoryDocs = await this.listDocuments(categoryKey, null, {
          searchTerm: query,
          ...filters,
          limit: 1000
        });
        allDocuments.push(...categoryDocs.documents);
      }

      // Sort by relevance (simple text matching score)
      allDocuments.sort((a, b) => {
        const aScore = this.calculateRelevanceScore(a, query);
        const bScore = this.calculateRelevanceScore(b, query);
        return bScore - aScore;
      });

      return {
        documents: allDocuments.slice(0, filters.limit || 50),
        total: allDocuments.length,
        query: query
      };

    } catch (error) {
      logger.error(`Error searching documents: ${error.message}`);
      throw error;
    }
  }

  calculateRelevanceScore(document, query) {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Title match (highest weight)
    if (document.originalName.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Description match
    if (document.description && document.description.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // Project name match
    if (document.projectName && document.projectName.toLowerCase().includes(queryLower)) {
      score += 3;
    }

    // Tag match
    if (document.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
      score += 2;
    }

    return score;
  }
}

module.exports = DocumentManagerService;