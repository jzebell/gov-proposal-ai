/**
 * Test document structure retrieval
 */
const DocumentType = require('./src/models/DocumentType');

async function testDocumentStructure() {
  try {
    console.log('Testing document structure...');

    const documentTypeModel = new DocumentType();

    // Test listDocumentTypes
    console.log('Testing listDocumentTypes...');
    const documentTypes = await documentTypeModel.listDocumentTypes({ is_active: true });
    console.log(`Found ${documentTypes.length} document types`);

    // Test getDocumentStructure
    console.log('Testing getDocumentStructure...');
    const structure = await documentTypeModel.getDocumentStructure();
    console.log('Document structure:', JSON.stringify(structure, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error testing document structure:', error);
    process.exit(1);
  }
}

testDocumentStructure();