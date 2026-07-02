import { useState, useEffect, useMemo } from 'react';
import { getCursos, getInscricoes, getEstudantes } from '@/lib/dataStore';
import { Inscricao, Curso, Estudante } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const GRUPOS = [
  'Centro Cultural Santa Catarina',
  'Language School',
  'Santa Esportes'
];

const SERIES_OPCOES = [
  '6º Ano',
  '7º Ano',
  '8º Ano',
  '9º Ano',
  '1ª Série',
  '2ª Série',
  '3ª Série'
];

const RelatoriosTab = () => {
  const { hasPermission, usuario } = useAuth();
  const grupoRestrito = usuario?.grupoAdmin;

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [estudantes, setEstudantes] = useState<Estudante[]>([]);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  
  // Filters
  const [selectedGrupo, setSelectedGrupo] = useState<string>(grupoRestrito || '');
  const [selectedAtividade, setSelectedAtividade] = useState<string>('');
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [selectedSerie, setSelectedSerie] = useState<string>('');
  const [searchNome, setSearchNome] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const canEdit = hasPermission('relatorios', 'write');

  useEffect(() => {
    if (grupoRestrito) {
      setSelectedGrupo(grupoRestrito);
    }
  }, [grupoRestrito]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cData, eData, iData] = await Promise.all([
        getCursos(), 
        getEstudantes(),
        getInscricoes()
      ]);

      const finalCursos = grupoRestrito
        ? cData.filter(c => c.atividadeGrupo === grupoRestrito)
        : cData;

      const finalInscricoes = grupoRestrito
        ? iData.filter(ins => {
            const c = cData.find(x => x.id === ins.turmaAtividadeId);
            return c?.atividadeGrupo === grupoRestrito;
          })
        : iData;

      setCursos(finalCursos);
      setEstudantes(eData);
      setInscricoes(finalInscricoes);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  // Get distinct activities and turmas list for the dropdowns
  const atividadesOptions = useMemo(() => {
    const list = cursos.map(c => ({
      id: c.atividadeId,
      nome: c.atividadeNome,
      grupo: c.atividadeGrupo
    }));
    // Unique by id
    const unique = Array.from(new Map(list.map(item => [item.id, item])).values());
    if (selectedGrupo) {
      return unique.filter(a => a.grupo === selectedGrupo);
    }
    return unique;
  }, [cursos, selectedGrupo]);

  const turmasOptions = useMemo(() => {
    let list = cursos;
    if (selectedGrupo) {
      list = list.filter(c => c.atividadeGrupo === selectedGrupo);
    }
    if (selectedAtividade) {
      list = list.filter(c => c.atividadeId === selectedAtividade);
    }
    // Unique classes
    return Array.from(new Map(list.map(item => [item.id, item])).values());
  }, [cursos, selectedGrupo, selectedAtividade]);

  // Apply filtering
  const filteredInscricoes = useMemo(() => {
    return inscricoes.filter(i => {
      // Find the class details
      const c = cursos.find(x => x.id === i.turmaAtividadeId);

      // Filter by Group
      if (selectedGrupo && c?.atividadeGrupo !== selectedGrupo) {
        return false;
      }
      // Filter by Activity
      if (selectedAtividade && c?.atividadeId !== selectedAtividade) {
        return false;
      }
      // Filter by class (turma)
      if (selectedTurma && i.turmaAtividadeId !== selectedTurma) {
        return false;
      }
      // Filter by student series
      if (selectedSerie && i.turma !== selectedSerie) {
        return false;
      }
      // Filter by name
      if (searchNome && !i.nomeAluno.toLowerCase().includes(searchNome.toLowerCase())) {
        return false;
      }

      return true;
    }).sort((a, b) => a.nomeAluno.localeCompare(b.nomeAluno, 'pt-BR'));
  }, [inscricoes, cursos, selectedGrupo, selectedAtividade, selectedTurma, selectedSerie, searchNome]);

  const handleExportExcel = () => {
    if (filteredInscricoes.length === 0) {
      toast.error('Nenhum dado para exportar.');
      return;
    }

    const data = filteredInscricoes.map(i => {
      const c = cursos.find(x => x.id === i.turmaAtividadeId);
      return {
        'Nome do Aluno': i.nomeAluno,
        'Matrícula': i.matricula,
        'Série/Turma Aluno': i.turma,
        'Grupo Atividade': c?.atividadeGrupo || 'Centro Cultural',
        'Atividade': c?.atividadeNome || i.nomeCurso,
        'Turma Atividade': c?.nome || 'Turma Única',
        'Horário': c ? `${c.diasSemana?.join(', ')} - ${c.horarioInicio} às ${c.horarioFim}` : '',
        'Data Inscrição': new Date(i.data).toLocaleString('pt-BR')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inscritos');
    XLSX.writeFile(workbook, `inscritos_extracurriculares_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Arquivo Excel gerado com sucesso!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground font-display flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Relatório de Inscritos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Filtre, pesquise e exporte as matrículas efetuadas dos estudantes.
          </p>
        </div>
        <Button 
          onClick={handleExportExcel} 
          className="gradient-primary text-primary-foreground rounded-xl"
          size="sm"
        >
          <Download className="w-4 h-4 mr-2" /> Exportar para Excel
        </Button>
      </div>

      {/* FILTER CONTROLS */}
      <Card className="shadow-card border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Grupo</label>
              <select 
                value={selectedGrupo} 
                onChange={e => { setSelectedGrupo(e.target.value); setSelectedAtividade(''); setSelectedTurma(''); }}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {!grupoRestrito && <option value="">Todos os Grupos</option>}
                {(grupoRestrito ? GRUPOS.filter(g => g === grupoRestrito) : GRUPOS).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Atividade</label>
              <select 
                value={selectedAtividade} 
                onChange={e => { setSelectedAtividade(e.target.value); setSelectedTurma(''); }}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">Todas as Atividades</option>
                {atividadesOptions.map(a => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Turma</label>
              <select 
                value={selectedTurma} 
                onChange={e => setSelectedTurma(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">Todas as Turmas</option>
                {turmasOptions.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Série Aluno</label>
              <select 
                value={selectedSerie} 
                onChange={e => setSelectedSerie(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">Todas as Séries</option>
                {SERIES_OPCOES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome Estudante</label>
              <Input 
                value={searchNome} 
                onChange={e => setSearchNome(e.target.value)} 
                placeholder="Pesquisar nome..." 
                className="rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FILTERED RESULTS TABLE */}
      <Card className="shadow-card overflow-hidden border-border/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-bold text-muted-foreground text-xs uppercase">
                <th className="p-4">Estudante</th>
                <th className="p-4">Matrícula</th>
                <th className="p-4">Série / Turma</th>
                <th className="p-4">Atividade</th>
                <th className="p-4">Turma Atividade</th>
                <th className="p-4">Horário</th>
              </tr>
            </thead>
            <tbody>
              {filteredInscricoes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground italic font-medium">
                    Nenhuma inscrição encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredInscricoes.map(i => {
                  const c = cursos.find(x => x.id === i.turmaAtividadeId);
                  return (
                    <tr key={i.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-bold text-foreground">{i.nomeAluno}</td>
                      <td className="p-4 text-muted-foreground font-mono">{i.matricula}</td>
                      <td className="p-4 font-semibold">{i.turma}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="mr-1.5">{c?.atividadeGrupo || 'Geral'}</Badge>
                        <span className="font-semibold">{c?.atividadeNome || i.nomeCurso}</span>
                      </td>
                      <td className="p-4 font-semibold">{c?.nome || 'Turma Única'}</td>
                      <td className="p-4 text-xs font-medium text-muted-foreground">
                        {c ? `${c.diasSemana?.join(', ')} • ${c.horarioInicio} às ${c.horarioFim}` : 'N/D'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RelatoriosTab;
