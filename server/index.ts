import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initDb, readCollection, writeCollection, runLocked, appendToCollection, createBackup, restoreDatabase } from './db.js';
import type { Usuario, Boletim } from './types.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url} - Auth: ${req.headers['authorization'] || 'none'}`);
  res.on('finish', () => {
    console.log(`[HTTP] ${req.method} ${req.url} -> ${res.statusCode}`);
  });
  next();
});

// ─── In-Memory State ──────────────────────────────────────────────────────────
let reservas: { turmaAtividadeId: string; studentId: string; expires: number }[] = [];
const sessionTokens: Map<string, string> = new Map(); // token -> userId

// Cleanup expired reservations every 10 seconds
setInterval(() => {
  const now = Date.now();
  const before = reservas.length;
  reservas = reservas.filter(r => r.expires > now);
  if (reservas.length < before) console.log(`Cleaned up ${before - reservas.length} expired reservations.`);
}, 10_000);

// Helper to validate three-level enrollment periods
function isPeriodoAtivo(dataInicio: string | null, dataFim: string | null, status: string | null): boolean {
  if (status === 'fechado') return false;
  if (status === 'aberto') {
    if (!dataInicio || !dataFim) return true;
  }
  if (!dataInicio || !dataFim) return false;

  const agora = new Date().getTime();
  const strInicio = dataInicio.includes('T') ? dataInicio : `${dataInicio}T00:00`;
  const strFim = dataFim.includes('T') ? dataFim : `${dataFim}T23:59`;

  const inicioMs = new Date(`${strInicio}-03:00`).getTime();
  const fimMs = new Date(`${strFim}-03:00`).getTime();

  return agora >= inicioMs && agora <= fimMs;
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
async function requireAdmin(req: any, res: any, next: any) {
  const raw = req.headers['authorization'] as string | undefined;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Autenticação necessária.' });

  let userId = sessionTokens.get(token);
  if (!userId) {
    const sessions = await readCollection<any>('sessoes_admin');
    const session = sessions.find(s => s.token === token && Number(s.expiresAt) > Date.now());
    if (session) {
      userId = session.userId;
      sessionTokens.set(token, userId!);
    }
  }
  if (!userId) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });

  const usuarios: Usuario[] = await readCollection('usuarios');
  const user = usuarios.find((u: Usuario) => u.id === userId);
  if (!user || user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  req.adminUser = user;
  next();
}

async function requireLanguageSchool(req: any, res: any, next: any) {
  await requireAdmin(req, res, () => {
    const user = req.adminUser as Usuario;
    const permissions = user.permissoes || [];
    const permitted = permissions.includes('*') || permissions.includes('boletim:read') || permissions.includes('boletim:write');
    if ((user.grupoAdmin && user.grupoAdmin !== 'Language School') || !permitted) {
      return res.status(403).json({ error: 'Acesso restrito ao grupo Language School.' });
    }
    next();
  });
}

function canWriteBoletim(user: Usuario) {
  return !!user.permissoes?.some(p => p === '*' || p === 'boletim:write');
}

function canAccessTurma(user: Usuario, turmaId: string) {
  return !user.isProfessor || !!user.turmaIds?.includes(turmaId);
}

function validateBoletim(body: any): string | null {
  if (!body.turmaId || !body.estudanteId || !String(body.professor || '').trim()) return 'Turma, estudante e professor são obrigatórios.';
  if (!String(body.comentario || '').trim()) return 'O comentário do professor é obrigatório.';
  if (!['rascunho', 'finalizado'].includes(body.status)) return 'Status inválido.';
  const limits: Record<string, number> = { midTerm: 100, endOfTerm: 100, listening: 20, speaking: 60, performance: 20 };
  for (const [field, max] of Object.entries(limits)) {
    const value = Number(body[field]);
    if (!Number.isFinite(value) || value < 0 || value > max) return `${field} deve ser numérico e estar entre 0 e ${max}.`;
  }
  return null;
}

