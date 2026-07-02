const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

// Incluindo todas as séries até o 5º Ano.
// Se você quiser excluir o 6º Ano também, basta adicionar '6º Ano' na lista abaixo.
const seriesToDelete = [
  'Infantil 2', 'Infantil 3', 'Infantil 4', 'Infantil 5',
  '1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'
];

const placeholders = seriesToDelete.map(() => '?').join(',');
const estudantesIds = db.prepare(`SELECT id FROM estudantes WHERE serie IN (${placeholders})`).all(...seriesToDelete).map(row => row.id);

if (estudantesIds.length > 0) {
  const BATCH_SIZE = 500;
  let totalInscricoes = 0;
  let totalUsuarios = 0;
  
  for (let i = 0; i < estudantesIds.length; i += BATCH_SIZE) {
    const batch = estudantesIds.slice(i, i + BATCH_SIZE);
    const idPlaceholders = batch.map(() => '?').join(',');
    
    totalInscricoes += db.prepare(`DELETE FROM inscricoes WHERE estudanteId IN (${idPlaceholders})`).run(...batch).changes;
    totalUsuarios += db.prepare(`DELETE FROM usuarios WHERE estudanteId IN (${idPlaceholders})`).run(...batch).changes;
    db.prepare(`DELETE FROM estudantes WHERE id IN (${idPlaceholders})`).run(...batch);
  }
  
  console.log(`Excluídos ${estudantesIds.length} estudantes (Infantil ao 5º Ano).`);
  console.log(`Excluídas ${totalInscricoes} inscrições relacionadas.`);
  console.log(`Excluídos ${totalUsuarios} contas de usuários de acesso relacionadas.`);
} else {
  console.log('Nenhum estudante encontrado nessas séries.');
}
