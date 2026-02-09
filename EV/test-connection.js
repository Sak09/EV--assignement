require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'fleet_platform',
});

async function testConnection() {
  try {
    await client.connect();
    console.log('Database connection successful!');
    const result = await client.query('SELECT NOW()');
    console.log('Database time:', result.rows[0].now);
    await client.end();
  } catch (error) {
    console.error('Database connection failed:');
    console.error(error.message);
    console.log('\nPlease check:');
    console.log('1. PostgreSQL is running');
    console.log('2. Database "fleet_platform" exists');
    console.log('3. Credentials in .env file are correct');
    process.exit(1);
  }
}

testConnection();
