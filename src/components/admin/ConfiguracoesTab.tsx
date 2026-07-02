import { useState, useEffect } from 'react';
import { getAtividades, getTurmas, getUsuarios, setUsuarios } from '@/lib/dataStore';
import { TurmaAtividade, Usuario } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, ShieldCheck, UserPlus, Lock, CheckCircle2, Database, Download, Upload } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const handleDownloadBackup = async () => {
    try {
      const toastId = toast.loading('Gerando backup seguro...');
      const response = await fetch('/api/backup', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('optativas_token')}` }
      });
      
      if (!response.ok) throw new Error('Falha ao baixar backup');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_course_connect_${new Date().toISOString().split('T')[0]}.sqlite`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss(toastId);
      toast.success('Backup concluído com sucesso!');
    } catch (err) {
      toast.error('Erro ao baixar o backup.');
    }
  };

const availableMenus = [
  { id: 'boletim', label: 'Boletim Escolar' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'auditoria', label: 'Auditoria' },
  { id: 'cursos', label: 'Cursos' },
  { id: 'datasInscricao', label: 'Data de Inscrição' },
  { id: 'turmas', label: 'Turmas' },
  { id: 'estudantes', label: 'Estudantes' },
  { id: 'importar', label: 'Importar CSV' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'configuracoes', label: 'Configurações' },
];

