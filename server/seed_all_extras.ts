import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'database.sqlite');

const db = new Database(DB_PATH);

function seed() {
  console.log('--- Iniciando Semeadura Completa de Atividades Extracurriculares (2026) ---');

  // Limpar tabelas de atividades, turmas e inscrições antigas para evitar inconsistências
  db.exec(`
    DELETE FROM atividades;
    DELETE FROM turmas_atividades;
    DELETE FROM periodos;
    DELETE FROM periodos_grupos;
    DELETE FROM inscricoes;
  `);

  // 1. Inserir Período Geral Ativo por Padrão para 2026
  const stmtPeriodo = db.prepare('INSERT INTO periodos (id, dataInicio, dataFim, status) VALUES (?, ?, ?, ?)');
  stmtPeriodo.run('geral', '2026-01-01T00:00', '2026-12-31T23:59', 'aberto');

  // 2. Inserir Período por Grupo Ativo por Padrão
  const stmtGrupo = db.prepare('INSERT INTO periodos_grupos (grupo, dataInicio, dataFim, status) VALUES (?, ?, ?, ?)');
  stmtGrupo.run('Centro Cultural Santa Catarina', '2026-02-01T08:00', '2026-12-15T23:59', 'aberto');
  stmtGrupo.run('Language School', '2026-02-01T08:00', '2026-12-15T23:59', 'aberto');
  stmtGrupo.run('Santa Esportes', '2026-02-01T08:00', '2026-12-15T23:59', 'aberto');

  // Prepared statements para inserir atividades e turmas
  const stmtAtividade = db.prepare('INSERT INTO atividades (id, nome, grupo, dataInicio, dataFim, status) VALUES (?, ?, ?, ?, ?, ?)');
  const stmtTurma = db.prepare(`
    INSERT INTO turmas_atividades (id, atividadeId, nome, diasSemana, horarioInicio, horarioFim, seriesPermitidas, nivel, vagas, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let countAtividades = 0;
  let countTurmas = 0;

  const registrarAtividade = (id: string, nome: string, grupo: string) => {
    stmtAtividade.run(id, nome, grupo, '2026-02-01T08:00', '2026-12-15T23:59', 'aberto');
    countAtividades++;
  };

  const registrarTurma = (
    id: string,
    atividadeId: string,
    nome: string,
    diasSemana: string[],
    horarioInicio: string,
    horarioFim: string,
    seriesPermitidas: string[],
    nivel: string | null = null,
    vagas: number = 20
  ) => {
    stmtTurma.run(
      id,
      atividadeId,
      nome,
      JSON.stringify(diasSemana),
      horarioInicio,
      horarioFim,
      JSON.stringify(seriesPermitidas),
      nivel,
      vagas,
      'Ativa'
    );
    countTurmas++;
  };

  // ==========================================
  // GRUPO: Centro Cultural Santa Catarina
  // ==========================================
  const GC = 'Centro Cultural Santa Catarina';

  // 1. Bateria
  registrarAtividade('act_bateria', 'Bateria', GC);
  const seriesBateriaGeral = ['6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série', '2ª Série', '3ª Série', '3ª SÉRIE'];
  registrarTurma('turma_bateria_a', 'act_bateria', 'Turma A', ['Sexta-feira'], '13:00', '13:50', seriesBateriaGeral, 'Geral');
  registrarTurma('turma_bateria_b', 'act_bateria', 'Turma B', ['Sexta-feira'], '13:50', '14:40', seriesBateriaGeral, 'Geral');
  registrarTurma('turma_bateria_c', 'act_bateria', 'Turma C', ['Segunda-feira'], '18:30', '19:20', ['3º Ano', '4º Ano', '5º Ano'], 'Geral');
  registrarTurma('turma_bateria_d', 'act_bateria', 'Turma D', ['Quarta-feira'], '18:30', '19:20', ['1º Ano', '2º Ano'], 'Geral');
  registrarTurma('turma_bateria_e', 'act_bateria', 'Turma E', ['Sexta-feira'], '18:30', '19:20', ['1º Ano', '2º Ano'], 'Geral');

  // 2. Danças Urbanas
  registrarAtividade('act_dancas_urbanas', 'Danças Urbanas', GC);
  const seriesDancas = ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série', '2ª Série', '3ª Série', '3ª SÉRIE'];
  registrarTurma('turma_dancas_urbanas_a', 'act_dancas_urbanas', 'Turma A', ['Segunda-feira', 'Quarta-feira'], '18:30', '19:20', seriesDancas, 'Geral');

  // 3. Flauta Doce
  registrarAtividade('act_flauta_doce', 'Flauta Doce', GC);
  registrarTurma('turma_flauta_doce_a', 'act_flauta_doce', 'TURMA A', ['Terça-feira'], '18:30', '19:20', ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'], 'Iniciante');
  registrarTurma('turma_flauta_doce_b', 'act_flauta_doce', 'TURMA B', ['Quinta-feira'], '18:30', '19:20', ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'], 'Iniciante');

  // 4. Flauta Pífaro
  registrarAtividade('act_flauta_pifaro', 'Flauta Pífaro', GC);
  registrarTurma('turma_flauta_pifaro_c', 'act_flauta_pifaro', 'TURMA C', ['Quarta-feira'], '18:30', '19:20', ['5º Ano', '6º Ano', '7º Ano'], 'Geral');

  // 5. Flauta Transversa
  registrarAtividade('act_flauta_transversa', 'Flauta Transversa', GC);
  const seriesTransversa = ['6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série', '2ª Série', '3ª Série', '3ª SÉRIE'];
  registrarTurma('turma_flauta_transversa_a', 'act_flauta_transversa', 'TURMA A', ['Segunda-feira'], '19:20', '20:10', seriesTransversa, 'Avançado');

  // 6. Guitarra
  registrarAtividade('act_guitarra', 'Guitarra', GC);
  const seriesGuitarra = ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série', '2ª Série', '3ª Série', '3ª SÉRIE'];
  registrarTurma('turma_guitarra_a', 'act_guitarra', 'TURMA A', ['Sexta-feira'], '17:20', '18:10', seriesGuitarra, 'Geral');

  // 7. Musicalização Instrumental
  registrarAtividade('act_musicalizacao', 'Musicalização Instrumental', GC);
  registrarTurma('turma_musicalizacao_a', 'act_musicalizacao', 'TURMA A', ['Sexta-feira'], '18:30', '19:20', ['Infantil 4', 'Infantil 5'], 'Iniciante');

  // 8. Piano
  registrarAtividade('act_piano', 'Piano', GC);
  registrarTurma('turma_piano_a', 'act_piano', 'TURMA A', ['Segunda-feira'], '12:00', '12:50', ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'], 'Básico II');
  registrarTurma('turma_piano_b', 'act_piano', 'TURMA B', ['Segunda-feira'], '15:50', '16:40', ['6º Ano', '7º Ano', '8º Ano', '9º Ano'], 'Avançado');

  // 9. Teatro
  registrarAtividade('act_teatro', 'Teatro', GC);
  registrarTurma('turma_teatro_c', 'act_teatro', 'TURMA C', ['Quinta-feira'], '18:30', '19:20', ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano'], 'Geral');

  // 10. Teclado
  registrarAtividade('act_teclado', 'Teclado', GC);
  registrarTurma('turma_teclado_a', 'act_teclado', 'TURMA A', ['Segunda-feira'], '18:30', '19:20', ['1º Ano', '2º Ano'], 'Iniciante');
  registrarTurma('turma_teclado_b', 'act_teclado', 'TURMA B', ['Terça-feira'], '18:30', '19:20', ['3º Ano', '4º Ano', '5º Ano'], 'Intermediário');
  registrarTurma('turma_teclado_c', 'act_teclado', 'TURMA C', ['Quarta-feira'], '18:30', '19:20', ['3º Ano', '4º Ano', '5º Ano'], 'Básico III');
  registrarTurma('turma_teclado_d', 'act_teclado', 'TURMA D', ['Quinta-feira'], '18:30', '19:20', ['3º Ano', '4º Ano', '5º Ano'], 'Iniciante');
  registrarTurma('turma_teclado_e', 'act_teclado', 'TURMA E', ['Sexta-feira'], '12:00', '12:50', ['3º Ano', '4º Ano', '5º Ano'], 'Básico II');
  const seriesTecladoF = ['9º Ano', '1ª Série', '2ª Série', '3ª Série', '3ª SÉRIE'];
  registrarTurma('turma_teclado_f', 'act_teclado', 'TURMA F', ['Sexta-feira'], '13:30', '14:20', seriesTecladoF, 'Avançado');

  // 11. Violão
  registrarAtividade('act_violao', 'Violão', GC);
  registrarTurma('turma_violao_a', 'act_violao', 'TURMA A', ['Segunda-feira'], '18:30', '19:20', ['4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano'], 'Básico I');
  registrarTurma('turma_violao_b', 'act_violao', 'TURMA B', ['Sexta-feira'], '18:30', '19:20', ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'], 'Iniciante');
  const seriesViolaoC = ['6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série', '2ª Série', '3ª Série', '3ª SÉRIE'];
  registrarTurma('turma_violao_c', 'act_violao', 'TURMA C', ['Sexta-feira'], '17:30', '18:20', seriesViolaoC, 'Avançado');

  // 12. Violino
  registrarAtividade('act_violino', 'Violino', GC);
  const seriesViolinoGeral = ['6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série', '2ª Série', '3ª Série', '3ª SÉRIE'];
  registrarTurma('turma_violino_a', 'act_violino', 'TURMA A', ['Sexta-feira'], '17:00', '17:50', seriesViolinoGeral, 'Iniciante');
  registrarTurma('turma_violino_b', 'act_violino', 'TURMA B', ['Sexta-feira'], '18:30', '19:20', ['2º Ano', '3º Ano', '4º Ano', '5º Ano'], 'Básico I');
  registrarTurma('turma_violino_c', 'act_violino', 'TURMA C', ['Sexta-feira'], '16:00', '16:50', seriesViolinoGeral, 'Avançado');
  registrarTurma('turma_violino_d', 'act_violino', 'TURMA D', ['Segunda-feira'], '18:30', '19:20', ['4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano'], 'Básico III');
  registrarTurma('turma_violino_e', 'act_violino', 'TURMA E', ['Sexta-feira'], '09:00', '09:50', ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'], 'Iniciante');


  // ==========================================
  // GRUPO: Language School
  // ==========================================
  const GL = 'Language School';

  // 1. Tiny Talkers
  registrarAtividade('act_tiny_talkers', 'Tiny Talkers', GL);
  registrarTurma('turma_tiny_1a', 'act_tiny_talkers', 'Tiny Talkers 1A', ['Segunda-feira', 'Quarta-feira'], '18:30', '19:20', ['Infantil 4'], 'Infantil 4');
  registrarTurma('turma_tiny_1b', 'act_tiny_talkers', 'Tiny Talkers 1B', ['Terça-feira', 'Quinta-feira'], '18:30', '19:20', ['Infantil 4'], 'Infantil 4');
  registrarTurma('turma_tiny_2a', 'act_tiny_talkers', 'Tiny Talkers 2A', ['Terça-feira', 'Quinta-feira'], '09:00', '09:50', ['Infantil 5'], 'Infantil 5');
  registrarTurma('turma_tiny_2b', 'act_tiny_talkers', 'Tiny Talkers 2B', ['Terça-feira', 'Quinta-feira'], '18:30', '19:20', ['Infantil 5'], 'Infantil 5');
  registrarTurma('turma_tiny_3a', 'act_tiny_talkers', 'Tiny Talkers 3A', ['Segunda-feira', 'Quarta-feira'], '09:00', '09:50', ['1º Ano'], '1º Ano');

  // 2. English Explorers
  registrarAtividade('act_english_explorers', 'English Explorers', GL);
  registrarTurma('turma_english_1a', 'act_english_explorers', 'English Explorers 1A', ['Segunda-feira', 'Quinta-feira'], '18:30', '19:30', ['2º Ano'], '2º Ano');
  registrarTurma('turma_english_2a', 'act_english_explorers', 'English Explorers 2A', ['Segunda-feira', 'Quarta-feira'], '18:30', '19:30', ['3º Ano'], '3º Ano');
  registrarTurma('turma_english_3a', 'act_english_explorers', 'English Explorers 3A', ['Segunda-feira', 'Quarta-feira'], '18:30', '19:30', ['4º Ano'], '4º Ano');
  registrarTurma('turma_english_3b', 'act_english_explorers', 'English Explorers 3B', ['Terça-feira', 'Quinta-feira'], '18:30', '19:30', ['4º Ano'], '4º Ano');
  registrarTurma('turma_english_4a', 'act_english_explorers', 'English Explorers 4A', ['Segunda-feira', 'Quarta-feira'], '18:30', '19:30', ['5º Ano'], '5º Ano');
  registrarTurma('turma_english_4b', 'act_english_explorers', 'English Explorers 4B', ['Terça-feira', 'Quinta-feira'], '18:30', '19:30', ['5º Ano'], '5º Ano');


  // ==========================================
  // GRUPO: Santa Esportes
  // ==========================================
  const GE = 'Santa Esportes';

  // 1. Ballet
  registrarAtividade('act_ballet', 'Ballet', GE);
  registrarTurma('turma_ballet_a', 'act_ballet', 'Turma A', ['Segunda-feira', 'Quarta-feira'], '18:30', '19:20', ['Infantil 2', 'Infantil 3', 'Infantil 4', 'Infantil 5'], 'Educação Infantil');
  registrarTurma('turma_ballet_b', 'act_ballet', 'Turma B', ['Terça-feira', 'Quinta-feira'], '18:30', '19:20', ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'], '1º ao 5º Ano');

  // 2. Capoeira
  registrarAtividade('act_capoeira', 'Capoeira', GE);
  registrarTurma('turma_capoeira_a', 'act_capoeira', 'Turma A', ['Terça-feira', 'Quinta-feira'], '18:30', '19:20', ['Infantil 2', 'Infantil 3', 'Infantil 4', 'Infantil 5'], 'Educação Infantil');
  registrarTurma('turma_capoeira_b', 'act_capoeira', 'Turma B', ['Segunda-feira', 'Quarta-feira'], '18:30', '19:20', ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'], '1º ao 5º Ano');

  // 3. Futsal
  registrarAtividade('act_futsal', 'Futsal', GE);
  registrarTurma('turma_futsal_a', 'act_futsal', 'Turma A', ['Terça-feira', 'Sexta-feira'], '18:30', '19:20', ['1º Ano', '2º Ano'], '1º e 2º Ano');
  registrarTurma('turma_futsal_b', 'act_futsal', 'Turma B', ['Segunda-feira', 'Quarta-feira'], '18:30', '19:20', ['3º Ano', '4º Ano', '5º Ano'], '3º ao 5º Ano');
  registrarTurma('turma_futsal_c', 'act_futsal', 'Turma C', ['Sexta-feira'], '14:30', '16:10', ['6º Ano', '7º Ano'], '6º e 7º Ano');
  registrarTurma('turma_futsal_e', 'act_futsal', 'Turma E', ['Terça-feira', 'Sexta-feira'], '18:30', '19:20', ['Infantil 4', 'Infantil 5'], 'Infantil 4 e 5');

  // 4. Handebol
  registrarAtividade('act_handebol', 'Handebol', GE);
  registrarTurma('turma_handebol_a', 'act_handebol', 'Turma A', ['Quinta-feira'], '14:30', '16:10', ['7º Ano', '8º Ano', '9º Ano'], '7º ao 9º Ano');

  // 5. Karatê
  registrarAtividade('act_karate', 'Karatê', GE);
  registrarTurma('turma_karate_a', 'act_karate', 'Turma A', ['Segunda-feira', 'Quarta-feira'], '18:30', '19:20', ['1º Ano', '2º Ano'], '1º e 2º Ano');
  registrarTurma('turma_karate_b', 'act_karate', 'Turma B', ['Terça-feira', 'Sexta-feira'], '18:30', '19:20', ['3º Ano', '4º Ano', '5º Ano'], '3º ao 5º Ano');

  // 6. Voleibol
  registrarAtividade('act_voleibol', 'Voleibol', GE);
  registrarTurma('turma_voleibol_a', 'act_voleibol', 'Turma A', ['Segunda-feira', 'Quarta-feira'], '18:30', '19:20', ['4º Ano', '5º Ano'], '4º e 5º Ano');
  registrarTurma('turma_voleibol_b', 'act_voleibol', 'Turma B', ['Quinta-feira'], '16:10', '17:50', ['6º Ano', '7º Ano'], '6º e 7º Ano');

  // 7. Xadrez
  registrarAtividade('act_xadrez', 'Xadrez', GE);
  registrarTurma('turma_xadrez_a', 'act_xadrez', 'Turma A INICIANTES', ['Segunda-feira'], '18:30', '19:20', ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'], 'Iniciantes');
  registrarTurma('turma_xadrez_b', 'act_xadrez', 'Turma B GRADUADOS', ['Quarta-feira'], '18:30', '19:20', ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'], 'Graduados');


  console.log(`--- Semeadura concluída! Semeado: ${countAtividades} atividades e ${countTurmas} turmas. ---`);
  process.exit(0);
}

seed();
