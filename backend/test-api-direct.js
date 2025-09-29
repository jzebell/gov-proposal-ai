/**
 * Test the API route directly
 */
const express = require('express');
const DocumentManagerService = require('./src/services/DocumentManagerService');

async function testAPIDirect() {
  try {
    console.log('Testing API route directly...');

    const documentManager = new DocumentManagerService();

    console.log('DocumentManager created');

    // Call the same method the route calls
    console.log('Calling getDocumentStructure...');
    const structure = await documentManager.getDocumentStructure();

    console.log('Structure result:', JSON.stringify(structure, null, 2));

    console.log('Response would be:', JSON.stringify({
      success: true,
      data: structure
    }, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error in test API direct:', error);
    process.exit(1);
  }
}

testAPIDirect();