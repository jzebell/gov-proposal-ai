/**
 * Database Initialization Script
 * Creates necessary tables and indexes
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
  });

  try {
    console.log('Connecting to database...');

    // Read and execute schema file
    const schemaPath = path.join(__dirname, '../schema/create_documents_table.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Creating documents table...');
    await pool.query(schema);

    console.log('✅ Database initialization completed successfully');

    // Test the connection
    const result = await pool.query('SELECT COUNT(*) FROM documents');
    console.log(`📄 Documents table ready (${result.rows[0].count} records)`);

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;