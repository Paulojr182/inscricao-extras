const Database = require('./node_modules/better-sqlite3');
const db = new Database('./database.sqlite');
const admins = db.prepare('SELECT * FROM usuarios WHERE tipo = ?').all('admin');
console.log(JSON.stringify(admins, null, 2));
