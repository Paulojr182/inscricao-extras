import { Estudante } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

interface Props {
  estudante: Estudante;
}

const StudentInfo = ({ estudante }: Props) => {
  const fields = [
    { label: 'Nome', value: estudante.nome },
    { label: 'Matrícula', value: estudante.matricula },
    { label: 'E-mail', value: estudante.email },
    { label: 'Turno', value: estudante.turno },
    { label: 'Série', value: estudante.serie },
    { label: 'Turma', value: estudante.turma },
  ];

  return (
    <Card className="shadow-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          Meus Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 stagger-children">
          {fields.map(({ label, value }) => (
            <div key={label} className="space-y-0.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
              <p className="text-sm font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentInfo;
