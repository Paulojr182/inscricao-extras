import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Construction } from 'lucide-react';

const RelatoriosTab = () => (
  <div className="flex min-h-[60vh] items-center justify-center animate-fade-in">
    <Card className="w-full max-w-2xl border-primary/15 shadow-card">
      <CardContent className="flex flex-col items-center px-8 py-16 text-center">
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <BarChart3 className="h-11 w-11" />
          <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border-4 border-background bg-amber-100 text-amber-700">
            <Construction className="h-4 w-4" />
          </span>
        </div>
        <span className="mb-3 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
          Em desenvolvimento
        </span>
        <h2 className="font-display text-3xl font-extrabold text-foreground">Relatórios</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Estamos preparando uma nova área de relatórios e indicadores. Em breve, você poderá acompanhar e exportar os dados do sistema por aqui.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default RelatoriosTab;