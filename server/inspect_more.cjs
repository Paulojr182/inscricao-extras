const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

const studentsToCheck = [
  'Leticia Righetti Furlani',
  'Lara Eberle Vasconcellos',
  'Laís Moraes Dutra Lopes',
  'Leandro Castro Viana',
  'Lucas Vieira Marques Carvalho',
  'Lucca Leonel Bellosi'
];

console.log('--- Inspecting Students ---');
for (const student of studentsToCheck) {
  const cleanName = student.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  const dbMatch = db.prepare("SELECT * FROM estudantes WHERE nome LIKE ?").all(`%${student.split(' ')[0]}%`);
  console.log(`\nMatches for "${student}":`);
  dbMatch.forEach(s => {
    console.log(`- DB Name: "${s.nome}" | DB Matricula: "${s.matricula}"`);
  });
}
