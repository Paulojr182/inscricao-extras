import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle, Lock, Clock, XCircle } from 'lucide-react';
import { Inscricao } from '@/types';

interface TrimestreInfo {
  numero: 1 | 2 | 3;
  status: string;
  jaInscrito: boolean;
  inscricao?: Inscricao;
}

interface Props {
  trimestres: TrimestreInfo[];
  selectedTrimestre: 1 | 2 | 3 | null;
  onSelect: (t: 1 | 2 | 3) => void;
}

const TrimestreSelector = ({ trimestres, selectedTrimestre, onSelect }: Props) => {
  const statusConfig = (status: string, jaInscrito: boolean, nomeCurso?: string) => {
    if (jaInscrito) return {
      badge: <Badge className="bg-success/15 text-success border-success/20 text-[11px] font-semibold"><CheckCircle className="w-3 h-3 mr-1" /> Inscrito</Badge>,
      icon: <CheckCircle className="w-5 h-5 text-success" />,
    };
    if (status === 'disponivel') return {
      badge: <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] font-semibold animate-pulse-soft"><Clock className="w-3 h-3 mr-1" /> Disponível</Badge>,
      icon: <Clock className="w-5 h-5 text-primary" />,
    };
    if (status === 'nao_iniciado') return {
      badge: <Badge variant="outline" className="text-[11px] font-semibold"><Lock className="w-3 h-3 mr-1" /> Não iniciado</Badge>,
      icon: <Lock className="w-5 h-5 text-muted-foreground" />,
    };
    return {
      badge: <Badge variant="secondary" className="text-[11px] font-semibold bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" /> Inscrição encerrada</Badge>,
      icon: <XCircle className="w-5 h-5 text-destructive" />,
    };
  };

  return (
    <Card className="shadow-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          Trimestres
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 stagger-children">
          {trimestres.map(t => {
            const config = statusConfig(t.status, t.jaInscrito, t.inscricao?.nomeCurso);
            const isActive = selectedTrimestre === t.numero;
            const isClosed = t.status === 'finalizado';
            const canSelect = (t.status === 'disponivel' && !t.jaInscrito) || t.jaInscrito || isClosed;

            return (
              <button
                key={t.numero}
                onClick={() => canSelect && onSelect(t.numero)}
                className={`group p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                  isActive
                    ? isClosed
                      ? 'border-destructive bg-destructive/5 shadow-md'
                      : t.jaInscrito
                      ? 'border-success bg-success/5 shadow-md'
                      : 'border-primary bg-primary/5 shadow-glow'
                    : isClosed
                    ? 'border-destructive/30 bg-destructive/[0.03] hover:border-destructive/60 cursor-pointer'
                    : t.jaInscrito
                    ? 'border-success/30 bg-success/5 hover:border-success/60 cursor-pointer'
                    : canSelect
                    ? 'border-border hover:border-primary/40 hover:bg-primary/[0.02] cursor-pointer'
                    : 'border-border opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isActive && !t.jaInscrito && !isClosed ? 'gradient-primary' : 
                      isClosed ? 'bg-destructive/10' :
                      t.jaInscrito ? 'bg-success/10' : 
                      'bg-muted'
                    }`}>
                      <span className={`text-sm font-extrabold ${
                        isActive && !t.jaInscrito && !isClosed ? 'text-primary-foreground' : 
                        isClosed ? 'text-destructive' :
                        t.jaInscrito ? 'text-success' : 
                        'text-muted-foreground'
                      }`}>{t.numero}º</span>
                    </div>
                    <span className="font-bold text-foreground text-sm">
                      Trimestre {isClosed && <span className="text-destructive block text-[10px] font-black uppercase tracking-tighter mt-0.5">Inscrição Encerrada</span>}
                    </span>
                  </div>
                </div>
                <div className="mt-2">{config.badge}</div>
                {t.jaInscrito && t.inscricao && (
                  <div className={`mt-3 p-2.5 rounded-lg border ${isClosed ? 'bg-destructive/[0.02] border-destructive/10' : 'bg-success/5 border-success/10'}`}>
                    <p className={`text-xs font-semibold flex items-center gap-1.5 truncate ${isClosed ? 'text-destructive/80' : 'text-success'}`} title={t.inscricao.nomeCurso}>
                      <CheckCircle className="w-3 h-3 shrink-0" />
                      <span className="truncate">{t.inscricao.nomeCurso}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Clique para ver o comprovante</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrimestreSelector;
