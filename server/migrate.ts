import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(__dirname, 'database.sqlite');

const db = new Database(DB_PATH);

async function migrate() {
  console.log('--- Iniciando Migração JSON -> SQLite ---');

  // 1. Criar Tabelas
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      email TEXT,
      senha TEXT,
      tipo TEXT,
      estudanteId TEXT,
      permissoes TEXT
    );

    CREATE TABLE IF NOT EXISTS estudantes (
      id TEXT PRIMARY KEY,
      nome TEXT,
      matricula TEXT,
      email TEXT,
      turno TEXT,
      serie TEXT,
      turma TEXT,
      codigoTurma TEXT
    );

    CREATE TABLE IF NOT EXISTS cursos (
      id TEXT PRIMARY KEY,
      nome TEXT,
      categoria TEXT,
      turmaId TEXT,
      serie TEXT,
      vagas INTEGER,
      status TEXT,
      vagasOcupadas INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inscricoes (
      id TEXT PRIMARY KEY,
      estudanteId TEXT,
      cursoId TEXT,
      trimestre INTEGER,
      data TEXT,
      nomeAluno TEXT,
      matricula TEXT,
      turma TEXT,
      nomeCurso TEXT
    );

    CREATE TABLE IF NOT EXISTS periodos (
      trimestre INTEGER,
      categoria TEXT,
      dataInicio TEXT,
      dataFim TEXT,
      PRIMARY KEY (trimestre, categoria)
    );

    CREATE TABLE IF NOT EXISTS turmas (
      id TEXT PRIMARY KEY,
      nome TEXT,
      categoria TEXT
    );
  `);

  const collections = ['usuarios', 'estudantes', 'cursos', 'inscricoes', 'periodos', 'turmas'];

  for (const col of collections) {
    const filePath = path.join(DATA_DIR, `${col}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`Pulando ${col}: arquivo não encontrado.`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`Pulando ${col}: sem dados para migrar.`);
      continue;
    }

    console.log(`Migrando ${data.length} registros para a tabela "${col}"...`);

    // Get ALL unique keys present across all objects in this collection
    const allKeys = new Set<string>();
    data.forEach(obj => {
      Object.keys(obj).forEach(k => allKeys.add(k));
    });
    const keys = Array.from(allKeys);
    
    console.log(`Migrando ${data.length} registros para a tabela "${col}" (Colunas: ${keys.join(', ')})...`);

    const placeholders = keys.map(() => '?').join(',');
    const stmt = db.prepare(`INSERT OR REPLACE INTO ${col} (${keys.join(',')}) VALUES (${placeholders})`);

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        const values = keys.map(k => {
          const val = item[k] ?? null; // Handle missing keys with null
          return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
        });
        stmt.run(...values);
      }
    });

    insertMany(data);
  }

  console.log('--- Migração Concluída com Sucesso! ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Falha na migração:', err);
  process.exit(1);
});