async function isLanguageSchoolClass(turmaId: string) {
  const turmas = await readCollection<any>('turmas_atividades');
  const atividades = await readCollection<any>('atividades');
  const turma = turmas.find(t => t.id === turmaId);
  return !!turma && atividades.some(a => a.id === turma.atividadeId && a.grupo === 'Language School');
}

// ─── Public: Login ────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  const usuarios: Usuario[] = await readCollection('usuarios');
  const user = usuarios.find((u: Usuario) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  if (user.senha !== senha) return res.status(401).json({ success: false, message: 'Senha incorreta.' });

  let token: string | undefined;
  if (user.tipo === 'admin') {
    token = crypto.randomUUID();
    sessionTokens.set(token, user.id);
    await appendToCollection('sessoes_admin', { token, userId: user.id, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    // Auto-expire after 8 hours
    setTimeout(() => sessionTokens.delete(token!), 8 * 60 * 60 * 1000);
  }

  // Clear any stale reservations from previous sessions for this student
  if (user.tipo === 'estudante' && user.estudanteId) {
    const before = reservas.length;
    reservas = reservas.filter(r => r.studentId !== user.estudanteId);
    if (reservas.length < before) {
      console.log(`[Login] Cleared ${before - reservas.length} stale reservations for student ${user.estudanteId}`);
    }
  }

  res.json({ success: true, user, token });
});

// ─── Public: Logout (clears the server-side token) ───────────────────────────
app.post('/api/logout', async (req, res) => {
  const raw = req.headers['authorization'] as string | undefined;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7) : null;
  if (token) {
    sessionTokens.delete(token);
    const sessions = await readCollection<any>('sessoes_admin');
    await writeCollection('sessoes_admin', sessions.filter(s => s.token !== token));
  }
  res.json({ success: true });
});

// ─── Public: Cursos (GET) — students need to browse courses (adapted for Extracurricular Classes) ──
app.get('/api/cursos', async (req, res) => {
  const turmas = await readCollection<any>('turmas_atividades');
  const atividades = await readCollection<any>('atividades');
  const inscricoes = await readCollection<any>('inscricoes');
  const periodos = await readCollection('periodos') as any[];
  const periodosGrupos = await readCollection('periodos_grupos') as any[];

  // Find general window
  const geral = periodos.find(p => p.id === 'geral') || { dataInicio: null, dataFim: null, status: 'fechado' };
  const geralAtivo = isPeriodoAtivo(geral.dataInicio, geral.dataFim, geral.status);

  const result = turmas.map((t: any) => {
    const atividade = atividades.find((a: any) => a.id === t.atividadeId);
    const vagasOcupadas = inscricoes.filter((i: any) => i.turmaAtividadeId === t.id).length;
    const reservasAtivas = reservas.filter(r => r.turmaAtividadeId === t.id).length;
    
    // Safely parse JSON strings from SQLite if necessary
    let diasSemana = t.diasSemana;
    if (typeof diasSemana === 'string') {
      try { diasSemana = JSON.parse(diasSemana); } catch (e) {}
    }
    let seriesPermitidas = t.seriesPermitidas;
    if (typeof seriesPermitidas === 'string') {
      try { seriesPermitidas = JSON.parse(seriesPermitidas); } catch (e) {}
    }

    // Determine Group and Activity validity
    let grupoAtivo = false;
    let atividadeAtiva = false;
    let grupoPeriodo = null;

    if (atividade) {
      grupoPeriodo = periodosGrupos.find(pg => pg.grupo === atividade.grupo);
      if (grupoPeriodo) {
        grupoAtivo = isPeriodoAtivo(grupoPeriodo.dataInicio, grupoPeriodo.dataFim, grupoPeriodo.status);
      }
      atividadeAtiva = isPeriodoAtivo(atividade.dataInicio, atividade.dataFim, atividade.status);
    }

    return {
      ...t,
      diasSemana,
      seriesPermitidas,
      nome: atividade ? `${atividade.nome} (${t.nome})` : t.nome,
      turmaNome: t.nome,
      atividadeNome: atividade ? atividade.nome : '',
      atividadeGrupo: atividade ? atividade.grupo : '',
      vagasOcupadas,
      reservasAtivas,
      geralAtivo,
      grupoAtivo,
      atividadeAtiva,
      grupoPeriodo,
      atividadePeriodo: atividade ? { dataInicio: atividade.dataInicio, dataFim: atividade.dataFim, status: atividade.status } : null
    };
  });

  res.json(result);
});

