import React, { useState } from 'react';
import { importHistoricoCSV } from '@/lib/dataStore';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { History, CheckCircle, AlertCircle, FileText, Loader2, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const ImportarHistoricoTab = () => {
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('importarHistorico', 'write');

  const exportErrorsToExcel = () => {
    if (!result || result.errors.length === 0) return;

    const rows = result.errors.map((err, index) => {
      const regexInconsistency = /O aluno "([^"]+)" com a matrícula "([^"]+)"/;
      const match = err.match(regexInconsistency);

      if (match) {
        return {
          'Nº': index + 1,
          'Nome do Aluno (Planilha)': match[1],
          'Matrícula (Planilha)': match[2],
          'Status / Motivo': 'Inconsistência de Dados (Nome e Matrícula não coincidem com o sistema ou aluno não cadastrado)'
        };
      }

      const regexNotFound = /Matrícula "([^"]+)" não encontrada/;
      const matchNotFound = err.match(regexNotFound);
      if (matchNotFound) {
        return {
          'Nº': index + 1,
          'Nome do Aluno (Planilha)': 'Desconhecido',
          'Matrícula (Planilha)': matchNotFound[1],
          'Status / Motivo': 'Matrícula não encontrada no sistema'
        };
      }

      return {
        'Nº': index + 1,
        'Nome do Aluno (Planilha)': 'Desconhecido',
        'Matrícula (Planilha)': 'Desconhecida',
        'Status / Motivo': err
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },   // Nº
      { wch: 40 },  // Nome do Aluno
      { wch: 20 },  // Matrícula
      { wch: 80 }   // Status / Motivo
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = 1; R <= range.e.r; R++) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: 2 });
      if (ws[cellAddr]) {
        ws[cellAddr].t = 's';
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inconsistências');
    XLSX.writeFile(wb, `relatorio_erros_importacao_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Relatório de erros exportado com sucesso!');
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const buffer = ev.target?.result as ArrayBuffer;
      
      let text = "";
      try {
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        text = utf8Decoder.decode(buffer);
      } catch (err) {
        const latinDecoder = new TextDecoder('iso-8859-1');
        text = latinDecoder.decode(buffer);
      }

      const res = await importHistoricoCSV(text);
      setResult(res);
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-foreground font-display">Importar Histórico (1º Trimestre)</h2>
        <p className="text-sm text-muted-foreground mt-1">Semeie os resultados do primeiro trimestre para os alunos visualizarem.</p>
      </div>

      <Card className="shadow-card overflow-hidden">
        <CardContent className="p-8">
          <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-primary/40 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              {loading ? <Loader2 className="w-6 h-6 text-amber-500 animate-spin" /> : <History className="w-6 h-6 text-amber-500" />}
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {loading ? 'Processando histórico...' : 'Selecione o CSV de Histórico'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Colunas esperadas: NOMECURSO, MATRICULA, NOMEALUNO
            </p>
            {canEdit ? (
              <Input type="file" accept=".csv" onChange={handleFile} disabled={loading} className="max-w-xs mx-auto rounded-xl cursor-pointer" />
            ) : (
              <div className="bg-destructive/5 text-destructive p-3 rounded-lg text-xs font-medium max-w-sm mx-auto">
                No momento, você possui permissão apenas de leitura para este módulo.
              </div>
            )}
          </div>

          {result && (
            <div className="mt-6 space-y-3 animate-fade-in">
              <div className="flex items-center gap-4 p-5 bg-success/5 rounded-2xl border border-success/10 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-foreground">{result.imported} registros de histórico importados</p>
                  <p className="text-xs text-muted-foreground">Os dados foram atribuídos ao 1º Trimestre com data retroativa.</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-2">
                   <div className="flex items-center justify-between ml-1">
                     <p className="text-xs font-bold text-destructive uppercase">Erros identificados:</p>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={exportErrorsToExcel}
                       className="h-8 text-xs border-destructive/20 hover:bg-destructive/5 text-destructive flex items-center gap-1 font-semibold"
                     >
                       <Download className="w-3.5 h-3.5" /> Exportar Erros (Excel)
                     </Button>
                   </div>
                   {result.errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-destructive/5 rounded-xl border border-destructive/10">
                      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      <p className="text-sm text-destructive">{err}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Formato esperado do CSV de Histórico</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Este arquivo deve conter apenas os alunos que já possuem cadastro no sistema. O sistema usará a matrícula para vincular o curso ao aluno no 1º Trimestre.
          </p>
          <div className="bg-muted/50 rounded-xl p-4 overflow-x-auto">
            <code className="text-xs text-muted-foreground whitespace-pre">
{`NOMECURSO,MATRICULA,NOMEALUNO
INVESTIGAÇÃO CIENTÍFICA PANC,0000013245,Dante Morais
TEATRO E EXPRESSÃO,0000013210,Bento Araújo`}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportarHistoricoTab;
