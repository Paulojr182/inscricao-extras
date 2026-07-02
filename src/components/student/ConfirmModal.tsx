import { Curso, Estudante } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  curso: Curso;
  estudante: Estudante;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal = ({ curso, estudante, onConfirm, onCancel }: Props) => {
  return (
    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print animate-fade-in">
      <Card className="w-full max-w-md shadow-elevated animate-scale-in rounded-2xl overflow-hidden">
        <CardHeader className="gradient-primary rounded-t-2xl">
          <CardTitle className="text-primary-foreground flex items-center gap-2 text-lg">
            <AlertCircle className="w-5 h-5" /> Confirmar Inscrição
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="bg-destructive/10 text-destructive text-sm p-3.5 rounded-xl flex items-center gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Revise os dados abaixo e confirme sua inscrição.
          </div>
          <div className="bg-muted/50 p-5 rounded-xl space-y-3 border border-border">
            {[
              ['Atividade', curso.atividadeNome],
              ['Turma', curso.nome],
              ['Horário', `${curso.diasSemana?.join(', ')} - ${curso.horarioInicio} às ${curso.horarioFim}`],
              ['Aluno', estudante.nome],
              ['Matrícula', estudante.matricula],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-start gap-4">
                <span className="text-xs text-muted-foreground font-medium shrink-0 mt-0.5">{label}</span>
                <span className="text-sm font-bold text-foreground text-right">{value}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onCancel} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={onConfirm} className="gradient-primary rounded-xl font-semibold">
              Confirmar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmModal;