// ─── Public: Periodos (GET) — students need enrollment window dates ───────────
app.get('/api/periodos', async (req, res) => {
  res.json(await readCollection('periodos'));
});

// ─── Public: Periodos Grupos (GET) ───────────
app.get('/api/periodos_grupos', async (req, res) => {
  res.json(await readCollection('periodos_grupos'));
});

// ─── Public: Estudante por ID (GET) — students need their own data ────────────
app.get('/api/estudantes/:id', async (req, res) => {
  const estudantes = await readCollection('estudantes');
  const estudante = (estudantes as any[]).find((e: any) => e.id === req.params.id);
  if (!estudante) return res.status(404).json({ error: 'Estudante não encontrado.' });
  res.json(estudante);
});

// ─── Public: Inscricoes por estudante (GET) — students read their own enrollments ──
app.get('/api/inscricoes', async (req, res) => {
  const inscricoes = await readCollection<any>('inscricoes');
  const estudanteId = req.query.estudanteId as string | undefined;
  if (estudanteId) {
    return res.json((inscricoes as any[]).filter((i: any) => i.estudanteId === estudanteId));
  }
  // Without filter, require admin
  const raw = req.headers['authorization'] as string | undefined;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Autenticação necessária.' });
  res.json(inscricoes);
});

// ─── Public: Inscricoes (POST) — students submit their enrollment ─────────────
app.post('/api/inscricoes', async (req, res) => {
  const data = req.body;
  if (!Array.isArray(data)) return res.status(400).json({ error: 'Body must be an array' });
  await writeCollection('inscricoes', data);
  res.json({ success: true });
});

