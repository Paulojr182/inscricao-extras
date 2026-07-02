import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar, { AdminTab } from '@/components/admin/AdminSidebar';
import DashboardTab from '@/components/admin/DashboardTab';
import CursosTab from '@/components/admin/CursosTab';
import DatasInscricaoTab from '@/components/admin/DatasInscricaoTab';
import EstudantesTab from '@/components/admin/EstudantesTab';
import ImportarTab from '@/components/admin/ImportarTab';
import RelatoriosTab from '@/components/admin/RelatoriosTab';
import AuditoriaTab from '@/components/admin/AuditoriaTab';
import ConfiguracoesTab from '@/components/admin/ConfiguracoesTab';
import ImportarHistoricoTab from '@/components/admin/ImportarHistoricoTab';
import BoletimTab from '@/components/admin/BoletimTab';

const AdminDashboard = () => {
  const { logout, usuario } = useAuth();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('admin-dark-mode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('admin-dark-mode', String(isDarkMode));
  }, [isDarkMode]);

  // Enforce permissions: if current tab is not allowed, redirect to first allowed
  useEffect(() => {
    if (usuario?.permissoes && !usuario.permissoes.includes('*')) {
      if (!usuario.permissoes.some(p => p === tab || p.startsWith(`${tab}:`))) {
        // Find first allowed tab
        const allowedTabs: AdminTab[] = ['dashboard', 'auditoria', 'cursos', 'datasInscricao', 'estudantes', 'importar', 'importarHistorico', 'relatorios', 'boletim', 'configuracoes'];
        const firstAllowed = allowedTabs.find(t => usuario.permissoes?.some(p => p === t || p.startsWith(`${t}:`)));
        if (firstAllowed) setTab(firstAllowed);
      }
    }
  }, [usuario, tab]);

  return (
    <div className={`min-h-screen bg-background flex ${isDarkMode ? 'dark' : ''}`}>
      <AdminSidebar 
        activeTab={tab} 
        onTabChange={setTab} 
        onLogout={logout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
      <main className="flex-1 p-6 md:p-8 mt-[88px] md:mt-0 overflow-auto">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'auditoria' && <AuditoriaTab />}
        {tab === 'cursos' && <CursosTab />}
        {tab === 'datasInscricao' && <DatasInscricaoTab />}
        {tab === 'estudantes' && <EstudantesTab />}
        {tab === 'importar' && <ImportarTab />}
        {tab === 'importarHistorico' && <ImportarHistoricoTab />}
        {tab === 'relatorios' && <RelatoriosTab />}
        {tab === 'boletim' && (!usuario?.grupoAdmin || usuario.grupoAdmin === 'Language School') && <BoletimTab />}
        {tab === 'configuracoes' && <ConfiguracoesTab />}
      </main>
    </div>
  );
};

export default AdminDashboard;
