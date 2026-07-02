import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getInscricaoStatus, 
  getCursos, 
  getInscricoesByEstudante, 
  realizarInscricao, 
  cancelarInscricao 
} from '@/lib/dataStore';
import { Curso, Inscricao } from '@/types';
import StudentHeader from '@/components/student/StudentHeader';
import StudentInfo from '@/components/student/StudentInfo';
import ConfirmModal from '@/components/student/ConfirmModal';
import Comprovante from '@/components/student/Comprovante';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  CheckCircle, 
  Users, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Trash2, 
  Download, 
  Lock 
} from 'lucide-react';
import { toast } from 'sonner';

const formatSeriesRange = (series: string[]): string => {
  if (!series || series.length === 0) return '';
  
  // Normalizar e remover duplicados
  const unique = Array.from(new Set(series.map(s => s.trim()))).filter(Boolean);
  if (unique.length === 1) return unique[0];

  // Caso seja Ensino Fundamental Anos Iniciais (1º ao 5º Ano)
  const isEFAI = unique.every(s => ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'].includes(s));
  if (isEFAI && unique.length === 5) return '1º Ano ao 5º Ano';

  // Caso seja Ensino Fundamental Anos Finais (6º ao 9º Ano)
  const isEFAF = unique.every(s => ['6º Ano', '7º Ano', '8º Ano', '9º Ano'].includes(s));
  if (isEFAF && unique.length === 4) return '6º Ano ao 9º Ano';

  // Caso seja Ensino Médio (1ª a 3ª Série)
  const isEM = unique.every(s => ['1ª Série', '2ª Série', '3ª Série', '3ª SÉRIE'].includes(s));
  if (isEM && unique.length >= 3) return '1ª Série à 3ª Série EM';

  // Caso seja de 6º Ano até o Ensino Médio completo
  const has6to9 = ['6º Ano', '7º Ano', '8º Ano', '9º Ano'].every(s => unique.includes(s));
  const has1to3 = ['1ª Série', '2ª Série', '3ª Série'].some(s => unique.includes(s)) || unique.includes('3ª SÉRIE');
  if (has6to9 && has1to3) return '6º Ano à 3ª Série EM';

  // Caso seja Educação Infantil (Infantil 2 ao 5)
  const isInfantil = unique.every(s => s.includes('Infantil'));
  if (isInfantil) {
    const numbers = unique.map(s => parseInt(s.replace(/\D/g, ''))).filter(n => !isNaN(n));
    if (numbers.length > 0) {
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);
      if (min === max) return `Infantil ${min}`;
      return `Infantil ${min} ao Infantil ${max}`;
    }
  }

  // Fallback: junta os itens e formata com vírgulas e "e" no final
  return unique.join(', ').replace(/, ([^,]*)$/, ' e $1');
};