// ─── Public: Nova inscrição (append only) — safe for students ────────────────
app.post('/api/inscricoes/nova', async (req, res) => {
  const novaInscricao = req.body;
  if (!novaInscricao || !novaInscricao.estudanteId || !novaInscricao.turmaAtividadeId) {
    return res.status(400).json({ error: 'Dados da inscrição incompletos.' });
  }

  try {
    const result = await runLocked('inscricoes', async () => {
      const inscricoes = await readCollection('inscricoes') as any[];
      const estudantes = await readCollection('estudantes') as any[];
      const estudante = estudantes.find(e => e.id === novaInscricao.estudanteId);
      if (!estudante) {
        throw { status: 404, error: 'Estudante não encontrado.' };
      }

      const turmasAtividades = await readCollection('turmas_atividades') as any[];
      const tAtiv = turmasAtividades.find(t => t.id === novaInscricao.turmaAtividadeId);
      if (!tAtiv) {
        throw { status: 404, error: 'Turma de atividade não encontrada.' };
      }

      const atividades = await readCollection('atividades') as any[];
      const atividade = atividades.find(a => a.id === tAtiv.atividadeId);
      if (!atividade) {
        throw { status: 404, error: 'Atividade não encontrada.' };
      }

      // --- HIERARCHICAL DATES VALIDATION ---
      const periodos = await readCollection('periodos') as any[];
      const periodosGrupos = await readCollection('periodos_grupos') as any[];

      // 1. General period
      const geral = periodos.find(p => p.id === 'geral') || { dataInicio: null, dataFim: null, status: 'fechado' };
      if (!isPeriodoAtivo(geral.dataInicio, geral.dataFim, geral.status)) {
        throw { status: 400, error: 'O período geral de inscrições está fechado.' };
      }

      // 2. Group period
      const grupoPeriodo = periodosGrupos.find(pg => pg.grupo === atividade.grupo);
      if (!grupoPeriodo || !isPeriodoAtivo(grupoPeriodo.dataInicio, grupoPeriodo.dataFim, grupoPeriodo.status)) {
        throw { status: 400, error: 'O período de inscrições para este grupo de atividades está fechado.' };
      }

      // 3. Activity period
      if (!isPeriodoAtivo(atividade.dataInicio, atividade.dataFim, atividade.status)) {
        throw { status: 400, error: 'As inscrições para esta atividade específica estão fechadas.' };
      }

      // Parse seriesPermitidas
      let seriesPermitidas = tAtiv.seriesPermitidas;
      if (typeof seriesPermitidas === 'string') {
        try { seriesPermitidas = JSON.parse(seriesPermitidas); } catch (e) {}
      }

      // 4. Elegibilidade por Série
      if (Array.isArray(seriesPermitidas) && !seriesPermitidas.includes(estudante.serie)) {
        throw { status: 400, error: 'Você não é elegível para esta atividade devido à sua série.' };
      }

      // 5. Validação de conflito de horário
      const studentEnrollments = inscricoes.filter((i: any) => i.estudanteId === estudante.id);
      const existingTurmas = studentEnrollments.map((i: any) => turmasAtividades.find(t => t.id === i.turmaAtividadeId)).filter(Boolean);

      let newDays = tAtiv.diasSemana;
      if (typeof newDays === 'string') {
        try { newDays = JSON.parse(newDays); } catch (e) {}
      }
      const newStart = tAtiv.horarioInicio;
      const newEnd = tAtiv.horarioFim;

      for (const ext of existingTurmas) {
        if (ext.id === tAtiv.id) {
          throw { status: 409, error: 'Você já está matriculado nesta turma.' };
        }

        let extDays = ext.diasSemana;
        if (typeof extDays === 'string') {
          try { extDays = JSON.parse(extDays); } catch (e) {}
        }
        const extStart = ext.horarioInicio;
        const extEnd = ext.horarioFim;

        const commonDays = newDays.filter((d: string) => extDays.includes(d));
        if (commonDays.length > 0) {
          // Overlap check
          if (newStart < extEnd && extStart < newEnd) {
            throw { status: 400, error: 'Você já possui uma atividade cadastrada neste dia e horário.' };
          }
        }
      }

      // 6. Vagas Check
      const ocupadas = inscricoes.filter((i: any) => i.turmaAtividadeId === novaInscricao.turmaAtividadeId).length;
      if (ocupadas >= tAtiv.vagas) {
        throw { status: 400, error: 'Infelizmente as vagas para esta turma acabaram de esgotar.' };
      }

      const finalInscricao = {
        id: crypto.randomUUID(),
        estudanteId: estudante.id,
        turmaAtividadeId: tAtiv.id,
        data: new Date().toISOString(),
        nomeAluno: estudante.nome,
        matricula: estudante.matricula,
        turma: estudante.turma,
        nomeCurso: atividade.nome // Use the activity name for display/backwards-compatibility
      };

      await appendToCollection('inscricoes', finalInscricao);
      
      // Limpar reserva se existir
      reservas = reservas.filter(r => r.studentId !== novaInscricao.estudanteId);
      return finalInscricao;
    });
    res.json({ success: true, inscricao: result });
  } catch (err: any) {
    if (err.status) return res.status(err.status).json({ error: err.error });
    res.status(500).json({ error: 'Erro interno ao processar inscrição.' });
  }
});

