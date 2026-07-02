import Database from 'better-sqlite3';

const dbPath = './database.sqlite';
const db = new Database(dbPath);

try {
  const estudantes = db.prepare('SELECT id, matricula FROM estudantes').all();
  let updatedCount = 0;

  const updateStmt = db.prepare('UPDATE estudantes SET matricula = ? WHERE id = ?');

  const updateProcess = db.transaction(() => {
    for (const est of estudantes) {
      if (est.matricula && est.matricula.length < 10) {
        const padded = est.matricula.padStart(10, '0');
        updateStmt.run(padded, est.id);
        updatedCount++;
      }
    }
  });

  updateProcess();
  console.log(`Padded ${updatedCount} existing matriculas.`);
} catch (err) {
  console.error('Error padding matriculas:', err);
  process.exit(1);
}
