export interface Usuario {
  id: string;
  email: string;
  senha: string;
  tipo: 'estudante' | 'admin';
  estudanteId?: string;
  permissoes?: string[]; // Scoped strings like 'tab:read' or 'tab:write', or ['*'] for all
  grupoAdmin?: string;
  nome?: string;
  isProfessor?: boolean;
  turmaIds?: string[]; // Restricted to a specific activity group e.g. 'Santa Esportes'
}

export interface Estudante {
  id: string;
  nome: string;
  matricula: string;
  email: string;
  turno: 'Matutino' | 'Vespertino' | 'Integral' | 'Manhã-EFAF' | 'Manhã-EM' | string;
  serie: string;
  turma: string;
  codigoTurma: string;
}

export interface Atividade {
  id: string;
  nome: string;
  grupo: string;
  dataInicio: string;
  dataFim: string;
  status: 'aberto' | 'fechado';
}

export interface TurmaAtividade {
  id: string;
  atividadeId: string;
  nome: string;
  diasSemana: string[];
  horarioInicio: string;
  horarioFim: string;
  seriesPermitidas: string[];
  nivel?: string;
  vagas: number;
  status: 'Ativa' | 'Inativa';
}

// Adapt Curso to bridge the old structure with TurmaAtividade
export interface Curso {
  id: string;
  nome: string; // Full name: "Activity Name (Turma Name)"
  atividadeId: string;
  atividadeNome: string;
  atividadeGrupo: string;
  diasSemana: string[];
  horarioInicio: string;
  horarioFim: string;
  seriesPermitidas: string[];
  nivel?: string;
  vagas: number;
  vagasOcupadas: number;
  reservasAtivas?: number;
  status: 'Ativa' | 'Inativa' | 'ativo' | 'inativo';
  // Date validations from backend
  geralAtivo?: boolean;
  grupoAtivo?: boolean;
  atividadeAtiva?: boolean;
  grupoPeriodo?: { dataInicio: string; dataFim: string; status: 'aberto' | 'fechado' };
  atividadePeriodo?: { dataInicio: string; dataFim: string; status: 'aberto' | 'fechado' };
}

export interface Inscricao {
  id: string;
  estudanteId: string;
  turmaAtividadeId: string;
  cursoId?: string; // backwards compatibility
  data: string;
  nomeAluno: string;
  matricula: string;
  turma: string; // student's class
  nomeCurso: string; // activity name
}

export interface Periodo {
  id: string;
  dataInicio: string;
  dataFim: string;
  status: 'aberto' | 'fechado';
}

export interface PeriodoGrupo {
  grupo: string;
  dataInicio: string;
  dataFim: string;
  status: 'aberto' | 'fechado';
}

export interface Boletim {
  id: string; turmaId: string; estudanteId: string; professor: string;
  midTerm: number; endOfTerm: number; listening: number; speaking: number; performance: number;
  comentario: string; status: 'rascunho' | 'finalizado'; criadoEm: string; atualizadoEm: string;
}

