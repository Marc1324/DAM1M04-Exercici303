const mysql = require('mysql2');

// Configura aquí les teves dades de MySQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',      
  password: 'P@ssw0rd', // Posa la contrasenya que hagis triat
  database: 'sakila',
  waitForConnections: true,
  connectionLimit: 10
  
});

module.exports = pool.promise();