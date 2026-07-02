import { Curso, Inscricao } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle, Users, AlertCircle, AlertTriangle, Clock } from 'lucide-react';

interface Props {
  trimestre: number;
  cursos: Curso[];
  selectedCurso: Curso | null;
  onSelectCurso: (curso: Curso) => void;
  onConfirm: () => void;
  error: string;
  timer: number;
  inscricoesAnteriores?: Inscricao[];
}

const CourseSelection = ({ trimestre, cursos, selectedCurso, onSelectCurso, onConfirm, error, timer, inscricoesAnteriores = [] }: Props) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="shadow-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          Cursos Disponíveis — {trimestre}º Trimestre
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3.5 rounded-xl mb-4 flex items-center gap-2.5 font-medium animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {cursos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">Nenhum curso disponível para sua série e turno neste trimestre.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
            {cursos.map(curso => {
              const vagasReservadas = curso.reservasAtivas || 0;
              const totalOcupadas = curso.vagasOcupadas + vagasReservadas;
              const isSelected = selectedCurso?.id === curso.id;
              
              // Only "lotado" if it's full AND not selected by current user
              const lotado = totalOcupadas >= curso.vagas && !isSelected;
              
              const percentVagas = (totalOcupadas / curso.vagas) * 100;

              // Check if already taken in ANY previous enrollment
              const alreadyTaken = inscricoesAnteriores.some(i => 
                i.cursoId === curso.id || i.nomeCurso === curso.nome
              );

              const isDisabled = lotado || alreadyTaken;

              return (
                <button
                  key={curso.id}
                  onClick={() => !isDisabled && onSelectCurso(curso)}
                  disabled={isDisabled}
                  className={`group p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                    isDisabled
                      ? 'border-muted bg-muted/20 opacity-70 cursor-not-allowed'
                      : isSelected
                      ? 'border-primary bg-primary/5 shadow-glow'
                      : 'border-border hover:border-primary/40 hover:bg-primary/[0.02]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-foreground text-sm leading-tight">{curso.nome}</h3>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center shrink-0">
                        <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Vacancy progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                        <Users className="w-3 h-3" /> Vagas
                      </span>
                      <span className={`font-bold ${lotado ? 'text-destructive' : percentVagas > 80 && !isSelected ? 'text-warning' : 'text-foreground'}`}>
                        {totalOcupadas}/{curso.vagas}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full progress-fill ${
                          lotado ? 'bg-destructive' : (percentVagas > 80 && !isSelected) ? 'bg-warning' : 'gradient-primary'
                        }`}
                        style={{ width: `${percentVagas}%` }}
                      />
                    </div>
                  </div>

                  {lotado && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-destructive font-semibold">
                      <AlertTriangle className="w-3 h-3" />
                      Limite de vagas atingido
                    </div>
                  )}

                  {alreadyTaken && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Você já realizou este curso
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selectedCurso && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in bg-primary/5 p-5 rounded-2xl border border-primary/20 shadow-sm">
            <div className="flex items-center gap-3.5 text-primary font-medium">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-primary/60 uppercase tracking-widest font-bold">Tempo para finalizar</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-mono font-bold leading-none">{formatTime(timer)}</span>
                  <span className="text-xs opacity-60">min</span>
                </div>
              </div>
            </div>
            <Button onClick={onConfirm} className="gradient-primary rounded-xl h-12 px-8 font-semibold shadow-glow w-full sm:w-auto text-base">
              Confirmar Inscrição
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CourseSelection;
