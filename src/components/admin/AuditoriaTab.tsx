import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getEstudantes, getCursos, getInscricoes, cancelarInscricao } from '@/lib/dataStore';
import { Estudante, Curso, Inscricao } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CheckCircle, AlertCircle, Search, Filter, Download, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const AuditoriaTab = () => {
  const { usuario } = useAuth();
  const [estudantes, setEstudantes] = useState<Estudante[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterSerie, setFilterSerie] = useState('Todas');
  const [filterTurma, setFilterTurma] = useState('Todas');
  const [filterCurso, setFilterCurso] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [search, setSearch] = useState('');
  const [removendo, setRemovendo] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  const grupoRestrito = usuario?.grupoAdmin;

  const handleRemover = async (inscricaoId: string, nomeAluno: string, nomeCurso: string) => {
    if (!confirm(`Remover inscrição de "${nomeAluno}" no curso "${nomeCurso}"?`)) return;
    setRemovendo(inscricaoId);
    const res = await cancelarInscricao(inscricaoId);
    if (res.success) {
      toast.success('Inscrição removida. Vaga liberada.');
      await loadData();
    } else {
      toast.error(res.message);
    }
    setRemovendo(null);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterSerie, filterTurma, filterCurso, filterStatus, search]);

  const loadData = async () => {
    setLoading(true);
    const [eData, cData, iData] = await Promise.all([
      getEstudantes(),
      getCursos(),
      getInscricoes()
    ]);

    // Apply allowed group filter
    const finalCursos = grupoRestrito
      ? cData.filter(c => c.atividadeGrupo === grupoRestrito)
      : cData;

    const finalInscricoes = grupoRestrito
      ? iData.filter(ins => {
          const c = cData.find(x => x.id === ins.turmaAtividadeId);
          return c?.atividadeGrupo === grupoRestrito;
        })
      : iData;

    setEstudantes(eData);
    setCursos(finalCursos);
    setInscricoes(finalInscricoes);
    setLoading(false);
  };

  const series = Array.from(new Set(estudantes.map(e => e.serie))).sort();

  // Turmas cascata: apenas turmas da série selecionada
  const turmasFiltradas = Array.from(
    new Set(
      (filterSerie === 'Todas' ? estudantes : estudantes.filter(e => e.serie === filterSerie))
        .map(e => e.turma)
    )
  ).sort();

  // Filter cursos by selected grade level
  const cursosFiltrados = filterSerie === 'Todas'
    ? cursos
    : cursos.filter(c => c.seriesPermitidas && c.seriesPermitidas.includes(filterSerie));
  
  const getVagasOcupadas = (cursoId: string) => inscricoes.filter(i => i.turmaAtividadeId === cursoId).length;

  const auditData = estudantes.map(est => {
    const studentInscricoes = inscricoes.filter(i => i.estudanteId === est.id);
    const isInscrito = studentInscricoes.length > 0;
    
    return {
      ...est,
      isInscrito,
      totalInscricoes: studentInscricoes.length,
      cursosNomes: studentInscricoes.map(i => `${i.nomeCurso}`).join(' | ')
    };
  });

  const filtered = auditData.filter(item => {
    const matchesSerie = filterSerie === 'Todas' || item.serie === filterSerie;
    const matchesTurma = filterTurma === 'Todas' || item.turma === filterTurma;
    
    const isEnrolledInSelectedCourse = filterCurso === 'Todos' || inscricoes.some(i => i.estudanteId === item.id && i.turmaAtividadeId === filterCurso);
    
    const matchesStatus = filterStatus === 'Todos' || 
                         (filterStatus === 'Inscritos' && (filterCurso === 'Todos' ? item.isInscrito : isEnrolledInSelectedCourse)) ||
                         (filterStatus === 'Pendentes' && !item.isInscrito);
                         
    const matchesSearch = !search || 
                          item.nome.toLowerCase().includes(search.toLowerCase()) || 
                          item.matricula.includes(search);
    
    return matchesSerie && matchesTurma && (filterStatus === 'Inscritos' ? isEnrolledInSelectedCourse : true) && matchesStatus && matchesSearch;
  });

  // Calculate pagination
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  const stats = {
    total: auditData.length,
    inscritos: auditData.filter(i => i.isInscrito).length,
    pendentes: auditData.filter(i => !i.isInscrito).length
  };

  const exportFiltered = () => {
    const rows = filtered.map(p => {
      const studentInscricoes = inscricoes.filter(i => i.estudanteId === p.id);
      return {
        'Matrícula': String(p.matricula).padStart(10, '0'),
        'Nome': p.nome,
        'Série': p.serie,
        'Turma': p.turma,
        'Status': p.isInscrito ? 'Inscrito' : 'Pendente',
        'Atividades Inscritas': studentInscricoes.map(i => i.nomeCurso).join(', ')
      };
    });
  
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 15 }, // Matrícula
      { wch: 40 }, // Nome
      { wch: 12 }, // Série
      { wch: 10 }, // Turma
      { wch: 12 }, // Status
      { wch: 50 }, // Atividades
    ];
  
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria');
    XLSX.writeFile(wb, `auditoria_completa_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPending = () => {
    const pendentes = auditData.filter(item => {
      const matchesSerie = filterSerie === 'Todas' || item.serie === filterSerie;
      const matchesTurma = filterTurma === 'Todas' || item.turma === filterTurma;
      const matchesSearch = !search || item.nome.toLowerCase().includes(search.toLowerCase()) || item.matricula.includes(search);
      return matchesSerie && matchesTurma && matchesSearch && !item.isInscrito;
    });

    const rows = pendentes.map(p => ({
      'Matrícula': String(p.matricula).padStart(10, '0'),
      'Nome': p.nome,
      'E-mail': p.email,
      'Série': p.serie,
      'Turma': p.turma
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 15 }, // Matrícula
      { wch: 40 }, // Nome
      { wch: 40 }, // E-mail
      { wch: 12 }, // Série
      { wch: 10 }  // Turma
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pendentes');
    XLSX.writeFile(wb, `estudantes_pendentes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground font-display">Auditoria de Inscrições</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitore o progresso das matrículas e identifique pendências</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total de Estudantes', value: stats.total, icon: <Users />, color: 'bg-primary/10 text-primary' },
          { label: 'Já Inscritos', value: stats.inscritos, icon: <CheckCircle />, color: 'bg-success/10 text-success' },
          { label: 'Pendentes', value: stats.pendentes, icon: <AlertCircle />, color: 'bg-warning/10 text-warning' },
        ].map((s, i) => (
          <Card key={i} className="shadow-card border-none bg-card/40 backdrop-blur-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{s.label}</p>
                <p className="text-2xl font-black text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card border-none overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" /> Filtros e Listagem
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportFiltered} variant="outline" size="sm" className="rounded-xl border-primary/30 text-primary hover:bg-primary/10">
                <Download className="w-4 h-4 mr-2" /> Exportar Lista Atual
              </Button>
              <Button onClick={exportPending} variant="outline" size="sm" className="rounded-xl border-warning/30 text-warning hover:bg-warning/10">
                <Download className="w-4 h-4 mr-2" /> Exportar Pendentes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou matrícula..." 
                className="pl-9 rounded-xl h-10 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="h-10 rounded-xl border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none min-w-[120px]"
              value={filterSerie}
              onChange={e => { setFilterSerie(e.target.value); setFilterTurma('Todas'); setFilterCurso('Todos'); }}
            >
              <option value="Todas">Série: Todas</option>
              {series.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              className="h-10 rounded-xl border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none min-w-[120px]"
              value={filterTurma}
              onChange={e => setFilterTurma(e.target.value)}
            >
              <option value="Todas">Turma: Todas</option>
              {turmasFiltradas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select 
              className="h-10 rounded-xl border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none min-w-[150px]"
              value={filterCurso}
              onChange={e => setFilterCurso(e.target.value)}
            >
              <option value="Todos">Atividade: Todos</option>
              {cursosFiltrados.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select 
              className="h-10 rounded-xl border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none min-w-[120px]"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="Todos">Status: Todos</option>
              <option value="Inscritos">Inscritos</option>
              <option value="Pendentes">Pendentes</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  {['Matrícula', 'Nome', 'Série', 'Turma', 'Status', 'Atividades Inscritas'].map(h => (
                    <th key={h} className="text-left p-4 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedData.map(item => {
                  const itemInscricoes = inscricoes.filter(i => i.estudanteId === item.id);
                  
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-mono text-xs text-muted-foreground">{item.matricula}</td>
                      <td className="p-4 font-bold text-foreground whitespace-nowrap">{item.nome}</td>
                      <td className="p-4 text-muted-foreground">{item.serie}</td>
                      <td className="p-4 text-muted-foreground">{item.turma}</td>
                      <td className="p-4">
                        {item.isInscrito ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                            Inscrito
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/20">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          {itemInscricoes.length === 0 ? (
                            <span className="text-muted-foreground/45 italic text-[11px]">Nenhuma inscrição</span>
                          ) : (
                            itemInscricoes.map(insc => (
                              <div key={insc.id} className="flex items-center justify-between gap-4 p-2 bg-muted/20 rounded-xl border border-border/50 transition-all hover:bg-muted/40 max-w-[400px]">
                                <div className="flex flex-col">
                                  <span className="font-bold text-foreground leading-tight text-[11px]">{insc.nomeCurso}</span>
                                  <span className="text-[9px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
                                    📅 {insc.data ? new Date(insc.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Data não registrada'}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={removendo === insc.id}
                                  onClick={() => handleRemover(insc.id, item.nome, insc.nomeCurso)}
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg flex items-center justify-center p-0 border border-destructive/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum estudante corresponde aos filtros.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 px-1 border-t border-border/50 mt-4">
              <p className="text-xs text-muted-foreground">
                Mostrando <span className="font-semibold text-foreground">{Math.min(startIndex + 1, totalItems)}</span> a <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de <span className="font-semibold text-foreground">{totalItems}</span> estudantes
              </p>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Itens por pág:</span>
                  <select 
                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
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
                    className="h-8 px-3 rounded-lg border-border"
                  >
                    Anterior
                  </Button>
                  
                  <div className="flex items-center justify-center w-12 text-xs font-bold text-foreground">
                    {currentPage} / {totalPages}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 rounded-lg border-border"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-card border-none overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-sm font-bold">Resumo por Série</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {series.map(s => {
                const serieEst = auditData.filter(e => e.serie === s);
                const serieInsc = serieEst.filter(e => e.isInscrito).length;
                const perc = Math.round((serieInsc / serieEst.length) * 100);
                
                return (
                  <div key={s} className="space-y-1.5">
                    <div className="flex justify-between text-xs transition-all">
                      <span className="font-bold text-foreground">{s}</span>
                      <span className="text-muted-foreground">{serieInsc} de {serieEst.length} ({perc}%)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${perc >= 90 ? 'bg-success' : perc >= 50 ? 'bg-primary' : 'bg-warning'}`}
                        style={{ width: `${perc}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-none overflow-hidden">
          <CardHeader className="bg-success/5">
            <CardTitle className="text-sm font-bold">Resumo por Curso</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {cursos
                .filter(c => getVagasOcupadas(c.id) > 0)
                .sort((a,b) => getVagasOcupadas(b.id) - getVagasOcupadas(a.id))
                .slice(0, 5)
                .map(c => {
                  const ocupadas = getVagasOcupadas(c.id);
                  const perc = Math.round((ocupadas / c.vagas) * 100);
                  return (
                    <div key={c.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-foreground truncate max-w-[200px]">{c.nome}</span>
                        <span className="text-muted-foreground font-mono">{ocupadas}/{c.vagas}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${perc >= 90 ? 'bg-destructive' : 'bg-success'}`}
                          style={{ width: `${perc}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuditoriaTab;