const StudentDashboard = () => {
  const { estudante } = useAuth();
  const [allCursos, setAllCursos] = useState<Curso[]>([]);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [statusInscricao, setStatusInscricao] = useState<'disponivel' | 'nao_iniciado' | 'finalizado'>('nao_iniciado');
  const [loading, setLoading] = useState(true);
  
  // Selected course to enroll
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [comprovante, setComprovante] = useState<Inscricao | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('Centro Cultural Santa Catarina');
  
  const comprovanteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (estudante) {
      loadData();
    }
  }, [estudante]);

  const loadData = async () => {
    if (!estudante) return;
    setLoading(true);
    try {
      const [status, cursosData, inscricoesData] = await Promise.all([
        getInscricaoStatus(),
        getCursos(),
        getInscricoesByEstudante(estudante.id)
      ]);
      setStatusInscricao(status);
      setAllCursos(cursosData);
      setInscricoes(inscricoesData);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      toast.error('Erro ao carregar dados do servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Filter courses/turmas compatible with student's grade/series
  const eligibleCursos = allCursos.filter(c => {
    return c.seriesPermitidas && c.seriesPermitidas.includes(estudante?.serie || '');
  });

  // Group eligible courses by their activity group/category
  const groups: Record<string, Curso[]> = {
    'Centro Cultural Santa Catarina': [],
    'Language School': [],
    'Santa Esportes': []
  };

  eligibleCursos.forEach(c => {
    const grp = c.atividadeGrupo || 'Centro Cultural Santa Catarina';
    if (!groups[grp]) {
      groups[grp] = [];
    }
    groups[grp].push(c);
  });

  // Check if a course has a scheduling conflict with any of the current enrollments
  const getConflictError = (targetCurso: Curso): string | null => {
    // If already enrolled in this specific turma, return error
    if (inscricoes.some(i => i.turmaAtividadeId === targetCurso.id)) {
      return 'Você já está matriculado nesta turma.';
    }

    const targetDays = targetCurso.diasSemana || [];
    const targetStart = targetCurso.horarioInicio;
    const targetEnd = targetCurso.horarioFim;

    for (const ins of inscricoes) {
      const matchCurso = allCursos.find(c => c.id === ins.turmaAtividadeId);
      if (!matchCurso) continue;

      const matchDays = matchCurso.diasSemana || [];
      const matchStart = matchCurso.horarioInicio;
      const matchEnd = matchCurso.horarioFim;

      const hasCommonDay = targetDays.some(d => matchDays.includes(d));
      if (hasCommonDay) {
        if (targetStart < matchEnd && matchStart < targetEnd) {
          return 'Você já possui uma atividade cadastrada neste dia e horário.';
        }
      }
    }
    return null;
  };

  const handleInscrever = async () => {
    if (!selectedCurso || !estudante) return;
    
    // Check conflicts/dates again
    const conflict = getConflictError(selectedCurso);
    if (conflict) {
      toast.error(conflict);
      setShowConfirmModal(false);
      return;
    }

    if (selectedCurso.geralAtivo === false) {
      toast.error('O período geral de inscrições está fechado.');
      return;
    }
    if (selectedCurso.grupoAtivo === false) {
      toast.error('O período de inscrições para este grupo de atividades está fechado.');
      return;
    }
    if (selectedCurso.atividadeAtiva === false) {
      toast.error('As inscrições para esta atividade específica estão fechadas.');
      return;
    }

    try {
      const result = await realizarInscricao({
        estudanteId: estudante.id,
        turmaAtividadeId: selectedCurso.id
      });

      if (result.success && result.inscricao) {
        toast.success('Inscrição realizada com sucesso!');
        setShowConfirmModal(false);
        setSelectedCurso(null);
        await loadData();
        setComprovante(result.inscricao);
      } else {
        toast.error(result.message || 'Erro ao realizar inscrição.');
        setShowConfirmModal(false);
      }
    } catch (err) {
      console.error('Erro na inscrição:', err);
      toast.error('Erro de conexão ao processar inscrição.');
    }
  };

  const handleCancelar = async (inscricaoId: string) => {
    if (!confirm('Deseja realmente cancelar sua inscrição nesta atividade?')) return;
    try {
      const res = await cancelarInscricao(inscricaoId);
      if (res.success) {
        toast.success(res.message);
        await loadData();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao cancelar inscrição.');
    }
  };

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return 'N/D';
    return new Date(isoStr).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!estudante) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Erro ao carregar dados do estudante. Tente fazer login novamente.</p>
      </div>
    );
  }

  // Determine if the General Period is active
  // Since all courses carry the geralAtivo flag, we can check the first eligible course or just statusInscricao
  const isGeralAtivo = statusInscricao === 'disponivel';

  return (
    <div className="min-h-screen bg-background pb-12">
      <StudentHeader />
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <StudentInfo estudante={estudante} />

        {/* Banners for General Period Closure */}
        {!isGeralAtivo && (
          <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-2xl flex items-center gap-3 border border-destructive/20 font-bold animate-fade-in">
            <Lock className="w-5 h-5 flex-shrink-0" />
            <div>
              <span>O período de inscrições gerais está fechado ou suspenso manualmente.</span>
              <p className="text-xs opacity-80 font-normal mt-0.5">As inscrições só podem ser realizadas quando a coordenação geral liberar.</p>
            </div>
          </div>
        )}

        {/* ─── My Enrollments (Minhas Matrículas) ─── */}
        <Card className="shadow-card border-none bg-card overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <CardTitle className="flex items-center gap-2.5 text-base font-bold">
              <CheckCircle className="w-5 h-5 text-success" />
              Minhas Inscrições Extracurriculares ({inscricoes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {inscricoes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm font-medium">
                Você ainda não realizou nenhuma inscrição extracurricular.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inscricoes.map(ins => {
                  const matchingTurma = allCursos.find(c => c.id === ins.turmaAtividadeId);
                  return (
                    <div 
                      key={ins.id} 
                      className="flex flex-col justify-between p-5 rounded-2xl border border-border bg-card/60 hover:bg-card transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge className="mb-1.5" variant="secondary">
                              {matchingTurma?.atividadeGrupo || 'Extracurricular'}
                            </Badge>
                            <h4 className="font-extrabold text-base text-foreground leading-tight">
                              {ins.nomeCurso}
                            </h4>
                            {matchingTurma && (
                              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                {formatSeriesRange(matchingTurma.seriesPermitidas)}
                                {matchingTurma.nivel && matchingTurma.nivel !== 'Geral' ? ` – Nível ${matchingTurma.nivel}` : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        {matchingTurma && (
                          <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                            <p className="flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-primary/75" />
                              {matchingTurma.diasSemana?.join(', ')}
                            </p>
                            <p className="flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-primary/75" />
                              {matchingTurma.horarioInicio} às {matchingTurma.horarioFim}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2.5 mt-5 pt-4 border-t border-border/50">
                        <Button 
                          onClick={() => setComprovante(ins)} 
                          size="sm" 
                          variant="outline" 
                          className="rounded-xl w-full text-xs font-bold"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" /> Comprovante
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Available Activities ─── */}
        <div className="space-y-8">
          <h2 className="text-xl font-black text-foreground tracking-wider flex items-center gap-2 font-display">
            <BookOpen className="w-5 h-5 text-primary" />
            Atividades Disponíveis para {estudante.serie}
          </h2>

          {/* Selector Tabs */}
          <div className="flex flex-col sm:flex-row border-b border-border/60 gap-2 pb-2 sm:pb-px overflow-x-auto">
            {Object.keys(groups).map((groupName) => {
              const count = groups[groupName]?.length || 0;
              const isActive = selectedGroup === groupName;
              return (
                <button
                  key={groupName}
                  onClick={() => setSelectedGroup(groupName)}
                  className={`px-4 py-3 sm:py-2.5 text-xs font-bold uppercase tracking-wider whitespace-normal sm:whitespace-nowrap border-b-2 sm:border-b-2 text-center transition-all rounded-xl sm:rounded-none sm:rounded-t-xl ${
                    isActive
                      ? 'border-primary text-primary bg-primary/10 sm:bg-primary/5 font-extrabold'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 bg-muted/20 sm:bg-transparent'
                  }`}
                >
                  {groupName} ({count})
                </button>
              );
            })}
          </div>

          {(() => {
            const cursos = groups[selectedGroup] || [];
            if (cursos.length === 0) {
              return (
                <div className="text-center py-12 border border-dashed border-border/80 rounded-2xl bg-muted/5">
                  <p className="text-muted-foreground text-sm font-medium">Nenhuma atividade disponível para sua série neste grupo.</p>
                </div>
              );
            }

            // Check if this group's date window is open
            const sampleCurso = cursos[0];
            const isGroupAtivo = sampleCurso?.grupoAtivo !== false;
            const groupPeriod = sampleCurso?.grupoPeriodo;

            return (
              <div className="space-y-4">
                <div className="border-b border-border pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-lg font-extrabold text-primary font-display">
                    {selectedGroup}
                  </h3>
                  {!isGroupAtivo && (
                    <span className="text-xs font-bold text-destructive flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Inscrições do grupo fora do prazo
                      {groupPeriod?.dataInicio && ` (Abre em ${formatDateTime(groupPeriod.dataInicio)})`}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cursos.map(curso => {
                    const isEnrolled = inscricoes.some(i => i.turmaAtividadeId === curso.id);
                    const isLotado = (curso.vagasOcupadas || 0) >= curso.vagas;
                    const conflict = getConflictError(curso);
                    const isAtiva = (curso.status || 'Ativa').toLowerCase() === 'ativa' || (curso.status || 'Ativa').toLowerCase() === 'ativo';

                    // Check hierarchical date constraints
                    const isActAtiva = curso.atividadeAtiva !== false;
                    const actPeriod = curso.atividadePeriodo;

                    // Disable condition
                    const isDisabled = !isGeralAtivo || !isGroupAtivo || !isActAtiva;

                    if (!isAtiva) return null;

                    return (
                      <div 
                        key={curso.id} 
                        className={`flex flex-col justify-between p-5 rounded-2xl border-2 transition-all ${
                          isEnrolled
                            ? 'border-success/40 bg-success/[0.02]'
                            : conflict
                            ? 'border-muted/60 bg-muted/10 opacity-75'
                            : isDisabled
                            ? 'border-muted bg-muted/5 opacity-70'
                            : 'border-border bg-card hover:border-primary/40 hover:bg-primary/[0.01]'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-extrabold text-foreground text-sm md:text-base leading-tight">
                                {curso.atividadeNome}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatSeriesRange(curso.seriesPermitidas)}
                                {curso.nivel && curso.nivel !== 'Geral' ? ` – Nível ${curso.nivel}` : ''}
                              </p>
                            </div>
                            {isEnrolled && (
                              <Badge className="bg-success hover:bg-success text-success-foreground font-bold">
                                Matriculado
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2 mt-4">
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                              <Calendar className="w-4 h-4 text-primary/75" />
                              <span>{curso.diasSemana?.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                              <Clock className="w-4 h-4 text-primary/75" />
                              <span>{curso.horarioInicio} às {curso.horarioFim}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                              <Users className="w-4 h-4 text-primary/75" />
                              <span>Vagas: {curso.vagasOcupadas || 0} / {curso.vagas}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-border/50">
                          {isEnrolled ? (
                            <div className="bg-success/5 text-success border border-success/20 text-xs p-2.5 rounded-xl font-bold flex items-center gap-1.5 justify-center">
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span>Inscrição Confirmada</span>
                            </div>
                          ) : !isGeralAtivo ? (
                            <div className="bg-destructive/5 text-destructive border border-destructive/10 text-[10px] p-2.5 rounded-xl font-medium flex items-center gap-1.5 justify-center">
                              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>Inscrições gerais bloqueadas</span>
                            </div>
                          ) : !isGroupAtivo ? (
                            <div className="bg-destructive/5 text-destructive border border-destructive/10 text-[10px] p-2.5 rounded-xl font-medium flex items-center gap-1.5 justify-center">
                              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>Grupo fechado para inscrição</span>
                            </div>
                          ) : !isActAtiva ? (
                            <div className="bg-destructive/5 text-destructive border border-destructive/10 text-[10px] p-2.5 rounded-xl font-medium flex flex-col items-center gap-0.5 justify-center">
                              <span className="flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 flex-shrink-0" /> Atividade indisponível
                              </span>
                              {actPeriod?.dataInicio && (
                                <span className="text-[9px] opacity-75 font-normal">
                                  Abre em: {formatDateTime(actPeriod.dataInicio)}
                                </span>
                              )}
                            </div>
                          ) : conflict ? (
                            <div className="bg-destructive/5 text-destructive border border-destructive/10 text-[11px] p-2.5 rounded-xl font-medium flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              <span>{conflict}</span>
                            </div>
                          ) : isLotado ? (
                            <Button 
                              disabled 
                              variant="outline" 
                              size="sm" 
                              className="w-full rounded-xl font-bold text-xs cursor-not-allowed opacity-60"
                            >
                              Vagas Esgotadas
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => {
                                setSelectedCurso(curso);
                                setShowConfirmModal(true);
                              }}
                              size="sm" 
                              className="w-full gradient-primary rounded-xl font-bold text-xs text-primary-foreground shadow-sm shadow-primary/10"
                            >
                              Inscrever-se
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </main>

      {showConfirmModal && selectedCurso && (
        <ConfirmModal
          curso={selectedCurso}
          estudante={estudante}
          onConfirm={handleInscrever}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {comprovante && (
        <Comprovante 
          inscricao={comprovante} 
          onClose={() => setComprovante(null)} 
          comprovanteRef={comprovanteRef} 
        />
      )}
    </div>
  );
};

export default StudentDashboard;
