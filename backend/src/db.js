const pgp = require('pg-promise')();

// Database connection configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'poker_tournament',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
};

// Create the database instance
const db = pgp(config);

// Test the connection
db.connect()
  .then(obj => {
    console.log('Database connection successful');
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.error('ERROR:', error.message || error);
  });

module.exports = db; 