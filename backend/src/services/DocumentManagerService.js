/**
 * Document Management Service
 * Enhanced document organization with folders and categories
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Document = require('../models/Document');
const DocumentType = require('../models/DocumentType');

class DocumentManagerService {
  constructor() {
    this.baseUploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
    this.documentModel = new Document();
    this.documentTypeModel = new DocumentType();

    this.initializeDirectories();
  }

  /**
   * Initialize directory structure using database document types
   */
  async initializeDirectories() {
    try {
      // Create base upload directory
      await fs.mkdir(this.baseUploadPath, { recursive: true });

      // Get document types from database
      const documentTypes = await this.documentTypeModel.listDocumentTypes({ is_active: true });

      // Create category directories and subfolders
      for (const docType of documentTypes) {
        const categoryPath = path.join(this.baseUploadPath, docType.key);
        await fs.mkdir(categoryPath, { recursive: true });

        // Create subfolders
        for (const subfolder of docType.subfolders || ['general']) {
          const subfolderPath = path.join(categoryPath, subfolder);
          await fs.mkdir(subfolderPath, { recursive: true });
        }
      }

      logger.info('Document directory structure initialized from database');
    } catch (error) {
      logger.error(`Error initializing directories: ${error.message}`);
      // Fallback: create basic structure
      await fs.mkdir(path.join(this.baseUploadPath, 'general'), { recursive: true });
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

      // Validate category using database
      const categoryConfig = await this.documentTypeModel.validateFileType(
        category,
        file.originalname,
        file.size
      );

      // For compatibility, map database structure to expected format
      categoryConfig.subfolders = categoryConfig.subfolders || ['general'];

      // Determine target directory
      let targetDir = path.join(this.baseUploadPath, category);

      // If projectName is provided, create project-specific folder
      if (projectName) {
        const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_\s]/g, '_');
        targetDir = path.join(targetDir, sanitizedProjectName);
      } else if (subfolder && categoryConfig.subfolders.includes(subfolder)) {
        targetDir = path.join(targetDir, subfolder);
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const basename = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileExt = path.parse(file.originalname).ext;
      const uniqueFilename = `${timestamp}_${basename}${fileExt}`;
      const targetPath = path.join(targetDir, uniqueFilename);

      // Ensure target directory exists
      await fs.mkdir(targetDir, { recursive: true });

      // Move file from temp location to target location (handle cross-device)
      try {
        await fs.rename(file.path, targetPath);
      } catch (error) {
        if (error.code === 'EXDEV') {
          // Cross-device link not permitted, use copy + unlink instead
          await fs.copyFile(file.path, targetPath);
          await fs.unlink(file.path);
        } else {
          throw error;
        }
      }

      // Read file content for metadata calculations
      const fileBuffer = await fs.readFile(targetPath);

      // Create document record in database
      const documentRecord = await this.documentModel.create({
        filename: uniqueFilename,
        originalName: file.originalname,
        path: targetPath,
        relativePath: path.relative(this.baseUploadPath, targetPath),
        category: category,
        subfolder: subfolder,
        projectName: projectName,
        size: file.size,
        mimeType: file.mimetype,
        extension: fileExt,
        tags: tags,
        description: description,
        uploadedBy: uploadedBy,
        metadata: {
          checksum: await this.calculateChecksum(fileBuffer),
          wordCount: this.estimateWordCount(fileBuffer, fileExt),
          pageCount: this.estimatePageCount(fileBuffer, fileExt)
        }
      });

      logger.info(`Document uploaded: ${uniqueFilename} to ${category}/${projectName || subfolder || 'root'}`);

      return documentRecord;

    } catch (error) {
      logger.error(`Error uploading document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload multiple documents
   */
  async uploadDocuments(files, documentType, subfolder, projectName, metadata = {}) {
    try {
      const results = [];

      for (const file of files) {
        const fileMetadata = {
          category: documentType,
          subfolder,
          projectName,
          ...metadata
        };

        const result = await this.uploadDocument(file, fileMetadata);
        results.push(result);
      }

      return results;
    } catch (error) {
      logger.error(`Error uploading documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * List documents by category and subfolder
   */
  async listDocuments(category = null, subfolder = null, projectName = null, filters = {}) {
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
        // Validate category using database
        const docType = await this.documentTypeModel.getDocumentTypeByKey(category);
        if (!docType) {
          throw new Error(`Invalid category: ${category}`);
        }
        searchPath = path.join(searchPath, category);

        // If projectName is provided, look in project-specific folder
        if (projectName) {
          const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_\s]/g, '_');
          searchPath = path.join(searchPath, sanitizedProjectName);
        } else if (subfolder) {
          if (!docType.subfolders.includes(subfolder)) {
            throw new Error(`Invalid subfolder: ${subfolder} for category: ${category}`);
          }
          searchPath = path.join(searchPath, subfolder);
        }
      }

      // Query database for documents
      const dbFilters = {
        category,
        subfolder: projectName ? undefined : subfolder, // Don't use subfolder if projectName is provided
        projectName,
        searchTerm,
        tags,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      };

      logger.info(`Querying database for documents with filters:`, dbFilters);
      const result = await this.documentModel.list(dbFilters, { limit, offset });
      logger.info(`Found ${result.documents.length} documents in database`);

      return result;

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
      // Use the DocumentType model's getDocumentStructure method
      return await this.documentTypeModel.getDocumentStructure();
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

      const categoryConfig = await this.documentTypeModel.getDocumentTypeByKey(newCategory);
      if (!categoryConfig) {
        throw new Error(`Invalid target category: ${newCategory}`);
      }

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
      const categoryConfig = await this.documentTypeModel.getDocumentTypeByKey(category);
      if (!categoryConfig) {
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
   * List all project folders
   */
  async listProjects(documentType = null) {
    try {
      const projects = [];

      if (documentType) {
        // List projects for specific document type
        const docType = await this.documentTypeModel.getDocumentTypeByKey(documentType);
        if (!docType) {
          throw new Error(`Invalid document type: ${documentType}`);
        }

        const categoryPath = path.join(this.baseUploadPath, documentType);
        try {
          const items = await fs.readdir(categoryPath, { withFileTypes: true });

          for (const item of items) {
            if (item.isDirectory() && !docType.subfolders.includes(item.name)) {
              // This is a project folder (not a predefined subfolder)
              const projectPath = path.join(categoryPath, item.name);
              const stats = await fs.stat(projectPath);

              // Try to read project metadata for accurate createdAt
              let createdAt = stats.birthtime;
              try {
                const metadataPath = path.join(projectPath, '_project.json');
                const metadataContent = await fs.readFile(metadataPath, 'utf8');
                const metadata = JSON.parse(metadataContent);
                if (metadata.createdAt) {
                  createdAt = metadata.createdAt;
                }
              } catch (err) {
                // Use filesystem time if metadata not found
                logger.debug(`No metadata found for project ${item.name}, using filesystem time`);
              }

              projects.push({
                name: item.name,
                path: projectPath,
                documentType: documentType,
                createdAt: createdAt,
                modifiedAt: stats.mtime
              });
            }
          }
        } catch (err) {
          // Category directory might not exist yet
          if (err.code !== 'ENOENT') {
            throw err;
          }
        }
      } else {
        // List projects across all document types
        const documentTypes = await this.documentTypeModel.listDocumentTypes({ is_active: true });

        for (const docType of documentTypes) {
          const categoryPath = path.join(this.baseUploadPath, docType.key);

          try {
            const items = await fs.readdir(categoryPath, { withFileTypes: true });

            for (const item of items) {
              if (item.isDirectory() && !docType.subfolders.includes(item.name)) {
                const projectPath = path.join(categoryPath, item.name);
                const stats = await fs.stat(projectPath);

                // Try to read project metadata for accurate createdAt
                let createdAt = stats.birthtime;
                try {
                  const metadataPath = path.join(projectPath, '_project.json');
                  const metadataContent = await fs.readFile(metadataPath, 'utf8');
                  const metadata = JSON.parse(metadataContent);
                  if (metadata.createdAt) {
                    createdAt = metadata.createdAt;
                  }
                } catch (err) {
                  // Use filesystem time if metadata not found
                  logger.debug(`No metadata found for project ${item.name}, using filesystem time`);
                }

                projects.push({
                  name: item.name,
                  path: projectPath,
                  documentType: docType.key,
                  createdAt: createdAt,
                  modifiedAt: stats.mtime
                });
              }
            }
          } catch (err) {
            // Category directory might not exist yet
            if (err.code !== 'ENOENT') {
              throw err;
            }
          }
        }
      }

      // Sort projects by modification time (newest first)
      projects.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

      return projects;
    } catch (error) {
      logger.error(`Error listing projects: ${error.message}`);
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
  async getDocumentTypes() {
    return await this.documentTypeModel.getDocumentStructure();
  }

  /**
   * Search across all documents
   */
  async searchDocuments(query, filters = {}) {
    try {
      const allDocuments = [];

      // Search in all categories
      const documentStructure = await this.documentTypeModel.getDocumentStructure();
      for (const categoryKey of Object.keys(documentStructure)) {
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

  /**
   * Extract text content from document based on file type
   */
  async extractDocumentText(filePath) {
    try {
      const extension = path.extname(filePath).toLowerCase();
      const buffer = await fs.readFile(filePath);

      logger.info(`Extracting text from ${extension} file: ${path.basename(filePath)}`);

      switch (extension) {
        case '.pdf':
          return await this.extractPdfText(buffer);

        case '.docx':
          return await this.extractDocxText(buffer);

        case '.doc':
          // Note: .doc files require additional parsing, for now return basic info
          return `Document: ${path.basename(filePath)}\n\nThis is a legacy .doc file. Please convert to .docx format for better text extraction.`;

        case '.txt':
          return buffer.toString('utf-8');

        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }
    } catch (error) {
      logger.error(`Error extracting text from ${filePath}: ${error.message}`);
      throw new Error(`Failed to extract text from document: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF using pdf-parse
   */
  async extractPdfText(buffer) {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      logger.error(`PDF parsing error: ${error.message}`);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX using mammoth
   */
  async extractDocxText(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value;
    } catch (error) {
      logger.error(`DOCX parsing error: ${error.message}`);
      throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
  }

  /**
   * Get document text content for reading pane and AI context
   */
  async getDocumentContent(documentType, projectTitle, documentName) {
    try {
      const normalizedDocumentType = documentType.toLowerCase();

      // Find the document in database by original name
      const documents = await this.documentModel.list({
        category: normalizedDocumentType,
        projectName: projectTitle
      }, { limit: 1000 });

      const document = documents.documents.find(doc =>
        doc.originalName === documentName || doc.filename === documentName
      );

      if (!document) {
        throw new Error(`Document not found: ${documentName}`);
      }

      // Use the actual stored file path from database
      const documentPath = document.path;
      logger.info(`Loading document from: ${documentPath}`);

      // Extract text content
      const textContent = await this.extractDocumentText(documentPath);

      // Get file stats for metadata
      const stats = await fs.stat(documentPath);

      return {
        content: textContent,
        metadata: {
          filename: documentName,
          documentType: documentType,
          projectTitle: projectTitle,
          size: stats.size,
          formattedSize: this.formatFileSize(stats.size),
          lastModified: stats.mtime,
          wordCount: this.countWords(textContent),
          extension: path.extname(documentName).toLowerCase()
        }
      };
    } catch (error) {
      logger.error(`Error getting document content: ${error.message}`);
      throw error;
    }
  }

  /**
   * Count words in text content
   */
  countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = DocumentManagerService;