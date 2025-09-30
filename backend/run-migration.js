/**
 * Simple migration runner for global prompt configuration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'govai',
  user: process.env.DB_USER || 'govaiuser',
  password: process.env.DB_PASSWORD || 'devpass123'
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Running migration: 006_create_global_prompt_config.sql');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '006_create_global_prompt_config.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('Created tables:');
    console.log('  - global_prompt_config');
    console.log('  - global_prompt_config_history');
    console.log('Inserted default configuration.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration process complete.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = runMigration;