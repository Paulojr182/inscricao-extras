import { useState, useEffect } from 'react';
import { getEstudantes, setEstudantes, getUsuarios, setUsuarios, updateEstudante, deleteEstudante, getTurmas } from '@/lib/dataStore';
import { Estudante, Turma } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectGroup,
  SelectLabel,
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Search, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// Séries por categoria (Base do 6º Ano ao 9º Ano EFAF e 1ª a 3ª Série EM)
const SERIES_EFAF = ['6º Ano', '7º Ano', '8º Ano', '9º Ano'];
const SERIES_EM   = ['1ª Série', '2ª Série', '3ª Série'];

const EstudantesTab = () => {
  const [estudantes, setEstudantesState] = useState<Estudante[]>([]);
  const [turmas, setTurmasState] = useState<Turma[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterTurma, setFilterTurma] = useState('Todas');
  const [form, setForm] = useState<Partial<Estudante & { senha: string }>>({ turno: 'Manhã-EFAF' });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  useEffect(() => {
    loadEstudantes();
    loadTurmas();
  }, []);

  const loadTurmas = async () => {
    const data = await getTurmas();
    setTurmasState(data);
  };

  // Obtém as turmas únicas já existentes para a série selecionada a partir dos dados atuais
  const turmasExistentesParaSerie = Array.from(new Set(
    estudantes
      .filter(e => e.serie === form.serie)
      .map(e => e.turma)
  )).sort();

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTurma]);

  const loadEstudantes = async () => {
    setLoading(true);
    const data = await getEstudantes();
    setEstudantesState(data);
    setLoading(false);
  };

  const handleEdit = async (est: Estudante) => {
    const usuarios = await getUsuarios();
    const user = usuarios.find(u => u.estudanteId === est.id);
    
    setForm({ ...est, senha: user?.senha || '' });
    setEditingId(est.id);
    setShowForm(true);
    
    // Rolar para o topo onde está o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este estudante?')) return;
    await deleteEstudante(id);
    setEstudantesState(prev => prev.filter(e => e.id !== id));
    toast.success('Estudante excluído com sucesso');
  };

  const handleSave = async () => {
    if (!form.nome || !form.matricula || !form.email || !form.serie || !form.turma) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

      if (editingId) {
        const updated: Estudante = {
          id: editingId,
          nome: form.nome!,
          matricula: form.matricula!,
          email: form.email!,
          turno: form.turno as Estudante['turno'],
          serie: form.serie!,
          turma: form.turma!,
          codigoTurma: form.turma!,
        };
        await updateEstudante(updated, form.senha);
        setEstudantesState(prev => prev.map(e => e.id === editingId ? updated : e));
        toast.success('Dados atualizados com sucesso');
      } else {
      if (estudantes.find(e => e.matricula === form.matricula)) {
        toast.error('Matrícula já cadastrada');
        return;
      }

      const novo: Estudante = {
        id: crypto.randomUUID(),
        nome: form.nome!,
        matricula: form.matricula!,
        email: form.email!,
        turno: form.turno as Estudante['turno'],
        serie: form.serie!,
        turma: form.turma!,
        codigoTurma: form.turma!,
      };

      const updatedEst = [...estudantes, novo];
      await setEstudantes(updatedEst);
      setEstudantesState(updatedEst);

      const usuarios = await getUsuarios();
      usuarios.push({ 
        id: crypto.randomUUID(), 
        email: form.email!, 
        senha: form.senha || '123456', 
        tipo: 'estudante', 
        estudanteId: novo.id 
      });
      await setUsuarios(usuarios);
      toast.success('Estudante cadastrado com sucesso');
    }

    setShowForm(false);
    setEditingId(null);
    setForm({ turno: 'Manhã-EFAF' });
  };

  const turmasDisponiveis = Array.from(new Set(estudantes.map(e => e.codigoTurma))).sort();

  const filtered = estudantes.filter(e => {
    const matchesSearch = !search || 
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      e.matricula.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesTurma = filterTurma === 'Todas' || e.codigoTurma === filterTurma;
    
    return matchesSearch && matchesTurma;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEstudantes = filtered.slice(startIndex, startIndex + itemsPerPage);

  const { hasPermission } = useAuth();
  const canEdit = hasPermission('estudantes', 'write');

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground font-display">Estudantes</h2>
          <p className="text-sm text-muted-foreground mt-1">{estudantes.length} estudantes cadastrados</p>
        </div>
        {canEdit && (
          <Button 
            onClick={() => {
              if (showForm) {
                setEditingId(null);
                setForm({ turno: 'Manhã-EFAF' });
              }
              setShowForm(!showForm);
            }} 
            className={showForm ? '' : 'gradient-primary'} 
            variant={showForm ? 'outline' : 'default'} 
            size="sm"
          >
            {showForm ? <><X className="w-4 h-4 mr-1" /> Fechar</> : <><Plus className="w-4 h-4 mr-1" /> Novo Estudante</>}
          </Button>
        )}
      </div>

      {canEdit && showForm && (
        <Card className="shadow-card animate-scale-in overflow-hidden border-primary/20">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              {editingId ? <><Edit2 className="w-4 h-4 text-primary" /> Editar Estudante</> : <><Plus className="w-4 h-4 text-primary" /> Novo Estudante</>}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Nome', key: 'nome' },
                { label: 'Matrícula', key: 'matricula' },
                { label: 'E-mail', key: 'email', type: 'email' },
                { label: 'Senha', key: 'senha', type: 'text', placeholder: editingId ? 'Digite a nova senha' : 'Padrão: 123456' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">{f.label}</label>
                  <Input 
                    type={f.type || 'text'} 
                    placeholder={f.placeholder} 
                    value={(form as any)[f.key] || ''} 
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })} 
                    className="rounded-xl border-muted-foreground/20 focus:border-primary" 
                  />
                </div>
              ))}

              {/* Série - primeiro campo de seleção (Ano/Série) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Série</label>
                <Select
                  value={form.serie || ''}
                  onValueChange={val => setForm({ ...form, serie: val })}
                >
                  <SelectTrigger className="w-full h-10 rounded-xl border-muted-foreground/20 bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    <SelectValue placeholder="Selecione a série..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Ensino Fundamental (EFAF)</SelectLabel>
                      {SERIES_EFAF.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Ensino Médio</SelectLabel>
                      {SERIES_EM.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Turma - populado dinamicamente com base na Série e nos dados existentes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Turma</label>
                <Select
                  value={form.turma || ''}
                  onValueChange={val => setForm({ ...form, turma: val })}
                  disabled={!form.serie}
                >
                  <SelectTrigger className="w-full h-10 rounded-xl border-muted-foreground/20 bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50">
                    <SelectValue placeholder={form.serie ? 'Selecione a turma...' : 'Selecione a série primeiro'} />
                  </SelectTrigger>
                  <SelectContent>
                    {turmasExistentesParaSerie.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                    {form.serie && turmasExistentesParaSerie.length === 0 && (
                      <SelectItem value="none" disabled>Nenhuma turma encontrada</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Turno</label>
                <Select 
                  value={form.turno || ''} 
                  onValueChange={val => setForm({ ...form, turno: val as any })}
                >
                  <SelectTrigger className="w-full h-10 rounded-xl border-muted-foreground/20 bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    <SelectValue placeholder="Selecione o turno..." />
                  </SelectTrigger>
                  <SelectContent>
              <SelectItem value="Manhã-EFAF">Manhã-EFAF</SelectItem>
                    <SelectItem value="Vespertino">Vespertino</SelectItem>
                    <SelectItem value="Integral">Integral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                <Button variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); setForm({ turno: 'Manhã-EFAF' }); }} className="rounded-xl">Cancelar</Button>
                <Button onClick={handleSave} className="gradient-primary rounded-xl px-8 h-10 shadow-lg shadow-primary/20">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> {editingId ? 'Atualizar Dados' : 'Salvar Estudante'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, matrícula ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-muted/50 border-transparent focus:border-primary h-11"
          />
        </div>
        <div className="w-full md:w-48 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground px-1">Filtrar por Turma</label>
          <Select value={filterTurma} onValueChange={setFilterTurma}>
            <SelectTrigger className="w-full h-11 rounded-xl border-muted-foreground/20 bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
              <SelectValue placeholder="Todas as Turmas" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="Todas">Todas as Turmas</SelectItem>
              {turmasDisponiveis.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground font-medium">
          {filtered.length} estudantes filtrados
        </p>
      </div>

      <Card className="shadow-card overflow-hidden border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {['Nome', 'Matrícula', 'E-mail', 'Série', 'Turma', 'Turno', 'Ações'].map(h => (
                  <th key={h} className="text-left p-4 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedEstudantes.map(e => (
                <tr key={e.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-foreground">{e.nome}</div>
                  </td>
                  <td className="p-4 text-muted-foreground font-mono text-xs">{e.matricula}</td>
                  <td className="p-4 text-muted-foreground">{e.email}</td>
                  <td className="p-4 text-muted-foreground">{e.serie}</td>
                  <td className="p-4 text-muted-foreground">{e.turma}</td>
                  <td className="p-4 text-muted-foreground">{e.turno}</td>
                  <td className="p-4">
                    {canEdit && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(e)} className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)} className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">Nenhum estudante encontrado.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-1">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-semibold text-foreground">{Math.min(startIndex + 1, totalItems)}</span> a <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de <span className="font-semibold text-foreground">{totalItems}</span> estudantes
          </p>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Itens por pág:</span>
              <select 
                className="h-9 rounded-lg border border-muted-foreground/20 bg-background px-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[30, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-9 px-4 rounded-lg border-muted-foreground/20"
              >
                Anterior
              </Button>
              
              <div className="flex items-center justify-center w-16 text-sm font-bold text-foreground">
                {currentPage} / {totalPages}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-9 px-4 rounded-lg border-muted-foreground/20"
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstudantesTab;
