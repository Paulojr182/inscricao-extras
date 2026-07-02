import { useState, useEffect, useMemo } from 'react';
import { 
  getPeriodos, 
  setPeriodos, 
  getPeriodosGrupos, 
  setPeriodosGrupos, 
  getAtividades, 
  setAtividades 
} from '@/lib/dataStore';
import { Periodo, PeriodoGrupo, Atividade } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Calendar, CheckCircle, Search, ToggleLeft, ToggleRight, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

const GRUPOS_PADRAO = [
  'Centro Cultural Santa Catarina',
  'Language School',
  'Santa Esportes'
];

const DatasInscricaoTab = () => {
  const [periodos, setPeriodosState] = useState<Periodo[]>([]);
  const [periodosGrupos, setPeriodosGruposState] = useState<PeriodoGrupo[]>([]);
  const [atividades, setAtividadesState] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms state
  const [geralForm, setGeralForm] = useState<{ dataInicio: string; dataFim: string; status: 'aberto' | 'fechado' }>({
    dataInicio: '',
    dataFim: '',
    status: 'aberto'
  });

  const [gruposForm, setGruposForm] = useState<Record<string, { dataInicio: string; dataFim: string; status: 'aberto' | 'fechado' }>>({});
  const [atividadesForm, setAtividadesForm] = useState<Record<string, { dataInicio: string; dataFim: string; status: 'aberto' | 'fechado' }>>({});

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, pgData, actData] = await Promise.all([
        getPeriodos(),
        getPeriodosGrupos(),
        getAtividades()
      ]);

      setPeriodosState(pData);
      setPeriodosGruposState(pgData);
      setAtividadesState(actData);

      // Helper to format ISO to input value YYYY-MM-DDTHH:mm
      const fmtVal = (s?: string) => s ? s.substring(0, 16) : '';

      // Initialize Geral
      const geral = pData.find(p => p.id === 'geral') || { dataInicio: '', dataFim: '', status: 'aberto' };
      setGeralForm({
        dataInicio: fmtVal(geral.dataInicio),
        dataFim: fmtVal(geral.dataFim),
        status: geral.status || 'aberto'
      });

      // Initialize Groups
      const gForm: Record<string, any> = {};
      GRUPOS_PADRAO.forEach(g => {
        const found = pgData.find(pg => pg.grupo === g) || { dataInicio: '', dataFim: '', status: 'aberto' };
        gForm[g] = {
          dataInicio: fmtVal(found.dataInicio),
          dataFim: fmtVal(found.dataFim),
          status: found.status || 'aberto'
        };
      });
      setGruposForm(gForm);

      // Initialize Activities
      const aForm: Record<string, any> = {};
      actData.forEach(a => {
        aForm[a.id] = {
          dataInicio: fmtVal(a.dataInicio),
          dataFim: fmtVal(a.dataFim),
          status: a.status || 'aberto'
        };
      });
      setAtividadesForm(aForm);

    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar configurações de datas.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeral = async () => {
    try {
      const updatedPeriodo: Periodo = {
        id: 'geral',
        dataInicio: geralForm.dataInicio,
        dataFim: geralForm.dataFim,
        status: geralForm.status
      };
      await setPeriodos([updatedPeriodo]);
      toast.success('Período Geral atualizado com sucesso!');
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar datas gerais.');
    }
  };

  const handleSaveGrupo = async (grupo: string) => {
    try {
      const gData = gruposForm[grupo];
      const newPeriodo: PeriodoGrupo = {
        grupo,
        dataInicio: gData.dataInicio,
        dataFim: gData.dataFim,
        status: gData.status
      };
      // Merge with existing
      const nextList = periodosGrupos.filter(pg => pg.grupo !== grupo);
      nextList.push(newPeriodo);

      await setPeriodosGrupos(nextList);
      toast.success(`Configurações de datas do grupo "${grupo}" salvas!`);
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar datas do grupo.');
    }
  };

  const handleSaveAtividade = async (id: string) => {
    try {
      const act = atividades.find(a => a.id === id);
      if (!act) return;
      
      const actFormData = atividadesForm[id];
      const updatedAct: Atividade = {
        ...act,
        dataInicio: actFormData.dataInicio,
        dataFim: actFormData.dataFim,
        status: actFormData.status
      };

      const updatedList = atividades.map(a => a.id === id ? updatedAct : a);
      await setAtividades(updatedList);
      toast.success(`Configurações de "${act.nome}" atualizadas!`);
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar datas da atividade.');
    }
  };

  const { hasPermission, usuario } = useAuth();
  const canEdit = hasPermission('datasInscricao', 'write');
  const grupoRestrito = usuario?.grupoAdmin;

  const displayGruposPadrao = grupoRestrito ? GRUPOS_PADRAO.filter(g => g === grupoRestrito) : GRUPOS_PADRAO;

  const filteredAtividades = useMemo(() => {
    return atividades
      .filter(a => !grupoRestrito || a.grupo === grupoRestrito)
      .filter(a => 
        a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.grupo.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [atividades, searchTerm, grupoRestrito]);

  // Agrupar atividades por grupo para visualização organizada
  const groupedAtividades = useMemo(() => {
    const groups: Record<string, Atividade[]> = {};
    filteredAtividades.forEach(act => {
      const g = act.grupo || 'Outros';
      if (!groups[g]) groups[g] = [];
      groups[g].push(act);
    });
    return groups;
  }, [filteredAtividades]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-16">
      {/* TITLE */}
      <div>
        <h2 className="text-2xl font-extrabold text-foreground font-display flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          Controle Hierárquico de Datas e Status
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure a abertura de matrículas nos níveis Geral, Grupo e por Atividade com overrides manuais.
        </p>
      </div>

      {/* 1. DATA GERAL */}
      {!grupoRestrito && (
        <Card className="shadow-card border-primary/20 overflow-hidden">
          <CardHeader className="bg-primary/5 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
              1. Período Geral de Inscrições
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Status Manual:</span>
              <Button
                size="sm"
                variant={geralForm.status === 'aberto' ? 'default' : 'destructive'}
                className="rounded-full text-xs font-bold uppercase py-1 h-7"
                onClick={() => setGeralForm(prev => ({ ...prev, status: prev.status === 'aberto' ? 'fechado' : 'aberto' }))}
                disabled={!canEdit}
              >
                {geralForm.status === 'aberto' ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                {geralForm.status === 'aberto' ? 'Liberado' : 'Bloqueado'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase">Data de Início Geral</label>
                <Input 
                  type="datetime-local" 
                  value={geralForm.dataInicio} 
                  onChange={e => setGeralForm(prev => ({ ...prev, dataInicio: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase">Data de Encerramento Geral</label>
                <Input 
                  type="datetime-local" 
                  value={geralForm.dataFim} 
                  onChange={e => setGeralForm(prev => ({ ...prev, dataFim: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
            {canEdit && (
              <div className="flex justify-end pt-2 border-t">
                <Button onClick={handleSaveGeral} className="gradient-primary text-primary-foreground rounded-xl">
                  <Save className="w-4 h-4 mr-1.5" /> Salvar Período Geral
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. DATA POR GRUPO */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-base font-bold">
            2. Períodos por Grupo (Segmento)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {displayGruposPadrao.map(g => {
            const formObj = gruposForm[g] || { dataInicio: '', dataFim: '', status: 'aberto' };
            return (
              <div key={g} className="border border-border/80 rounded-xl p-4 bg-muted/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="font-extrabold text-sm text-foreground">{g}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">Override Manual:</span>
                    <Button
                      size="sm"
                      variant={formObj.status === 'aberto' ? 'secondary' : 'destructive'}
                      className="rounded-full text-[10px] font-bold uppercase h-6 px-3"
                      onClick={() => setGruposForm(prev => ({
                        ...prev,
                        [g]: { ...prev[g], status: prev[g].status === 'aberto' ? 'fechado' : 'aberto' }
                      }))}
                      disabled={!canEdit}
                    >
                      {formObj.status === 'aberto' ? 'Aberto' : 'Fechado'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Início</label>
                    <Input 
                      type="datetime-local" 
                      value={formObj.dataInicio} 
                      onChange={e => setGruposForm(prev => ({
                        ...prev,
                        [g]: { ...prev[g], dataInicio: e.target.value }
                      }))}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Fim</label>
                    <Input 
                      type="datetime-local" 
                      value={formObj.dataFim} 
                      onChange={e => setGruposForm(prev => ({
                        ...prev,
                        [g]: { ...prev[g], dataFim: e.target.value }
                      }))}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    {canEdit && (
                      <Button onClick={() => handleSaveGrupo(g)} size="sm" className="gradient-primary text-primary-foreground rounded-xl w-full sm:w-auto h-9">
                        <Save className="w-3.5 h-3.5 mr-1" /> Salvar Grupo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 3. DATA POR ATIVIDADE */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="bg-muted/30 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <CardTitle className="text-base font-bold">
            3. Períodos por Atividade Específica
          </CardTitle>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar atividade..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
          {filteredAtividades.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-6">Nenhuma atividade encontrada.</p>
          ) : (
            Object.entries(groupedAtividades).map(([grupo, list]) => (
              <div key={grupo} className="space-y-3">
                <h4 className="font-extrabold text-xs text-primary uppercase tracking-wider bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
                  {grupo}
                </h4>
                <div className="space-y-2">
                  {list.map(act => {
                    const formObj = atividadesForm[act.id] || { dataInicio: '', dataFim: '', status: 'aberto' };
                    return (
                      <div key={act.id} className="border border-border/50 rounded-xl p-3 bg-card flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-medium">
                        <div className="min-w-[180px]">
                          <p className="font-extrabold text-sm text-foreground">{act.nome}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{act.grupo}</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 w-full">
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground">Início</span>
                            <Input 
                              type="datetime-local" 
                              value={formObj.dataInicio} 
                              onChange={e => setAtividadesForm(prev => ({
                                ...prev,
                                [act.id]: { ...prev[act.id], dataInicio: e.target.value }
                              }))}
                              className="h-8 text-[11px] rounded-lg"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground">Fim</span>
                            <Input 
                              type="datetime-local" 
                              value={formObj.dataFim} 
                              onChange={e => setAtividadesForm(prev => ({
                                ...prev,
                                [act.id]: { ...prev[act.id], dataFim: e.target.value }
                              }))}
                              className="h-8 text-[11px] rounded-lg"
                            />
                          </div>

                          <div className="flex items-end justify-between sm:justify-end gap-2 col-span-2 sm:col-span-1">
                            <Button
                              size="sm"
                              variant={formObj.status === 'aberto' ? 'secondary' : 'destructive'}
                              className="rounded-lg text-[9px] font-bold uppercase h-8 px-2"
                              onClick={() => setAtividadesForm(prev => ({
                                ...prev,
                                [act.id]: { ...prev[act.id], status: prev[act.id].status === 'aberto' ? 'fechado' : 'aberto' }
                              }))}
                              disabled={!canEdit}
                            >
                              {formObj.status === 'aberto' ? 'Ativo' : 'Bloq.'}
                            </Button>
                            {canEdit && (
                              <Button 
                                onClick={() => handleSaveAtividade(act.id)} 
                                size="sm" 
                                className="gradient-primary text-primary-foreground h-8 px-3 rounded-lg"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DatasInscricaoTab;
