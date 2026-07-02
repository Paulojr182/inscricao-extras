import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, BookOpen } from 'lucide-react';

const StudentHeader = () => {
  const { estudante, logout } = useAuth();
  if (!estudante) return null;

  return (
    <header className="gradient-hero no-print sticky top-0 z-20">
      <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl glass flex items-center justify-center overflow-hidden">
            <img src="/favicon.png" className="w-full h-full object-cover p-1.5" alt="Logo" />
          </div>
          <div>
            <h1 className="text-base font-bold text-primary-foreground font-display uppercase tracking-tight">Inscrições</h1>
            <p className="text-[11px] text-primary-foreground/50 font-medium">Área do Estudante</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass rounded-full px-3.5 py-1.5 hidden sm:block">
            <span className="text-xs font-medium text-primary-foreground/90">{estudante.nome}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-xl"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default StudentHeader;
