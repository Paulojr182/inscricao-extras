import { useState, useEffect, useMemo } from 'react';
import { getAtividades, setAtividades, getTurmas, setTurmas } from '@/lib/dataStore';
import { Atividade, TurmaAtividade } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, X, Pencil, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';

const GRUPOS = [
  'Centro Cultural Santa Catarina',
  'Language School',
  'Santa Esportes'
];

const DIAS_OPCOES = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

const SERIES_SEGMENTOS = {
  'Educação Infantil': ['Infantil 2', 'Infantil 3', 'Infantil 4', 'Infantil 5'],
  'EFAI (1º ao 5º)': ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'],
  'EFAF (6º ao 9º)': ['6º Ano', '7º Ano', '8º Ano', '9º Ano'],
  'Ensino Médio (EM)': ['1ª Série', '2ª Série', '3ª Série']
};

const CursosTab = () => {
  const [atividades, setAtividadesState] = useState<Atividade[]>([]);
  const [turmas, setTurmasState] = useState<TurmaAtividade[]>([]);
  
  // Forms state
  const [showActForm, setShowActForm] = useState(false);
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [actForm, setActForm] = useState<Partial<Atividade>>({ grupo: GRUPOS[0] });

  const [showClassForm, setShowClassForm] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState<Partial<TurmaAtividade>>({
    nome: '',
    diasSemana: [],
    horarioInicio: '',
    horarioFim: '',
    seriesPermitidas: [],
    nivel: '',
    vagas: 15,
    status: 'Ativa'
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [actData, tData] = await Promise.all([getAtividades(), getTurmas()]);
      setAtividadesState(actData);
      setTurmasState(tData);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  // --- Activities CRUD ---
  const handleSaveAct = async () => {
    if (!actForm.nome || !actForm.grupo) {
      toast.error('Preencha o nome e o grupo.');
      return;
    }

    let updated;
    if (editingActId) {
      updated = atividades.map(a => a.id === editingActId ? { ...a, ...actForm } as Atividade : a);
      toast.success('Atividade atualizada!');
    } else {
      const novo: Atividade = {
        id: `act_${actForm.nome.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`,
        nome: actForm.nome,
        grupo: actForm.grupo
      };
      updated = [...atividades, novo];
      toast.success('Atividade criada!');
    }

    await setAtividades(updated);
    setAtividadesState(updated);
    setShowActForm(false);
    setEditingActId(null);
    setActForm({ grupo: GRUPOS[0] });
  };

  const handleDeleteAct = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta atividade? Todas as turmas dela também serão excluídas.')) return;
    const updatedActs = atividades.filter(a => a.id !== id);
    const updatedTurmas = turmas.filter(t => t.atividadeId !== id);
    
    await setAtividades(updatedActs);
    await setTurmas(updatedTurmas);
    setAtividadesState(updatedActs);
    setTurmasState(updatedTurmas);
    toast.success('Atividade excluída com sucesso.');
  };

  // --- Classes (Turmas) CRUD ---
  const handleSaveClass = async () => {
    if (!classForm.atividadeId || !classForm.nome || !classForm.horarioInicio || !classForm.horarioFim) {
      toast.error('Preencha todos os campos obrigatórios da turma.');
      return;
    }
    if (!classForm.diasSemana || classForm.diasSemana.length === 0) {
      toast.error('Selecione pelo menos um dia da semana.');
      return;
    }
    if (!classForm.seriesPermitidas || classForm.seriesPermitidas.length === 0) {
      toast.error('Selecione pelo menos uma série permitida.');
      return;
    }

    let updated;
    if (editingClassId) {
      updated = turmas.map(t => t.id === editingClassId ? { ...t, ...classForm } as TurmaAtividade : t);
      toast.success('Turma atualizada!');
    } else {
      const novo: TurmaAtividade = {
        id: `class_${Date.now()}`,
        atividadeId: classForm.atividadeId,
        nome: classForm.nome,
        diasSemana: classForm.diasSemana,
        horarioInicio: classForm.horarioInicio,
        horarioFim: classForm.horarioFim,
        seriesPermitidas: classForm.seriesPermitidas,
        nivel: classForm.nivel || '',
        vagas: Number(classForm.vagas) || 15,
        status: classForm.status as 'Ativa' | 'Inativa'
      };
      updated = [...turmas, novo];
      toast.success('Turma criada!');
    }

    await setTurmas(updated);
    setTurmasState(updated);
    setShowClassForm(false);
    setEditingClassId(null);
    setClassForm({
      nome: '',
      diasSemana: [],
      horarioInicio: '',
      horarioFim: '',
      seriesPermitidas: [],
      nivel: '',
      vagas: 15,
      status: 'Ativa'
    });
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Excluir esta turma?')) return;
    const updated = turmas.filter(t => t.id !== id);
    await setTurmas(updated);
    setTurmasState(updated);
    toast.success('Turma excluída.');
  };

  const toggleClassStatus = async (id: string) => {
    const updated = turmas.map(t => 
      t.id === id ? { ...t, status: t.status === 'Ativa' ? 'Inativa' : 'Ativa' } as TurmaAtividade : t
    );
    await setTurmas(updated);
    setTurmasState(updated);
    toast.success('Status da turma alterado.');
  };

  const { hasPermission, usuario } = useAuth();
  const canEdit = hasPermission('cursos', 'write'); // Keep using the cursos scope for write
  const grupoRestrito = usuario?.grupoAdmin;

  // Filtered definitions for safe display
  const displayGrupos = grupoRestrito ? GRUPOS.filter(g => g === grupoRestrito) : GRUPOS;
  const displayAtividades = grupoRestrito ? atividades.filter(a => a.grupo === grupoRestrito) : atividades;
  const displayTurmas = grupoRestrito
    ? turmas.filter(t => {
        const a = atividades.find(act => act.id === t.atividadeId);
        return a?.grupo === grupoRestrito;
      })
    : turmas;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground font-display">Atividades Extracurriculares</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {displayAtividades.length} atividades cadastradas em {displayGrupos.length} grupos
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                setShowActForm(!showActForm);
                setShowClassForm(false);
                setEditingActId(null);
                setActForm({ grupo: grupoRestrito || GRUPOS[0] });
              }}
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              {showActForm ? 'Fechar Formulário' : <><FolderPlus className="w-4 h-4 mr-1.5" /> Nova Atividade</>}
            </Button>

            <Button 
              onClick={() => {
                setShowClassForm(!showClassForm);
                setShowActForm(false);
                setEditingClassId(null);
                setClassForm({
                  nome: '',
                  diasSemana: [],
                  horarioInicio: '',
                  horarioFim: '',
                  seriesPermitidas: [],
                  nivel: '',
                  vagas: 15,
                  status: 'Ativa'
                });
              }}
              className="gradient-primary text-primary-foreground rounded-xl"
              size="sm"
            >
              {showClassForm ? 'Fechar Formulário' : <><Plus className="w-4 h-4 mr-1.5" /> Nova Turma</>}
            </Button>
          </div>
        )}
      </div>

      {/* ACTIVITY FORM */}
      {showActForm && canEdit && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              {editingActId ? 'Editar Atividade' : 'Cadastrar Nova Atividade'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider">Nome da Atividade</label>
                <Input 
                  value={actForm.nome || ''} 
                  onChange={e => setActForm({ ...actForm, nome: e.target.value })} 
                  placeholder="Ex: Bateria, Danças Urbanas, Capoeira..."
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider">Grupo Organizador</label>
                <select 
                  value={actForm.grupo || ''} 
                  onChange={e => setActForm({ ...actForm, grupo: e.target.value })}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {displayGrupos.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" onClick={() => setShowActForm(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSaveAct} className="gradient-primary rounded-xl text-primary-foreground">Salvar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CLASS (TURMA) FORM */}
      {showClassForm && canEdit && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              {editingClassId ? 'Editar Turma' : 'Cadastrar Nova Turma'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider">Atividade Vinculada</label>
                <select 
                  value={classForm.atividadeId || ''} 
                  onChange={e => setClassForm({ ...classForm, atividadeId: e.target.value })}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">Selecione uma atividade</option>
                  {displayAtividades.map(a => (
                    <option key={a.id} value={a.id}>{a.nome} ({a.grupo})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider">Nome da Turma</label>
                <Input 
                  value={classForm.nome || ''} 
                  onChange={e => setClassForm({ ...classForm, nome: e.target.value })} 
                  placeholder="Ex: Turma A, Iniciante Vespertino"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider">Nível (Opcional)</label>
                <Input 
                  value={classForm.nivel || ''} 
                  onChange={e => setClassForm({ ...classForm, nivel: e.target.value })} 
                  placeholder="Ex: Iniciante, Básico, Geral"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider">Quantidade de Vagas</label>
                <Input 
                  type="number"
                  value={classForm.vagas || 15} 
                  onChange={e => setClassForm({ ...classForm, vagas: Number(e.target.value) })} 
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider">Horário Inicial</label>
                <Input 
                  type="time"
                  value={classForm.horarioInicio || ''} 
                  onChange={e => setClassForm({ ...classForm, horarioInicio: e.target.value })} 
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider">Horário Final</label>
                <Input 
                  type="time"
                  value={classForm.horarioFim || ''} 
                  onChange={e => setClassForm({ ...classForm, horarioFim: e.target.value })} 
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider">Status</label>
                <select 
                  value={classForm.status || 'Ativa'} 
                  onChange={e => setClassForm({ ...classForm, status: e.target.value as 'Ativa' | 'Inativa' })}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="Ativa">Ativa</option>
                  <option value="Inativa">Inativa</option>
                </select>
              </div>
            </div>

            {/* SELECTION GRID FOR DAYS & SERIES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-primary">Dias da Semana</label>
                <div className="grid grid-cols-2 gap-2">
                  {DIAS_OPCOES.map(d => {
                    const checked = classForm.diasSemana?.includes(d) || false;
                    return (
                      <label key={d} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const current = classForm.diasSemana || [];
                            const next = checked ? current.filter(x => x !== d) : [...current, d];
                            setClassForm({ ...classForm, diasSemana: next });
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        {d}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-primary">Séries Permitidas</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border border-border/80">
                  {Object.entries(SERIES_SEGMENTOS).map(([segmento, series]) => (
                    <div key={segmento} className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block border-b border-border/80 pb-1">{segmento}</span>
                      <div className="space-y-1.5">
                        {series.map(s => {
                          const checked = classForm.seriesPermitidas?.includes(s) || false;
                          return (
                            <label key={s} className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const current = classForm.seriesPermitidas || [];
                                  const next = checked ? current.filter(x => x !== s) : [...current, s];
                                  setClassForm({ ...classForm, seriesPermitidas: next });
                                }}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              {s}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" onClick={() => setShowClassForm(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSaveClass} className="gradient-primary rounded-xl text-primary-foreground">Salvar Turma</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACTIVITIES AND CLASSES LISTS */}
      <div className="space-y-6">
        {displayGrupos.map(grupo => {
          const actInGroup = displayAtividades.filter(a => a.grupo === grupo);
          if (actInGroup.length === 0) return null;

          return (
            <Card key={grupo} className="border border-border shadow-sm">
              <CardHeader className="bg-muted/10">
                <CardTitle className="text-lg font-bold text-primary font-display">{grupo}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {actInGroup.map(act => {
                  const classList = turmas.filter(t => t.atividadeId === act.id);
                  return (
                    <div key={act.id} className="border border-border/60 rounded-xl p-4 space-y-3 bg-card/50">
                      <div className="flex justify-between items-center">
                        <h4 className="font-extrabold text-base text-foreground font-display">
                          {act.nome}
                        </h4>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingActId(act.id);
                              setActForm(act);
                              setShowActForm(true);
                              setShowClassForm(false);
                            }}
                            className="text-blue-500 h-8 w-8 p-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteAct(act.id)}
                            className="text-destructive h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Displaying Turmas of this Activity */}
                      {classList.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic pl-2">Nenhuma turma cadastrada para esta atividade.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                          {classList.map(t => (
                            <div key={t.id} className="border border-border/50 rounded-xl p-3 bg-background flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-start">
                                  <span className="text-sm font-bold text-foreground">{t.nome} {t.nivel ? `(${t.nivel})` : ''}</span>
                                  <Badge 
                                    onClick={() => canEdit && toggleClassStatus(t.id)}
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase cursor-pointer ${
                                      t.status === 'Ativa' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                                    }`}
                                  >
                                    {t.status}
                                  </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground space-y-0.5 font-medium">
                                  <p>Dias: {t.diasSemana?.join(', ')}</p>
                                  <p>Horário: {t.horarioInicio} às {t.horarioFim}</p>
                                  <p>Séries: {t.seriesPermitidas?.join(', ')}</p>
                                  <p>Vagas: {t.vagas}</p>
                                </div>
                              </div>

                              {canEdit && (
                                <div className="flex gap-2 justify-end border-t pt-2 mt-3 border-border/30">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setEditingClassId(t.id);
                                      setClassForm(t);
                                      setShowClassForm(true);
                                      setShowActForm(false);
                                    }}
                                    className="text-blue-500 h-7 w-7 p-0"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteClass(t.id)}
                                    className="text-destructive h-7 w-7 p-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CursosTab;
