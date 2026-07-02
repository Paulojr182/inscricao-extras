import React, { useState } from 'react';
import { importCSV } from '@/lib/dataStore';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';

const ImportarTab = () => {
  const [result, setResult] = useState<{ 
    imported: number; 
    novos: number; 
    atualizados: number; 
    inalterados: number; 
    skipped: number; 
    errors: string[] 
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('importar', 'write');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const buffer = ev.target?.result as ArrayBuffer;
      
      // Tenta decodificar como UTF-8; se falhar (ex: arquivo Excel legado), usa ISO-8859-1
      let text = "";
      try {
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        text = utf8Decoder.decode(buffer);
      } catch (err) {
        console.log("Arquivo não é UTF-8 válido, tentando decodificar como ISO-8859-1...");
        const latinDecoder = new TextDecoder('iso-8859-1');
        text = latinDecoder.decode(buffer);
      }

      const res = await importCSV(text);
      setResult(res);
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-foreground font-display">Importar CSV</h2>
        <p className="text-sm text-muted-foreground mt-1">Importe estudantes em massa via arquivo CSV</p>
      </div>

      <Card className="shadow-card overflow-hidden">
        <CardContent className="p-8">
          <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-primary/40 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              {loading ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <Upload className="w-6 h-6 text-primary" />}
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {loading ? 'Processando arquivo...' : 'Selecione um arquivo CSV'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Colunas esperadas: SERIE, TURMA, CODIGOTURMA, CODIGOMATRICULA, NOMEALUNO, LOGINOFFICE365, SENHA
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
                  <p className="text-base font-bold text-foreground">{result.imported} estudantes processados</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-success"></span>
                      <span className="font-bold text-foreground">{result.novos}</span> novos
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="font-bold text-foreground">{result.atualizados}</span> atualizados
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/30"></span>
                      <span className="font-bold text-foreground">{result.inalterados}</span> sem alterações
                    </span>
                  </div>
                </div>
              </div>
              {result.errors.map((err, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-destructive/5 rounded-xl border border-destructive/10">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{err}</p>
                </div>
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      <Card className="shadow-card overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Formato esperado do CSV</h3>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 overflow-x-auto">
            <code className="text-xs text-muted-foreground whitespace-pre">
{`SERIE,TURMA,CODIGOMATRICULA,NOMEALUNO,LOGINOFFICE365,SENHA
1º Ano,1A-M,2024010,Ana Costa,ana@escola.edu.br,Rede12345`}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportarTab;
