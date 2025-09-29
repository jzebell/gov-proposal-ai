/**
 * Debug the API endpoint
 */
const DocumentManagerService = require('./src/services/DocumentManagerService');

async function debugAPI() {
  try {
    console.log('Testing DocumentManagerService...');

    const documentManager = new DocumentManagerService();

    console.log('DocumentManager created, testing getDocumentStructure...');
    const structure = await documentManager.getDocumentStructure();

    console.log('Structure from DocumentManager:', JSON.stringify(structure, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error in debug API:', error);
    process.exit(1);
  }
}

debugAPI();