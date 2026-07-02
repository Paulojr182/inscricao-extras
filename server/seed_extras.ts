import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'database.sqlite');

const db = new Database(DB_PATH);

const grupos = {
  'Centro Cultural Santa Catarina': [
    'Bateria', 'Danças Urbanas', 'Flauta Doce', 'Flauta Pífaro',
    'Flauta Transversa', 'Guitarra', 'Musicalização Instrumental',
    'Piano', 'Teatro', 'Teclado', 'Violão', 'Violino'
  ],
  'Language School': [
    'Tiny Talkers', 'English Explorers'
  ],
  'Santa Esportes': [
    'Ballet', 'Capoeira', 'Futsal', 'Handebol', 'Karatê', 'Voleibol', 'Xadrez'
  ]
};

function seed() {
  console.log('--- Iniciando Semeadura de Atividades Extracurriculares (Hierarquia de Datas) ---');

  // Limpar tabelas antigas se necessário e garantir que as novas existam
  db.exec(`
    DROP TABLE IF EXISTS atividades;
    DROP TABLE IF EXISTS turmas_atividades;
    DROP TABLE IF EXISTS periodos;
    DROP TABLE IF EXISTS periodos_grupos;
    DROP TABLE IF EXISTS inscricoes;

    CREATE TABLE atividades (
      id TEXT PRIMARY KEY,
      nome TEXT,
      grupo TEXT,
      dataInicio TEXT,
      dataFim TEXT,
      status TEXT
    );

    CREATE TABLE turmas_atividades (
      id TEXT PRIMARY KEY,
      atividadeId TEXT,
      nome TEXT,
      diasSemana TEXT,
      horarioInicio TEXT,
      horarioFim TEXT,
      seriesPermitidas TEXT,
      nivel TEXT,
      vagas INTEGER,
      status TEXT
    );

    CREATE TABLE inscricoes (
      id TEXT PRIMARY KEY,
      estudanteId TEXT,
      turmaAtividadeId TEXT,
      data TEXT,
      nomeAluno TEXT,
      matricula TEXT,
      turma TEXT,
      nomeCurso TEXT
    );

    CREATE TABLE periodos (
      id TEXT PRIMARY KEY,
      dataInicio TEXT,
      dataFim TEXT,
      status TEXT
    );

    CREATE TABLE periodos_grupos (
      grupo TEXT PRIMARY KEY,
      dataInicio TEXT,
      dataFim TEXT,
      status TEXT
    );
  `);

  // 1. Inserir Período Geral Ativo por Padrão
  const stmtPeriodo = db.prepare('INSERT INTO periodos (id, dataInicio, dataFim, status) VALUES (?, ?, ?, ?)');
  stmtPeriodo.run('geral', '2026-01-01T00:00', '2026-12-31T23:59', 'aberto');

  // 2. Inserir Período por Grupo (Exemplos da Solicitação)
  const stmtGrupo = db.prepare('INSERT INTO periodos_grupos (grupo, dataInicio, dataFim, status) VALUES (?, ?, ?, ?)');
  stmtGrupo.run('Centro Cultural Santa Catarina', '2026-02-01T08:00', '2026-12-15T23:59', 'aberto');
  stmtGrupo.run('Language School', '2026-02-05T08:00', '2026-12-15T23:59', 'aberto');
  stmtGrupo.run('Santa Esportes', '2026-02-10T08:00', '2026-12-15T23:59', 'aberto');

  // 3. Inserir Atividades e Turmas
  const stmtAtividade = db.prepare('INSERT INTO atividades (id, nome, grupo, dataInicio, dataFim, status) VALUES (?, ?, ?, ?, ?, ?)');
  const stmtTurma = db.prepare(`
    INSERT INTO turmas_atividades (id, atividadeId, nome, diasSemana, horarioInicio, horarioFim, seriesPermitidas, nivel, vagas, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let countAtividades = 0;
  let countTurmas = 0;

  for (const [grupo, listaAtividades] of Object.entries(grupos)) {
    for (const nomeAtividade of listaAtividades) {
      const atividadeId = `act_${nomeAtividade.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      
      // Default activity dates (from Feb to Dec)
      let actStart = '2026-02-01T08:00';
      if (nomeAtividade === 'Violão') {
        actStart = '2026-02-10T08:00';
      } else if (nomeAtividade === 'Futsal') {
        actStart = '2026-02-20T08:00';
      }

      stmtAtividade.run(
        atividadeId, 
        nomeAtividade, 
        grupo, 
        actStart, 
        '2026-12-15T23:59', 
        'aberto'
      );
      countAtividades++;

      // Criar turmas de teste
      if (nomeAtividade === 'Bateria') {
        stmtTurma.run(
          'turma_bateria_a',
          atividadeId,
          'Turma A',
          JSON.stringify(['Sexta-feira']),
          '13:00',
          '13:50',
          JSON.stringify(['6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série', '2ª Série', '3ª Série']),
          'Iniciante',
          10,
          'Ativa'
        );
        stmtTurma.run(
          'turma_bateria_b',
          atividadeId,
          'Turma B',
          JSON.stringify(['Sexta-feira']),
          '13:50',
          '14:40',
          JSON.stringify(['6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série', '2ª Série', '3ª Série']),
          'Intermediário',
          10,
          'Ativa'
        );
        countTurmas += 2;
      } else if (nomeAtividade === 'Violão') {
        stmtTurma.run(
          'turma_violao_a',
          atividadeId,
          'Turma A',
          JSON.stringify(['Segunda-feira']),
          '18:30',
          '19:20',
          JSON.stringify(['6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série', '2ª Série', '3ª Série']),
          'Iniciante',
          8,
          'Ativa'
        );
        countTurmas++;
      } else if (nomeAtividade === 'Karatê') {
        stmtTurma.run(
          'turma_karate_a',
          atividadeId,
          'Turma A',
          JSON.stringify(['Segunda-feira']),
          '18:30',
          '19:20',
          JSON.stringify(['6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série', '2ª Série', '3ª Série']),
          'Todos os níveis',
          15,
          'Ativa'
        );
        countTurmas++;
      } else if (nomeAtividade === 'Ballet') {
        stmtTurma.run(
          'turma_ballet_infantil',
          atividadeId,
          'Ballet Infantil',
          JSON.stringify(['Terça-feira']),
          '14:00',
          '15:00',
          JSON.stringify(['6º Ano', '7º Ano', '8º Ano']),
          'Básico',
          12,
          'Ativa'
        );
        countTurmas++;
      } else if (nomeAtividade === 'Futsal') {
        stmtTurma.run(
          'turma_futsal_a',
          atividadeId,
          'Futsal A',
          JSON.stringify(['Segunda-feira', 'Quarta-feira']),
          '15:00',
          '16:30',
          JSON.stringify(['6º Ano', '7º Ano', '8º Ano']),
          'Misto',
          20,
          'Ativa'
        );
        countTurmas++;
      } else {
        // Criar uma turma padrão simplificada
        stmtTurma.run(
          `turma_${atividadeId}_padrao`,
          atividadeId,
          'Turma Única',
          JSON.stringify(['Quinta-feira']),
          '14:00',
          '15:30',
          JSON.stringify(['6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série', '2ª Série', '3ª Série']),
          'Geral',
          15,
          'Ativa'
        );
        countTurmas++;
      }
    }
  }

  console.log(`Semeadura concluída! Semeado: ${countAtividades} atividades e ${countTurmas} turmas.`);
  process.exit(0);
}

seed();
