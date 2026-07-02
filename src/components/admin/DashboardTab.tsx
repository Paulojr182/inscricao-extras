import { useState, useEffect } from 'react';
import { getEstudantes, getCursos, getInscricoes } from '@/lib/dataStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, TrendingUp, AlertTriangle, GraduationCap, Grid } from 'lucide-react';
import { Estudante, Curso, Inscricao } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const DashboardTab = () => {
  const { usuario } = useAuth();
  const [estudantes, setEstudantes] = useState<Estudante[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eData, cData, iData] = await Promise.all([
        getEstudantes(),
        getCursos(),
        getInscricoes()
      ]);
      setEstudantes(eData);
      setCursos(cData);
      setInscricoes(iData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const grupoRestrito = usuario?.grupoAdmin;

  // Filter courses/atividades based on restriction
  const filteredCursos = grupoRestrito
    ? cursos.filter(c => c.atividadeGrupo === grupoRestrito)
    : cursos;

  // Filter registrations based on restriction
  const filteredInscricoes = grupoRestrito
    ? inscricoes.filter(ins => {
        const c = cursos.find(x => x.id === ins.turmaAtividadeId);
        return c?.atividadeGrupo === grupoRestrito;
      })
    : inscricoes;

  // Unique students count
  const enrolledStudentIds = new Set(filteredInscricoes.map(i => i.estudanteId));
  const displayEstudantesCount = grupoRestrito ? enrolledStudentIds.size : estudantes.length;

  // Calculations
  const totalInscricoes = filteredInscricoes.length;
  const totalVagas = filteredCursos.reduce((acc, c) => acc + (c.vagas || 0), 0);
  const totalOcupadas = filteredInscricoes.length; // Each registration is 1 slot occupied
  const vagasDisponiveis = Math.max(0, totalVagas - totalOcupadas);

  // Activity stats
  const inscritosPorAtividade: Record<string, number> = {};
  filteredCursos.forEach(c => {
    if (c.atividadeNome) {
      inscritosPorAtividade[c.atividadeNome] = 0;
    }
  });

  filteredInscricoes.forEach(ins => {
    const t = cursos.find(c => c.id === ins.turmaAtividadeId);
    if (t && t.atividadeNome) {
      inscritosPorAtividade[t.atividadeNome] = (inscritosPorAtividade[t.atividadeNome] || 0) + 1;
    }
  });

  // Series stats
  const seriesMap: Record<string, number> = {};
  filteredInscricoes.forEach(ins => {
    const s = ins.turma || 'Outra';
    seriesMap[s] = (seriesMap[s] || 0) + 1;
  });

  const stats = [
    { 
      label: grupoRestrito ? 'Estudantes Inscritos' : 'Total de Estudantes', 
      value: displayEstudantesCount, 
      icon: <Users className="w-5 h-5" />, 
      gradient: 'gradient-primary' 
    },
    { 
      label: 'Turmas Ativas', 
      value: filteredCursos.filter(c => (c.status || 'Ativa').toLowerCase() === 'ativa' || (c.status || 'Ativa').toLowerCase() === 'ativo').length, 
      icon: <BookOpen className="w-5 h-5" />, 
      gradient: 'gradient-secondary' 
    },
    { 
      label: 'Total de Vagas', 
      value: totalVagas, 
      icon: <Grid className="w-5 h-5" />, 
      gradient: 'gradient-accent' 
    },
    { 
      label: 'Matrículas Efetuadas', 
      value: totalInscricoes, 
      icon: <TrendingUp className="w-5 h-5" />, 
      gradient: 'gradient-primary' 
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h2 className="text-2xl font-extrabold text-foreground font-display">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do sistema de atividades extracurriculares</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="shadow-card overflow-hidden group hover:shadow-elevated transition-shadow duration-300">
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</p>
                  <p className="text-3xl font-extrabold text-foreground font-display">{s.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl ${s.gradient} flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform`}>
                  {s.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ATIVIDADES STATS */}
        <Card className="shadow-card overflow-hidden">
          <CardHeader className="bg-muted/10 border-b border-border/40">
            <CardTitle className="text-base flex items-center gap-2 font-bold">
              <Grid className="w-4 h-4 text-primary" /> Matrículas por Atividade
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {Object.keys(inscritosPorAtividade).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade ativa.</p>
            ) : (
              <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                {Object.entries(inscritosPorAtividade)
                  .sort((a, b) => b[1] - a[1])
                  .map(([atividadeNome, total]) => {
                    const vagasTotaisAtiv = filteredCursos
                      .filter(c => c.atividadeNome === atividadeNome)
                      .reduce((acc, c) => acc + (c.vagas || 0), 0);
                    const pct = vagasTotaisAtiv > 0 ? (total / vagasTotaisAtiv) * 100 : 0;
                    return (
                      <div key={atividadeNome} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-foreground">
                          <span>{atividadeNome}</span>
                          <span>{total} / {vagasTotaisAtiv} vagas</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                          <div 
                            className="h-full rounded-full gradient-primary" 
                            style={{ width: `${Math.min(100, pct || 0)}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SERIES STATS */}
        <Card className="shadow-card overflow-hidden">
          <CardHeader className="bg-muted/10 border-b border-border/40">
            <CardTitle className="text-base flex items-center gap-2 font-bold">
              <GraduationCap className="w-4 h-4 text-primary" /> Inscrições por Turma/Série do Aluno
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {Object.keys(seriesMap).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum aluno inscrito ainda.</p>
            ) : (
              <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                {Object.entries(seriesMap)
                  .sort((a, b) => b[1] - a[1])
                  .map(([serie, count]) => (
                    <div key={serie} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-foreground">
                        <span>{serie}</span>
                        <span>{count} alunos</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-primary" 
                          style={{ width: `${Math.min(100, (count / Math.max(1, totalInscricoes)) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DETAILED SUMMARY */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/40">
          <CardTitle className="text-base font-bold">Resumo Geral de Ocupação de Vagas</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-muted/30 rounded-2xl">
              <p className="text-xs text-muted-foreground font-bold uppercase">Vagas Totais</p>
              <p className="text-2xl font-black mt-1">{totalVagas}</p>
            </div>
            <div className="p-4 bg-success/10 text-success rounded-2xl">
              <p className="text-xs text-success/80 font-bold uppercase">Vagas Preenchidas</p>
              <p className="text-2xl font-black mt-1">{totalOcupadas}</p>
            </div>
            <div className="p-4 bg-primary/10 text-primary rounded-2xl">
              <p className="text-xs text-primary/80 font-bold uppercase">Vagas Restantes</p>
              <p className="text-2xl font-black mt-1">{vagasDisponiveis}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardTab;
