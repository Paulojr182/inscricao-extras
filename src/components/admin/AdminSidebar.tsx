import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, BookOpen, LayoutDashboard, Users, Upload, FileText, Calendar, TrendingUp, Settings, Moon, Sun, GraduationCap } from 'lucide-react';

export type AdminTab = 'dashboard' | 'auditoria' | 'cursos' | 'datasInscricao' | 'turmas' | 'estudantes' | 'importar' | 'importarHistorico' | 'relatorios' | 'boletim' | 'configuracoes';

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'boletim', label: 'Boletim Escolar', icon: <GraduationCap /> },
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'auditoria', label: 'Auditoria', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'cursos', label: 'Atividades e Turmas', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'datasInscricao', label: 'Data de Inscrição', icon: <Calendar className="w-4 h-4" /> },
  { id: 'estudantes', label: 'Estudantes', icon: <Users className="w-4 h-4" /> },
  { id: 'importar', label: 'Importar Estudantes', icon: <Upload className="w-4 h-4" /> },
  { id: 'importarHistorico', label: 'Importar Histórico', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'relatorios', label: 'Relatórios', icon: <FileText className="w-4 h-4" /> },
  { id: 'configuracoes', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
];

import { useAuth } from '@/contexts/AuthContext';

const AdminSidebar = ({ activeTab, onTabChange, onLogout, isDarkMode, onToggleDarkMode }: Props) => {
  const { hasPermission, usuario } = useAuth();

  // Filter tabs based on permissions
  const filteredTabs = tabs.filter(t => hasPermission(t.id, 'read') && (t.id !== 'boletim' || !usuario?.grupoAdmin || usuario.grupoAdmin === 'Language School'));

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-[260px] gradient-hero h-screen sticky top-0 p-5 hidden md:flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 mb-10 px-1">
          <div className="w-10 h-10 rounded-xl glass flex items-center justify-center overflow-hidden">
            <img src="/favicon.png" className="w-full h-full object-cover p-1.5" alt="Logo" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-primary-foreground font-display uppercase tracking-tight">Inscrições</h1>
            <p className="text-[11px] text-primary-foreground/50 font-medium">Painel Administrativo</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto pr-1 -mr-1">
          {filteredTabs.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                activeTab === t.id
                  ? 'glass text-primary-foreground font-semibold'
                  : 'text-primary-foreground/50 hover:text-primary-foreground/80 hover:bg-primary-foreground/5'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-primary-foreground/10 space-y-1">
          <Button
            variant="ghost"
            onClick={onToggleDarkMode}
            className="text-primary-foreground/40 hover:text-primary-foreground hover:bg-primary-foreground/10 w-full justify-start rounded-xl"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 mr-2" />
            ) : (
              <Moon className="w-4 h-4 mr-2" />
            )}
            {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
          </Button>
          <Button
            variant="ghost"
            onClick={onLogout}
            className="text-primary-foreground/40 hover:text-primary-foreground hover:bg-primary-foreground/10 w-full justify-start rounded-xl"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 gradient-hero z-20 p-3 shadow-elevated">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg glass flex items-center justify-center overflow-hidden">
              <img src="/favicon.png" className="w-full h-full object-cover p-1" alt="Logo" />
            </div>
            <h1 className="text-sm font-bold text-primary-foreground font-display">Inscrições</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onToggleDarkMode} className="text-primary-foreground/60 p-2">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-primary-foreground/60 p-2">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {filteredTabs.map(t => (
            <button
               key={t.id}
               onClick={() => onTabChange(t.id)}
               className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                 activeTab === t.id
                   ? 'glass text-primary-foreground'
                   : 'text-primary-foreground/40'
               }`}
             >
               {t.label}
             </button>
           ))}
         </div>
      </div>
    </>
  );
};

export default AdminSidebar;
