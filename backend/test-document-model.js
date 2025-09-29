const Document = require('./src/models/Document');

async function testDocumentModel() {
  try {
    const doc = new Document();
    console.log('Testing Document model...');

    const result = await doc.list({
      category: 'solicitations',
      projectName: 'AI Writing Test Project'
    }, { limit: 10, offset: 0 });

    console.log('✅ Success:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

testDocumentModel();