/**
 * Quick script to reset document types and force reseeding
 */
const DocumentType = require('./src/models/DocumentType');

async function resetDocumentTypes() {
  try {
    console.log('Resetting document types...');

    const documentTypeModel = new DocumentType();

    // Delete all document type metadata and types
    await documentTypeModel.pool.query('DELETE FROM document_type_metadata');
    await documentTypeModel.pool.query('DELETE FROM document_types');

    console.log('Cleared existing document types');

    // Force reseeding by calling seedDefaultDocumentTypes
    await documentTypeModel.seedDefaultDocumentTypes();

    console.log('Document types reset and reseeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting document types:', error);
    process.exit(1);
  }
}

resetDocumentTypes();