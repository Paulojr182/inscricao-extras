const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('--- Inspecting Laura ---');
const lauraDb = db.prepare("SELECT * FROM estudantes WHERE nome LIKE '%LAURA MIRANDA%'").all();
console.log('Estudantes matching Laura in DB:', lauraDb);