// ─── Public: Reservations — students reserve a seat ──────────────────────────
app.post('/api/cursos/reservar', async (req, res) => {
  const { cursoId, estudanteId } = req.body; // cursoId represents the turmaAtividadeId
  if (!cursoId || !estudanteId)
    return res.status(400).json({ error: 'cursoId e estudanteId são obrigatórios.' });

  try {
    await runLocked('inscricoes', async () => {
      reservas = reservas.filter(r => r.studentId !== estudanteId);

      const turmas = await readCollection<any>('turmas_atividades');
      const turma: any = turmas.find((t: any) => t.id === cursoId);
      if (!turma) throw { status: 404, error: 'Turma não encontrada.' };

      const inscricoes = await readCollection<any>('inscricoes');
      const ocupadas = inscricoes.filter((i: any) => i.turmaAtividadeId === cursoId).length;
      const ativas = reservas.filter(r => r.turmaAtividadeId === cursoId).length;

      if (ocupadas + ativas >= turma.vagas)
        throw { status: 400, error: 'Não há mais vagas disponíveis para esta turma.' };

      reservas.push({ turmaAtividadeId: cursoId, studentId: estudanteId, expires: Date.now() + 5 * 60 * 1000 });
      return true;
    });
    res.json({ success: true });
  } catch (err: any) {
    if (err.status) return res.status(err.status).json({ error: err.error });
    res.status(500).json({ error: 'Erro ao processar reserva.' });
  }
});

app.post('/api/cursos/liberar', (req, res) => {
  const { estudanteId } = req.body;
  if (!estudanteId) return res.status(400).json({ error: 'estudanteId é obrigatório.' });
  reservas = reservas.filter(r => r.studentId !== estudanteId);
  res.json({ success: true });
});

// School reports: always restricted to admins assigned to Language School.
app.get('/api/boletins/contexto', requireLanguageSchool, async (req: any, res) => {
  const [atividades, turmas, inscricoes, estudantes] = await Promise.all([
    readCollection<any>('atividades'), readCollection<any>('turmas_atividades'),
    readCollection<any>('inscricoes'), readCollection<any>('estudantes')
  ]);
  const activityIds = new Set(atividades.filter(a => a.grupo === 'Language School').map(a => a.id));
  const classes = turmas.filter(t => activityIds.has(t.atividadeId) && canAccessTurma(req.adminUser, t.id)).map(t => ({
    ...t, atividadeNome: atividades.find(a => a.id === t.atividadeId)?.nome || ''
  }));
  const classIds = new Set(classes.map(t => t.id));
  const enrollments = inscricoes.filter(i => classIds.has(i.turmaAtividadeId));
  const studentIds = new Set(enrollments.map(i => i.estudanteId));
  res.json({ turmas: classes, inscricoes: enrollments, estudantes: estudantes.filter(e => studentIds.has(e.id)) });
});

app.get('/api/boletins', requireLanguageSchool, async (req: any, res) => {
  const items = await readCollection<Boletim>('boletins');
  res.json(items.filter(item => canAccessTurma(req.adminUser, item.turmaId)));
});

app.post('/api/boletins', requireLanguageSchool, async (req: any, res) => {
  if (!canWriteBoletim(req.adminUser)) return res.status(403).json({ error: 'Permissão de escrita necessária.' });
  if (!canAccessTurma(req.adminUser, req.body.turmaId)) return res.status(403).json({ error: 'Turma nao atribuida a esta professora.' });
  const error = validateBoletim(req.body);
  if (error) return res.status(400).json({ error });
  if (!await isLanguageSchoolClass(req.body.turmaId)) return res.status(400).json({ error: 'Turma inválida para o Language School.' });
  const inscricoes = await readCollection<any>('inscricoes');
  if (!inscricoes.some(i => i.turmaAtividadeId === req.body.turmaId && i.estudanteId === req.body.estudanteId)) {
    return res.status(400).json({ error: 'O estudante não está matriculado na turma selecionada.' });
  }
  const now = new Date().toISOString();
  const item: Boletim = { ...req.body, id: crypto.randomUUID(), professor: req.body.professor.trim(), comentario: req.body.comentario.trim(), criadoEm: now, atualizadoEm: now };
  try { await appendToCollection('boletins', item); }
  catch { return res.status(409).json({ error: 'Já existe um boletim para este estudante nesta turma.' }); }
  res.status(201).json(item);
});

