export interface Usuario {
  id: string;
  email: string;
  senha: string;
  tipo: 'admin' | 'estudante';
  permissoes?: string[];
  estudanteId?: string;
  grupoAdmin?: string;
  nome?: string;
  isProfessor?: boolean;
  turmaIds?: string[];
}

export interface Boletim {
  id: string;
  turmaId: string;
  estudanteId: string;
  professor: string;
  midTerm: number;
  endOfTerm: number;
  listening: number;
  speaking: number;
  performance: number;
  comentario: string;
  status: 'rascunho' | 'finalizado';
  criadoEm: string;
  atualizadoEm: string;
}
