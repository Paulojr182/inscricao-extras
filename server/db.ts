import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH || path.join(__dirname, "database.sqlite");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Schema Initialization (Same as migration script for safety)
export async function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      email TEXT,
      senha TEXT,
      tipo TEXT,
      estudanteId TEXT,
      permissoes TEXT,
      grupoAdmin TEXT,
      nome TEXT,
      isProfessor INTEGER,
      turmaIds TEXT
    );
  `);
  for (const column of ["grupoAdmin TEXT", "nome TEXT", "isProfessor INTEGER", "turmaIds TEXT"]) {
    try { db.prepare(`ALTER TABLE usuarios ADD COLUMN ${column}`).run(); } catch (_) {}
  }
  db.exec(`

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

    CREATE TABLE IF NOT EXISTS atividades (
      id TEXT PRIMARY KEY,
      nome TEXT,
      grupo TEXT,
      dataInicio TEXT,
      dataFim TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS turmas_atividades (
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

    CREATE TABLE IF NOT EXISTS inscricoes (
      id TEXT PRIMARY KEY,
      estudanteId TEXT,
      turmaAtividadeId TEXT,
      data TEXT,
      nomeAluno TEXT,
      matricula TEXT,
      turma TEXT,
      nomeCurso TEXT
    );

    CREATE TABLE IF NOT EXISTS periodos (
      id TEXT PRIMARY KEY,
      dataInicio TEXT,
      dataFim TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS periodos_grupos (
      grupo TEXT PRIMARY KEY,
      dataInicio TEXT,
      dataFim TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS boletins (
      id TEXT PRIMARY KEY,
      turmaId TEXT NOT NULL,
      estudanteId TEXT NOT NULL,
      professor TEXT NOT NULL,
      midTerm REAL NOT NULL,
      endOfTerm REAL NOT NULL,
      listening REAL NOT NULL,
      speaking REAL NOT NULL,
      performance REAL NOT NULL,
      comentario TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('rascunho', 'finalizado')),
      criadoEm TEXT NOT NULL,
      atualizadoEm TEXT NOT NULL,
      UNIQUE(turmaId, estudanteId)
    );

    CREATE TABLE IF NOT EXISTS sessoes_admin (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      expiresAt INTEGER NOT NULL
    );
  `);
  console.log("SQLite Database ready.");
}

export async function readCollection<T>(name: string): Promise<T[]> {
  try {
    const rows = db.prepare(`SELECT * FROM ${name}`).all();

    // Convert back JSON strings to objects (like permissions)
    return rows.map((row: any) => {
      const newRow = { ...row };
      if ('isProfessor' in newRow) newRow.isProfessor = !!newRow.isProfessor;
      for (const [key, value] of Object.entries(newRow)) {
        if (
          typeof value === "string" &&
          (value.startsWith("[") || value.startsWith("{"))
        ) {
          try {
            (newRow as any)[key] = JSON.parse(value);
          } catch (e) {
            // Not a JSON string, leave as is
          }
        }
      }
      return newRow;
    }) as T[];
  } catch (err) {
    console.error(`Error reading collection ${name}:`, err);
    return [];
  }
}

export async function writeCollection<T>(
  name: string,
  data: T[],
): Promise<void> {
  const transaction = db.transaction((items: T[]) => {
    // Mimics the JSON overwrite behavior
    db.prepare(`DELETE FROM ${name}`).run();

    if (items.length === 0) return;

    const keys = [...new Set(items.flatMap(item => Object.keys(item as object)))];
    const placeholders = keys.map(() => "?").join(",");
    const stmt = db.prepare(
      `INSERT INTO ${name} (${keys.join(",")}) VALUES (${placeholders})`,
    );

    for (const item of items) {
      const values = keys.map((k) => {
        const val = (item as any)[k];
        if (val === undefined) return null;
        if (typeof val === "boolean") return val ? 1 : 0;
        return typeof val === "object" && val !== null
          ? JSON.stringify(val)
          : val;
      });
      stmt.run(...values);
    }
  });

  transaction(data);
}

// Queue system for atomic operations (Read-Modify-Write)
const operationalLocks: Record<string, Promise<any>> = {};

export async function appendToCollection<T>(
  name: string,
  item: T,
): Promise<void> {
  const keys = Object.keys(item as object);
  const placeholders = keys.map(() => "?").join(",");
  const stmt = db.prepare(
    `INSERT INTO ${name} (${keys.join(",")}) VALUES (${placeholders})`,
  );

  const values = keys.map((k) => {
    const val = (item as any)[k];
    return typeof val === "object" && val !== null ? JSON.stringify(val) : val;
  });

  stmt.run(...values);
}

/**
 * Native SQLite handles write locks, but we keep this wrapper
 * to ensure that ASYNC business logic in index.ts remains sequential.
 */
export async function runLocked<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previousTask = operationalLocks[name] || Promise.resolve();

  const currentTask = previousTask.then(async () => {
    try {
      return await fn();
    } catch (err) {
      console.error(
        `[SQLite Lock Error] Task failed for collection "${name}":`,
        err,
      );
      throw err;
    }
  });

  operationalLocks[name] = currentTask.catch(() => {});
  return currentTask;
}

export async function createBackup(destPath: string): Promise<void> {
  await db.backup(destPath);
}