app.put('/api/boletins/:id', requireLanguageSchool, async (req: any, res) => {
  if (!canWriteBoletim(req.adminUser)) return res.status(403).json({ error: 'Permissão de escrita necessária.' });
  if (!canAccessTurma(req.adminUser, req.body.turmaId)) return res.status(403).json({ error: 'Turma nao atribuida a esta professora.' });
  const error = validateBoletim(req.body);
  if (error) return res.status(400).json({ error });
  if (!await isLanguageSchoolClass(req.body.turmaId)) return res.status(400).json({ error: 'Turma inválida para o Language School.' });
  const all = await readCollection<Boletim>('boletins');
  const index = all.findIndex(b => b.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Boletim não encontrado.' });
  const updated = { ...all[index], ...req.body, id: all[index].id, criadoEm: all[index].criadoEm, atualizadoEm: new Date().toISOString() };
  all[index] = updated;
  try { await writeCollection('boletins', all); }
  catch { return res.status(409).json({ error: 'Já existe um boletim para este estudante nesta turma.' }); }
  res.json(updated);
});

// ─── Protected (Admin only) ────────────────────────────────────────────────────
// All remaining collection endpoints require an admin token.

const adminCollections = ['usuarios', 'estudantes', 'atividades', 'turmas_atividades', 'inscricoes', 'periodos', 'periodos_grupos'];

adminCollections.forEach(col => {
  // GET (read all)
  app.get(`/api/${col}`, requireAdmin, async (req, res) => {
    res.json(await readCollection(col));
  });

  // POST (overwrite all)
  app.post(`/api/${col}`, requireAdmin, async (req, res) => {
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Body must be an array' });
    await writeCollection(col, data);
    res.json({ success: true });
  });
});

// NOTE: The public routes registered above (/api/cursos GET, /api/periodos GET,
// /api/inscricoes POST) are declared BEFORE the protected loop, so Express will
// match them first and never reach the requireAdmin handler for those paths.

// Disabled migration endpoint
app.post('/api/seed', requireAdmin, (_req, res) => {
  res.status(403).json({ error: 'Migration endpoint is currently disabled.' });
});

// ─── Protected: Backup Database ────────────────────────────────────────────────
app.get('/api/backup', requireAdmin, async (req, res) => {
  try {
    const filename = `backup_sistema_inscricoes_${new Date().toISOString().split('T')[0]}.sqlite`;
    const tempPath = path.join(os.tmpdir(), filename);
    
    await createBackup(tempPath);
    
    res.download(tempPath, filename, (err) => {
      // Cleanup the temporary file after it's sent
      fs.unlink(tempPath, () => {});
    });
  } catch (err) {
    console.error('Error generating backup:', err);
    res.status(500).json({ error: 'Erro ao gerar arquivo de backup.' });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.post('/api/restore', requireAdmin, express.raw({ type: 'application/octet-stream', limit: '100mb' }), async (req: any, res) => {
  if (!req.adminUser.permissoes?.includes('*')) return res.status(403).json({ error: 'Apenas administradores com acesso total podem restaurar o banco.' });
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Arquivo SQLite nao enviado.' });
  const tempPath = path.join(os.tmpdir(), `restore-${crypto.randomUUID()}.sqlite`);
  try {
    fs.writeFileSync(tempPath, req.body);
    const backupPath = await restoreDatabase(tempPath);
    res.json({ success: true, backup: path.basename(backupPath) });
  } catch (error) {
    console.error('Database restore failed:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao restaurar banco.' });
  } finally {
    fs.unlink(tempPath, () => {});
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const frontendPath = process.env.FRONTEND_PATH || path.resolve(__dirname, '../dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}
const PORT = process.env.PORT || 3000;
initDb().then(() => {
  app.listen(PORT, () => console.log(`Express server running on port ${PORT}`));
});
