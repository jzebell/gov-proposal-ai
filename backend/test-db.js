const { Pool } = require('pg');

const pool = new Pool({
  connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

pool.query('SELECT COUNT(*) FROM documents')
  .then(result => {
    console.log('✅ Database connection successful');
    console.log('📄 Documents count:', result.rows[0].count);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  });