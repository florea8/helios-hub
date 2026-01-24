const Database = require('better-sqlite3');
const db = new Database('./helios.db');

module.exports = db;
