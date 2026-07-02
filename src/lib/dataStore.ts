import { Usuario, Estudante, Curso, Inscricao, Periodo, Turma } from '@/types';

const API_BASE = '/api';

// ─── Session Token ────────────────────────────────────────────────────────────
// Managed by AuthContext; injected into all admin API requests automatically.
let _adminToken: string | null = null;

export function setAdminToken(token: string | null) {
  _adminToken = token;
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (_adminToken) headers['Authorization'] = `Bearer ${_adminToken}`;
  return headers;
}

const KEYS = {
  usuarios: 'optativas_usuarios',
  estudantes: 'optativas_estudantes',
  cursos: 'optativas_cursos',
  inscricoes: 'optativas_inscricoes',
  periodos: 'optativas_periodos',
  turmas: 'optativas_turmas',
};

async function getFromApi<T>(collection: string): Promise<T[]> {
  try {
    const res = await fetch(`${API_BASE}/${collection}`, {
      headers: authHeaders({ 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' })
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch ${collection}:`, err);
    return [];
  }
}

async function setToApi<T>(collection: string, data: T[]): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/${collection}`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Server returned ${res.status}: ${errText}`);
    }
  } catch (err) {
    console.error(`Failed to save ${collection}:`, err);
  }
}

// --- Migration & Sync ---
export async function syncWithBackend() {
  const data: Record<string, any[]> = {};
  let hasLocalData = false;

  for (const [key, storageKey] of Object.entries(KEYS)) {
    const local = localStorage.getItem(storageKey);
    if (local) {
      data[key] = JSON.parse(local);
      hasLocalData = true;
    }
  }

  if (hasLocalData) {
    console.log('Migrating local data to backend...');
    await fetch(`${API_BASE}/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    // Limpar localStorage após migração bem sucedida para evitar dados fantasmas
    for (const storageKey of Object.values(KEYS)) {
      localStorage.removeItem(storageKey);
    }
  }
}

// --- API Wrappers ---
export async function getUsuarios(): Promise<Usuario[]> { return getFromApi<Usuario>('usuarios'); }
export async function setUsuarios(u: Usuario[]) { await setToApi('usuarios', u); }

export async function findUsuarioByEmail(email: string): Promise<Usuario | undefined> {
  if (!email) return undefined;
  const usuarios = await getUsuarios();
  const cleanEmail = email.trim().toLowerCase();
  return usuarios.find(u => (u.email || '').trim().toLowerCase() === cleanEmail);
}

export async function getEstudantes(): Promise<Estudante[]> { return getFromApi<Estudante>('estudantes'); }
export async function setEstudantes(e: Estudante[]) { await setToApi('estudantes', e); }

export async function findEstudanteById(id: string): Promise<Estudante | undefined> {
  if (!id) return undefined;
  try {
    const res = await fetch(`${API_BASE}/estudantes/${id}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!res.ok) return undefined;
    return await res.json() as Estudante;
  } catch {
    return undefined;
  }
}

export async function findEstudanteByMatricula(matricula: string): Promise<Estudante | undefined> {
  const estudantes = await getEstudantes();
  return estudantes.find(e => e.matricula === matricula);
}

export async function updateEstudante(est: Estudante, novaSenha?: string) {
  const estudantes = await getEstudantes();
  const idx = estudantes.findIndex(e => e.id === est.id);
  if (idx !== -1) {
    estudantes[idx] = est;
    await setEstudantes(estudantes);
    
    // Also update user email and optionally password if attached
    const usuarios = await getUsuarios();
    const uIdx = usuarios.findIndex(u => u.estudanteId === est.id);
    if (uIdx !== -1) {
      usuarios[uIdx].email = est.email;
      if (novaSenha) {
        usuarios[uIdx].senha = novaSenha;
      }
      await setUsuarios(usuarios);
    }
  }
}

export async function deleteEstudante(id: string) {
  const estudantes = await getEstudantes();
  const filtered = estudantes.filter(e => e.id !== id);
  await setEstudantes(filtered);
  
  // Clean up user
  const usuarios = await getUsuarios();
  const uFiltered = usuarios.filter(u => u.estudanteId !== id);
  await setUsuarios(uFiltered);
}

export async function getAtividades(): Promise<Atividade[]> { return getFromApi<Atividade>('atividades'); }
export async function setAtividades(a: Atividade[]) { await setToApi('atividades', a); }

export async function getTurmas(): Promise<TurmaAtividade[]> { return getFromApi<TurmaAtividade>('turmas_atividades'); }
export async function setTurmas(t: TurmaAtividade[]) { await setToApi('turmas_atividades', t); }

export async function getCursos(): Promise<Curso[]> { 
  return getFromApi<Curso>('cursos'); 
}
export async function setCursos(c: Curso[]) { await setToApi('cursos', c); }

export async function reservarCurso(cursoId: string, estudanteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/cursos/reservar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cursoId, estudanteId }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Falha ao reservar curso:', err);
    return { success: false, error: 'Erro de conexão com o servidor.' };
  }
}

export async function liberarCurso(estudanteId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/cursos/liberar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estudanteId }),
    });
  } catch (err) {
    console.error('Falha ao liberar curso:', err);
  }
}

export async function getCursosDisponiveis(serie: string): Promise<Curso[]> {
  const cursos = await getCursos();
  
  return cursos.filter(c => {
    const statusVal = (c.status || 'Ativa').toLowerCase();
    const isAtivo = statusVal === 'ativa' || statusVal === 'ativo';
    const isSerieMatch = c.seriesPermitidas && c.seriesPermitidas.includes(serie);
    
    return isAtivo && isSerieMatch;
  });
}

export async function getInscricoes(): Promise<Inscricao[]> { return getFromApi<Inscricao>('inscricoes'); }
export async function setInscricoes(i: Inscricao[]) { await setToApi('inscricoes', i); }

export async function getInscricoesByEstudante(estudanteId: string): Promise<Inscricao[]> {
  try {
    const res = await fetch(`${API_BASE}/inscricoes?estudanteId=${encodeURIComponent(estudanteId)}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!res.ok) return [];
    return await res.json() as Inscricao[];
  } catch {
    return [];
  }
}

export async function jaInscritoNoTrimestre(estudanteId: string): Promise<boolean> {
  const inscricoes = await getInscricoesByEstudante(estudanteId);
  return inscricoes.length > 0;
}

export async function realizarInscricao(inscricao: { estudanteId: string; turmaAtividadeId: string }): Promise<{ success: boolean; message: string; inscricao?: Inscricao }> {
  try {
    const res = await fetch(`${API_BASE}/inscricoes/nova`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inscricao),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, message: data.error || 'Erro ao salvar inscrição.' };
    return { success: true, message: 'Inscrição realizada com sucesso!', inscricao: data.inscricao };
  } catch (err) {
    console.error('Erro ao salvar inscrição:', err);
    return { success: false, message: 'Erro de conexão ao salvar inscrição.' };
  }
}

export async function cancelarInscricao(inscricaoId: string): Promise<{ success: boolean; message: string }> {
  const inscricoes = await getInscricoes();
  const inscricao = inscricoes.find(i => i.id === inscricaoId);
  if (!inscricao) return { success: false, message: 'Inscrição não encontrada.' };

  // Remove the enrollment
  await setInscricoes(inscricoes.filter(i => i.id !== inscricaoId));
  return { success: true, message: 'Inscrição removida com sucesso.' };
}

export async function getPeriodos(): Promise<Periodo[]> { return getFromApi<Periodo>('periodos'); }
export async function setPeriodos(p: Periodo[]) { await setToApi('periodos', p); }

export async function getPeriodosGrupos(): Promise<PeriodoGrupo[]> { return getFromApi<PeriodoGrupo>('periodos_grupos'); }
export async function setPeriodosGrupos(p: PeriodoGrupo[]) { await setToApi('periodos_grupos', p); }

export async function getInscricaoStatus(): Promise<'disponivel' | 'nao_iniciado' | 'finalizado'> {
  const periodos = await getPeriodos();
  const periodo = periodos.find(p => p.id === 'geral');
  if (!periodo) return 'nao_iniciado';
  if (periodo.status === 'fechado') return 'finalizado';
  if (periodo.status === 'aberto' && (!periodo.dataInicio || !periodo.dataFim)) return 'disponivel';
  if (!periodo.dataInicio || !periodo.dataFim) return 'nao_iniciado';
  
  const hojeMs = new Date().getTime();
  const strInicio = periodo.dataInicio.includes('T') ? periodo.dataInicio : `${periodo.dataInicio}T00:00`;
  const strFim = periodo.dataFim.includes('T') ? periodo.dataFim : `${periodo.dataFim}T23:59`;

  const inicioMs = new Date(`${strInicio}-03:00`).getTime();
  const fimMs = new Date(`${strFim}-03:00`).getTime();

  if (hojeMs < inicioMs) return 'nao_iniciado';
  if (hojeMs > fimMs) return 'finalizado';
  return 'disponivel';
}

export async function getTrimestreStatus(trimestre?: number, categoria?: string): Promise<'disponivel' | 'nao_iniciado' | 'finalizado'> {
  return getInscricaoStatus();
}

export async function hasCoursesForTrimestre(serie: string): Promise<boolean> {
  const cursos = await getCursos();
  return cursos.some(c => c.seriesPermitidas && c.seriesPermitidas.includes(serie) && (c.status || 'Ativa').toLowerCase() === 'ativa');
}

export async function ensureUsuariosExist() {
  const estudantes = await getEstudantes();
  const usuarios = await getUsuarios();
  let changed = false;

  estudantes.forEach(est => {
    const hasUser = usuarios.some(u => u.estudanteId === est.id || u.email.toLowerCase() === est.email.toLowerCase());
    if (!hasUser) {
      usuarios.push({
        id: crypto.randomUUID(),
        email: est.email,
        senha: '123456',
        tipo: 'estudante',
        estudanteId: est.id
      });
      changed = true;
    }
  });

  if (changed) {
    await setUsuarios(usuarios);
    console.log('User accounts synchronized for all students.');
  }
}

export async function importCSV(csvText: string): Promise<{ 
  imported: number; 
  novos: number; 
  atualizados: number; 
  inalterados: number; 
  skipped: number; 
  errors: string[] 
}> {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { imported: 0, novos: 0, atualizados: 0, inalterados: 0, skipped: 0, errors: ['Arquivo vazio ou sem dados.'] };

  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const headers = firstLine.split(delimiter).map(h => h.trim().toUpperCase());
  
  const headerMap: Record<string, string[]> = {
    'SERIE': ['SERIE', 'SER'],
    'TURNO': ['TURNO'],
    'CODIGOTURMA': ['CODIGOTURMA', 'DIGOT', 'TURMA'],
    'CODIGOMATRICULA': ['CODIGOMATRICULA', 'DIGOMATR', 'MATRICULA', 'CODIGO'],
    'NOMEALUNO': ['NOMEALUNO', 'NOME', 'NOME ALUNO', 'ESTUDANTE'],
    'LOGINOFFICE365': ['LOGINOFFICE365', 'EMAIL', 'LOGIN', 'OFFICE'],
    'SENHA': ['SENHA', 'PASSWORD', 'KEY']
  };

  const findIdx = (aliases: string[]) => {
    for (const alias of aliases) {
      const i = headers.indexOf(alias.toUpperCase());
      if (i !== -1) return i;
    }
    return -1;
  };

  const idx: Record<string, number> = {};
  Object.keys(headerMap).forEach(key => {
    idx[key] = findIdx(headerMap[key]);
  });
  
  const strictlyRequired = ['CODIGOMATRICULA', 'NOMEALUNO', 'LOGINOFFICE365', 'SENHA'];
  const missing = strictlyRequired.filter(key => idx[key] === -1);
  if (missing.length > 0) return { imported: 0, novos: 0, atualizados: 0, inalterados: 0, skipped: 0, errors: [`Colunas essenciais faltando: ${missing.join(', ')}`] };

  // Helper sanitization functions
  const sanitize = (val: string) => (val || '').replace(/^["']|["']$/g, '').trim();
  const sanitizeMatricula = (val: string) => {
    const raw = sanitize(val);
    const numeric = raw.replace(/\D/g, '');
    return numeric ? numeric.padStart(10, '0') : '';
  };

  let novos = 0;
  let atualizados = 0;
  let inalterados = 0;
  const errors: string[] = [];
  const estudantes = await getEstudantes();
  const usuarios = await getUsuarios();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split(delimiter).map(c => sanitize(c));
    
    const matriculaRaw = cols[idx['CODIGOMATRICULA']];
    const email = cols[idx['LOGINOFFICE365']].toLowerCase();
    const password = cols[idx['SENHA']] || '123456';
    const nome = cols[idx['NOMEALUNO']];
    const serie = idx['SERIE'] !== -1 ? cols[idx['SERIE']] : 'Indefinido';
    const turma = idx['CODIGOTURMA'] !== -1 ? cols[idx['CODIGOTURMA']] : 'Geral';
    const turno = idx['TURNO'] !== -1 ? cols[idx['TURNO']] : 'Manhã-EFAF';

    if (!matriculaRaw || !email || !nome) continue;

    const matricula = sanitizeMatricula(matriculaRaw);
    if (!matricula) continue;

    // Busca robusta: por matrícula sanitizada OU por e-mail
    const existingEstIdx = estudantes.findIndex(e => {
      const mMatch = sanitizeMatricula(e.matricula) === matricula;
      const eMatch = (e.email || '').toLowerCase().trim() === email;
      return mMatch || eMatch;
    });

    if (existingEstIdx !== -1) {
      const existing = estudantes[existingEstIdx];
      const user = usuarios.find(u => u.estudanteId === existing.id || u.email.toLowerCase() === email);
      
      const hasChanges = 
        existing.nome !== nome ||
        existing.matricula !== matricula ||
        existing.email !== email ||
        existing.serie !== serie ||
        existing.turma !== turma ||
        existing.turno !== (turno as any) ||
        (user && user.senha !== password);

      if (hasChanges) {
        // Já cadastrado: Atualizar dados
        const estId = existing.id;
        estudantes[existingEstIdx] = {
          ...existing,
          nome,
          matricula,
          email,
          serie,
          turma,
          codigoTurma: turma,
          turno: (turno as Estudante['turno']) || 'Manhã-EFAF',
        };
        
        if (user) {
          user.senha = password;
          user.email = email;
          user.estudanteId = estId;
        } else {
          usuarios.push({
            id: crypto.randomUUID(),
            email,
            senha: password,
            tipo: 'estudante',
            estudanteId: estId,
          });
        }
        atualizados++;
      } else {
        inalterados++;
      }
      continue;
    }

    // Não cadastrado: Importar novo estudante
    const novoEstudante: Estudante = {
      id: crypto.randomUUID(),
      nome,
      matricula,
      email,
      turno: (turno as Estudante['turno']) || 'Manhã-EFAF',
      serie,
      turma,
      codigoTurma: turma,
    };

    estudantes.push(novoEstudante);
    usuarios.push({
      id: crypto.randomUUID(),
      email,
      senha: password,
      tipo: 'estudante',
      estudanteId: novoEstudante.id,
    });

    novos++;
  }

  await setEstudantes(estudantes);
  await setUsuarios(usuarios);
  return { 
    imported: novos + atualizados + inalterados, 
    novos, 
    atualizados, 
    inalterados, 
    skipped: 0, 
    errors 
  };
}



// Removendo a função seedIfEmpty original que usava localStorage localmente
export async function checkSeed() {
  return;
}

export async function importHistoricoCSV(csvText: string): Promise<{ 
  imported: number; 
  errors: string[] 
}> {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { imported: 0, errors: ['Arquivo vazio ou sem dados.'] };

  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const headers = firstLine.split(delimiter).map(h => h.trim().toUpperCase());
  
  const headerMap: Record<string, string[]> = {
    'NOMECURSO': ['NOMECURSO', 'CURSO', 'NOME DO CURSO'],
    'MATRICULA': ['MATRICULA', 'CODIGOMATRICULA', 'CODIGO', 'MATR'],
    'NOMEALUNO': ['NOMEALUNO', 'NOME', 'ALUNO', 'NOME DO ESTUDANTE', 'ESTUDANTE']
  };

  const findIdx = (aliases: string[]) => {
    for (const alias of aliases) {
      const i = headers.indexOf(alias.toUpperCase());
      if (i !== -1) return i;
    }
    return -1;
  };

  const idx: Record<string, number> = {};
  Object.keys(headerMap).forEach(key => {
    idx[key] = findIdx(headerMap[key]);
  });
  
  const strictlyRequired = ['NOMECURSO', 'MATRICULA'];
  const missing = strictlyRequired.filter(key => idx[key] === -1);
  if (missing.length > 0) return { imported: 0, errors: [`Colunas essenciais faltando: ${missing.join(', ')}`] };

  const sanitizeMatricula = (val: string) => {
    const raw = (val || '').replace(/^["']|["']$/g, '').trim();
    const numeric = raw.replace(/\D/g, '');
    return numeric ? numeric.padStart(10, '0') : '';
  };

  const [estudantes, inscricoes] = await Promise.all([getEstudantes(), getInscricoes()]);
  let imported = 0;
  const errors: string[] = [];
  const defaultDate = new Date('2024-03-01T10:00:00Z').toISOString();

  const cleanString = (str: string) => 
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
    
    const matricula = sanitizeMatricula(cols[idx['MATRICULA']]);
    const nomeCurso = cols[idx['NOMECURSO']];
    const csvNome = idx['NOMEALUNO'] !== -1 ? cleanString(cols[idx['NOMEALUNO']]) : '';
    
    // Busca restrita: exige correspondência exata de matrícula E nome (se fornecido)
    const estudante = estudantes.find(e => {
      const matriculaMatch = sanitizeMatricula(e.matricula) === matricula;
      const nomeMatch = csvNome ? cleanString(e.nome) === csvNome : true;
      return matriculaMatch && nomeMatch;
    });
    
    if (!estudante) {
      if (csvNome) {
        errors.push(`Inconsistência de dados: O aluno "${cols[idx['NOMEALUNO']]}" com a matrícula "${cols[idx['MATRICULA']]}" não foi encontrado ou os dados não coincidem com o cadastro.`);
      } else {
        errors.push(`Matrícula "${cols[idx['MATRICULA']]}" não encontrada.`);
      }
      continue;
    }

    const existingIdx = inscricoes.findIndex(ins => ins.estudanteId === estudante.id && ins.trimestre === 1);
    if (existingIdx !== -1) {
      inscricoes[existingIdx].nomeCurso = nomeCurso;
      inscricoes[existingIdx].data = defaultDate;
    } else {
      inscricoes.push({
        id: crypto.randomUUID(),
        estudanteId: estudante.id,
        cursoId: 'historico-importado',
        trimestre: 1,
        nomeAluno: estudante.nome,
        matricula: estudante.matricula,
        turma: estudante.turma,
        nomeCurso,
        data: defaultDate
      });
    }
    imported++;
  }

  await setInscricoes(inscricoes);
  return { imported, errors };
}