const ConfiguracoesTab = () => {
  const { usuario: currentUser, hasPermission, logout } = useAuth();
  const canEdit = hasPermission('configuracoes', 'write');
  const [admins, setAdmins] = useState<Usuario[]>([]);
  const [languageClasses, setLanguageClasses] = useState<TurmaAtividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    permissoes: ['*'] as string[],
    grupoAdmin: '',
    isProfessor: false,
    turmaIds: [] as string[]
  });

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    const [allUsers, atividades, turmas] = await Promise.all([getUsuarios(), getAtividades(), getTurmas()]);
    const languageActivityIds = new Set(atividades.filter(a => a.grupo === 'Language School').map(a => a.id));
    setAdmins(allUsers.filter(u => u.tipo === 'admin'));
    setLanguageClasses(turmas.filter(t => languageActivityIds.has(t.atividadeId)).sort((a,b) => a.nome.localeCompare(b.nome)));
    setLoading(false);
  };

  const handleRestoreDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.sqlite')) return toast.error('Selecione um arquivo .sqlite.');
    if (!confirm('A restauracao substituir? os dados atuais. Deseja continuar?')) return;
    const toastId = toast.loading('Restaurando banco de dados...');
    try {
      const response = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('optativas_token')}`, 'Content-Type': 'application/octet-stream' },
        body: file
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao restaurar banco.');
      toast.success('Banco restaurado. Entre novamente com o usuario do banco importado.');
      setTimeout(() => logout(), 1200);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao restaurar banco.');
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleOpenDialog = (admin?: Usuario) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        nome: admin.nome || '',
        email: admin.email,
        senha: admin.senha,
        permissoes: admin.permissoes || ['*'],
        grupoAdmin: admin.grupoAdmin || '',
        isProfessor: !!admin.isProfessor,
        turmaIds: admin.turmaIds || []
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        nome: '',
        email: '',
        senha: '',
        permissoes: ['*'],
        grupoAdmin: '',
        isProfessor: false,
        turmaIds: []
      });
    }
    setIsDialogOpen(true);
  };

  const getAccessLevel = (menuId: string): 'none' | 'read' | 'write' => {
    if (formData.permissoes.includes('*')) return 'write';
    if (formData.permissoes.includes(`${menuId}:write`)) return 'write';
    if (formData.permissoes.includes(`${menuId}:read`)) return 'read';
    return 'none';
  };

  const setAccessLevel = (menuId: string, level: 'none' | 'read' | 'write') => {
    setFormData(prev => {
      let current = prev.permissoes.filter(p => !p.startsWith(`${menuId}:`) && p !== '*');
      if (level === 'read') current.push(`${menuId}:read`);
      if (level === 'write') current.push(`${menuId}:write`);
      return { ...prev, permissoes: current };
    });
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast.error('Você não possui permissão de escrita para alterar configurações.');
      return;
    }

    if (!formData.email || !formData.senha) {
      toast.error('E-mail e senha são obrigatórios.');
      return;
    }

    if (formData.isProfessor && (!formData.nome.trim() || formData.turmaIds.length === 0)) {
      toast.error('Informe o nome da professora e selecione ao menos uma turma.');
      return;
    }

    if (formData.permissoes.length === 0) {
      toast.error('Selecione ao menos uma permissao de acesso.');
      return;
    }

    const allUsers = await getUsuarios();
    
    if (editingAdmin) {
      const updatedUsers = allUsers.map(u => 
        u.id === editingAdmin.id ? { 
          ...u, 
          email: formData.email, 
          senha: formData.senha, 
          permissoes: formData.isProfessor ? ['boletim:write'] : formData.permissoes,
          grupoAdmin: formData.grupoAdmin || undefined,
          nome: formData.nome.trim() || undefined,
          isProfessor: formData.isProfessor,
          turmaIds: formData.isProfessor ? formData.turmaIds : []
        } : u
      );
      await setUsuarios(updatedUsers);
      toast.success('Administrador atualizado com sucesso!');
    } else {
      if (allUsers.some(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
        toast.error('Este e-mail já está sendo usado por outro usuário.');
        return;
      }

      const newAdmin: Usuario = {
        id: crypto.randomUUID(),
        email: formData.email,
        senha: formData.senha,
        tipo: 'admin',
        permissoes: formData.isProfessor ? ['boletim:write'] : formData.permissoes,
        grupoAdmin: formData.grupoAdmin || undefined,
        nome: formData.nome.trim() || undefined,
        isProfessor: formData.isProfessor,
        turmaIds: formData.isProfessor ? formData.turmaIds : []
      };
      await setUsuarios([...allUsers, newAdmin]);
      toast.success('Novo administrador cadastrado!');
    }

    setIsDialogOpen(false);
    loadAdmins();
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      toast.error('Você não pode excluir sua própria conta.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este administrador?')) return;

    const allUsers = await getUsuarios();
    const updatedUsers = allUsers.filter(u => u.id !== id);
    await setUsuarios(updatedUsers);
    toast.success('Administrador removido.');
    loadAdmins();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground font-display">Configurações</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os administradores e permissões do sistema</p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleDownloadBackup} variant="outline" className="border-primary/20 text-primary shadow-sm hover:bg-primary/5">
            <Database className="w-4 h-4 mr-2" /> Backup do Banco
          </Button>
          <input id="restore-database" type="file" accept=".sqlite" className="hidden" onChange={handleRestoreDatabase} />
          <Button type="button" variant="outline" disabled={!currentUser?.permissoes?.includes('*')} onClick={() => document.getElementById('restore-database')?.click()} className="border-primary/20 text-primary shadow-sm hover:bg-primary/5">
            <Upload className="w-4 h-4 mr-2" /> Restaurar Banco
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canEdit} onClick={() => handleOpenDialog()} className="gradient-primary text-white shadow-button">
                <UserPlus className="w-4 h-4 mr-2" /> Novo Administrador
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAdmin ? 'Editar Administrador' : 'Cadastrar Administrador'}</DialogTitle>
              <DialogDescription>
                Defina as credenciais e o nível de acesso ao sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Nome completo" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin@escola.edu.br"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="grupoAdmin">Grupo de Atividades Permitido</Label>
                <select
                  id="grupoAdmin"
                  value={formData.grupoAdmin}
                  onChange={(e) => { const grupoAdmin=e.target.value; setFormData({ ...formData, grupoAdmin, isProfessor: grupoAdmin === 'Language School' ? formData.isProfessor : false, turmaIds: grupoAdmin === 'Language School' ? formData.turmaIds : [] }); }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Acesso Total (Todos os Grupos)</option>
                  <option value="Centro Cultural Santa Catarina">Centro Cultural Santa Catarina (CCSC)</option>
                  <option value="Language School">Language School</option>
                  <option value="Santa Esportes">Santa Esportes</option>
                </select>
              </div>

              {formData.grupoAdmin === 'Language School' && (
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2">
                    <Checkbox id="isProfessor" checked={formData.isProfessor} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isProfessor: checked === true, permissoes: checked ? ['boletim:write'] : [], turmaIds: checked ? prev.turmaIds : [] }))} />
                    <Label htmlFor="isProfessor" className="cursor-pointer font-semibold">E professora do Language School</Label>
                  </div>
                  {formData.isProfessor && (
                    <div className="space-y-2">
                      <Label>Turmas permitidas</Label>
                      <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border bg-background p-3 sm:grid-cols-2">
                        {languageClasses.map(turma => (
                          <label key={turma.id} className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-muted/50">
                            <Checkbox checked={formData.turmaIds.includes(turma.id)} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, turmaIds: checked ? [...prev.turmaIds, turma.id] : prev.turmaIds.filter(id => id !== turma.id) }))} />
                            {turma.nome}
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">A professora tera acesso somente ao Boletim Escolar e as turmas selecionadas.</p>
                    </div>
                  )}
                </div>
              )}

              <div className={formData.isProfessor ? 'hidden' : 'space-y-4'}>
                <Label className="text-base">Permissões de Acesso</Label>
                
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <Checkbox 
                    id="perm-total" 
                    checked={formData.permissoes.includes('*')}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        permissoes: checked ? ['*'] : [] 
                      }));
                    }}
                  />
                  <Label htmlFor="perm-total" className="text-sm font-bold flex items-center gap-2 cursor-pointer">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> Acesso Total (Todos os Menus)
                  </Label>
                </div>

                {!formData.permissoes.includes('*') && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-12 px-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                      <div className="col-span-6">Módulo</div>
                      <div className="col-span-2 text-center">Nenhum</div>
                      <div className="col-span-2 text-center">Leitura</div>
                      <div className="col-span-2 text-center">Escrita</div>
                    </div>
                    {availableMenus.map(menu => {
                      const level = getAccessLevel(menu.id);
                      return (
                        <div key={menu.id} className="grid grid-cols-12 items-center p-2 py-1.5 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors">
                          <div className="col-span-6 text-[11px] font-medium">{menu.label}</div>
                          <div className="col-span-2 flex justify-center">
                            <input type="radio" name={`perm-${menu.id}`} checked={level === 'none'} onChange={() => setAccessLevel(menu.id, 'none')} className="accent-primary h-3.5 w-3.5" />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <input type="radio" name={`perm-${menu.id}`} checked={level === 'read'} onChange={() => setAccessLevel(menu.id, 'read')} className="accent-primary h-3.5 w-3.5" />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <input type="radio" name={`perm-${menu.id}`} checked={level === 'write'} onChange={() => setAccessLevel(menu.id, 'write')} className="accent-primary h-3.5 w-3.5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="gradient-primary text-white">Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="shadow-card border-none overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Equipe Administrativa
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead>E-mail</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead className="text-right w-[150px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">Nenhum administrador cadastrado.</TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id} className="hover:bg-muted/5 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2">
                          {admin.email}
                          {admin.id === currentUser?.id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary uppercase tracking-wider">
                              Você
                            </span>
                          )}
                        </span>
                        {admin.grupoAdmin ? (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                            Restrito a: {admin.grupoAdmin}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground mt-1">
                            Sem restrição de grupo (Acesso Geral)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(!admin.permissoes || admin.permissoes.includes('*')) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          <ShieldCheck className="w-3 h-3" /> Acesso Total
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {availableMenus.filter(m => admin.permissoes?.some(p => p.startsWith(`${m.id}:`))).map(m => {
                            const p = admin.permissoes?.find(perm => perm.startsWith(`${m.id}:`));
                            const isWrite = p?.endsWith(':write');
                            return (
                              <span key={m.id} className={`text-[9px] px-1.5 py-0.5 rounded-md border flex items-center gap-1 font-bold ${isWrite ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                                {m.label}: {isWrite ? 'Escrita' : 'Leitura'}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!canEdit}
                        onClick={() => handleOpenDialog(admin)}
                        className="hover:text-primary hover:bg-primary/5 h-8 w-8 disabled:opacity-30"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(admin.id)}
                        disabled={admin.id === currentUser?.id || !canEdit}
                        className="hover:text-destructive hover:bg-destructive/5 h-8 w-8 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};


export default ConfiguracoesTab;
