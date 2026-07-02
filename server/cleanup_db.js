import Database from 'better-sqlite3';

const dbPath = './database.sqlite';
const db = new Database(dbPath);

try {
  // 1. Get IDs of students to delete (1º to 5º Ano)
  const studentsToDelete = db.prepare("SELECT id FROM estudantes WHERE serie IN ('1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano')").all();
  const ids = studentsToDelete.map(s => s.id);

  if (ids.length === 0) {
    console.log('No students found for 1º to 5º Ano.');
  } else {
    console.log(`Found ${ids.length} students to delete.`);

    // 2. Begin transaction
    const deleteProcess = db.transaction(() => {
      const delInscricoes = db.prepare('DELETE FROM inscricoes WHERE estudanteId = ?');
      const delUsers = db.prepare('DELETE FROM usuarios WHERE estudanteId = ?');
      const delStudents = db.prepare('DELETE FROM estudantes WHERE id = ?');

      for (const id of ids) {
        delInscricoes.run(id);
        delUsers.run(id);
        delStudents.run(id);
      }
    });

    deleteProcess();
    console.log('Cleanup completed successfully.');
  }
} catch (err) {
  console.error('Error during cleanup:', err);
  process.exit(1);
}
