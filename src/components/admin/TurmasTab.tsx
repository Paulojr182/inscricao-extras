import { useState, useEffect } from 'react';
import { getTurmas, setTurmas } from '@/lib/dataStore';
import { Turma } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, X, GraduationCap, School, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TurmasTab = () => {
  const [turmas, setTurmasState] = useState<Turma[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'EFAF' | 'EM'>('EFAF');
  const [form, setForm] = useState<Partial<Turma>>({ categoria: 'EFAF' });
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('turmas', 'write');

  useEffect(() => {
    loadTurmas();
  }, []);

  const loadTurmas = async () => {
    setLoading(true);
    const data = await getTurmas();
    setTurmasState(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.nome) return;
    const novo: Turma = {
      id: crypto.randomUUID(),
      nome: form.nome!,
      categoria: form.categoria as 'EFAF' | 'EM',
    };
    const updated = [...turmas, novo];
    await setTurmas(updated);
    setTurmasState(updated);
    setShowForm(false);
    setForm({ categoria: activeCategory });
  };

  const handleDelete = async (id: string) => {
    const updated = turmas.filter(t => t.id !== id);
    await setTurmas(updated);
    setTurmasState(updated);
  };

  const filteredTurmas = turmas.filter(t => t.categoria === activeCategory);

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground font-display">Turmas</h2>
          <p className="text-sm text-muted-foreground mt-1">{turmas.length} turmas no total</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as 'EFAF' | 'EM')} className="w-auto">
            <TabsList className="grid w-full grid-cols-2 lg:w-[240px]">
              <TabsTrigger value="EFAF" className="text-xs">EFAF</TabsTrigger>
              <TabsTrigger value="EM" className="text-xs">Ensino Médio</TabsTrigger>
            </TabsList>
          </Tabs>
          {canEdit && (
            <Button onClick={() => setShowForm(!showForm)} className={showForm ? '' : 'gradient-primary'} variant={showForm ? 'outline' : 'default'} size="sm">
              {showForm ? <><X className="w-4 h-4 mr-1" /> Fechar</> : <><Plus className="w-4 h-4 mr-1" /> Nova Turma</>}
            </Button>
          )}
        </div>
      </div>

      {canEdit && showForm && (
        <Card className="shadow-card animate-scale-in overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Nome da Turma / Série</label>
                <Input 
                  placeholder="Ex: 1º Ano A, 1ª Série EM" 
                  value={form.nome || ''} 
                  onChange={e => setForm({ ...form, nome: e.target.value })} 
                  className="rounded-xl h-11 border-muted-foreground/20 focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Categoria</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    type="button"
                    variant={form.categoria === 'EFAF' ? 'default' : 'outline'} 
                    onClick={() => setForm({...form, categoria: 'EFAF'})}
                    className={`rounded-xl h-11 ${form.categoria === 'EFAF' ? 'gradient-primary' : ''}`}
                  >
                    <School className="w-4 h-4 mr-2" /> EFAF
                  </Button>
                  <Button 
                    type="button"
                    variant={form.categoria === 'EM' ? 'default' : 'outline'} 
                    onClick={() => setForm({...form, categoria: 'EM'})}
                    className={`rounded-xl h-11 ${form.categoria === 'EM' ? 'gradient-primary' : ''}`}
                  >
                    <GraduationCap className="w-4 h-4 mr-2" /> Ensino Médio
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button>
                <Button onClick={handleSave} className="gradient-primary rounded-xl px-8 h-11">Salvar Turma</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTurmas.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-muted/20 rounded-3xl border border-dashed border-border">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma turma cadastrada nesta categoria</p>
          </div>
        ) : (
          filteredTurmas.map(t => (
            <Card key={t.id} className="group hover:shadow-elevated transition-all border-border/50 overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.categoria === 'EFAF' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                    {t.categoria === 'EFAF' ? <School className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{t.nome}</h3>
                    <Badge variant="outline" className="text-[10px] mt-0.5">{t.categoria}</Badge>
                  </div>
                </div>
                {canEdit && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100 rounded-xl hover:bg-destructive/10 transition-all">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TurmasTab;
