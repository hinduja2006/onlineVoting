// db.js
require('dotenv').config(); // Load environment variables from .env
const mysql = require('mysql2');


const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER, 
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});


db.connect((err) => {
  if (err) {
    console.error('MySQL connection error:', err);
    process.exit(1); // Optional: Exit on failure
  }
  console.log('Connected to MySQL database!');
});

module.exports = db;
