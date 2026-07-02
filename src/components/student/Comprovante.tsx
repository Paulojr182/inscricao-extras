import { Inscricao } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, X, GraduationCap, Loader2 } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface Props {
  inscricao: Inscricao;
  onClose: () => void;
  comprovanteRef: React.RefObject<HTMLDivElement>;
}

const Comprovante = ({ inscricao, onClose, comprovanteRef }: Props) => {
  const [printing, setPrinting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const fields = [
    ['Nome', inscricao.nomeAluno],
    ['Matrícula', inscricao.matricula],
    ['Turma', inscricao.turma],
    ['Atividade/Curso', inscricao.nomeCurso],
    ['Data/Hora Inscrição', `${new Date(inscricao.data).toLocaleDateString('pt-BR')} às ${new Date(inscricao.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`],
  ];

  const handleSave = async () => {
    const el = contentRef.current;
    if (!el) return;
    setPrinting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const usableWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      const finalHeight = Math.min(imgHeight, pageHeight - margin * 2);

      pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, finalHeight);
      pdf.save(`comprovante_atividade_${inscricao.matricula}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print animate-fade-in">
      <Card className="w-full max-w-lg shadow-elevated border-none animate-scale-in overflow-hidden rounded-2xl">
        <CardHeader className="gradient-primary rounded-t-2xl">
          <CardTitle className="text-primary-foreground flex items-center gap-2.5 text-lg">
            <CheckCircle className="w-5 h-5" /> Comprovante de Inscrição
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="bg-success/5 text-success text-sm p-4 rounded-xl flex items-center gap-3 border border-success/10 no-print">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold">Inscrição Confirmada!</span>
              <span className="text-xs opacity-90">Guarde este comprovante para sua referência.</span>
            </div>
          </div>

          {/* This div is what gets displayed and exported */}
          <div ref={contentRef} className="bg-muted/50 p-6 rounded-2xl space-y-4 border border-border">
            {fields.map(([label, value]) => (
              <div key={label} className="flex justify-between items-center border-b border-border/30 pb-2 last:border-0 last:pb-0">
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{label}</span>
                <span className="text-sm font-extrabold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* Buttons — not included in PDF */}
          <div className="flex gap-3 justify-end pt-2 no-print">
            <Button onClick={handleSave} disabled={printing} variant="outline" className="rounded-xl h-10 px-6">
              {printing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando PDF...</>
                : <><Download className="w-4 h-4 mr-2" /> Salvar PDF</>
              }
            </Button>
            <Button variant="ghost" onClick={onClose} className="rounded-xl h-10 px-6">
              <X className="w-4 h-4 mr-2" /> Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Comprovante;
