const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Parses a PDF file and extracts its text content
 * @param {Buffer} buffer - The PDF file buffer
 * @returns {Promise<string>} The extracted text
 */
async function parsePDF(buffer) {
    try {
        const result = await pdfParse(buffer);
        return result.text;
    } catch (error) {
        throw new Error(`Error parsing PDF: ${error.message}`);
    }
}

/**
 * Parses a Word document and extracts its text content
 * @param {Buffer} buffer - The Word document buffer
 * @returns {Promise<string>} The extracted text
 */
async function parseWord(buffer) {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (error) {
        throw new Error(`Error parsing Word document: ${error.message}`);
    }
}

/**
 * Determines file type from filename and routes to appropriate parser
 * @param {Buffer} buffer - The file buffer to parse
 * @param {string} fileType - The file extension/type (pdf or docx)
 * @returns {Promise<string>} The extracted text
 */

async function parseDocument(buffer, fileType, filename = 'unknown') {
    const type = fileType.toLowerCase();
    
    if (!buffer) {
        throw new Error('No file buffer provided');
    }

    const validTypes = ['txt', 'pdf', 'docx', 'doc'];
    if (!validTypes.includes(type)) {
        throw new Error(`Unsupported file type: "${fileType}" (processed as "${type}") for file "${filename}". Supported types are: ${validTypes.join(', ')}`);
    }

    if (type === 'pdf') {
        return await parsePDF(buffer);
    } else if (type === 'docx' || type === 'doc') {
        return await parseWord(buffer);
    } else if (type === 'txt') {
        return buffer.toString('utf-8'); // Simple text file handling
    }
}

module.exports = {
    parsePDF,
    parseWord,
    parseDocument
};