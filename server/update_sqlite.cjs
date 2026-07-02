const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

db.prepare("UPDATE cursos SET categoria = 'EFAF' WHERE categoria = 'EFAI'").run();
db.prepare("UPDATE periodos SET categoria = 'EFAF' WHERE categoria = 'EFAI'").run();
db.prepare("UPDATE turmas SET categoria = 'EFAF' WHERE categoria = 'EFAI'").run();

console.log('EFAI:', db.prepare('SELECT count(*) as c FROM cursos WHERE categoria = ?').get('EFAI').c);
console.log('EFAF:', db.prepare('SELECT count(*) as c FROM cursos WHERE categoria = ?').get('EFAF').c);
console.log('SQLite atualizado com sucesso.');
