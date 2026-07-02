import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {Boletim,Estudante,Inscricao,TurmaAtividade} from '@/types';
import {BOLETIM_COMMENTS} from './boletimComments';
import {Button} from '@/components/ui/button';
import {Card,CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Dialog,DialogContent,DialogFooter,DialogTitle} from '@/components/ui/dialog';
import {toast} from 'sonner';

type Ctx={turmas:(TurmaAtividade&{atividadeNome:string})[];inscricoes:Inscricao[];estudantes:Estudante[]};
type Form=Omit<Boletim,'id'|'criadoEm'|'atualizadoEm'>;
const blank:Form={turmaId:'',estudanteId:'',professor:'',midTerm:0,endOfTerm:0,listening:0,speaking:0,performance:0,comentario:'',status:'rascunho'};
const auth=(json=false)=>({...json&&{'Content-Type':'application/json'},Authorization:`Bearer ${sessionStorage.getItem('optativas_token')||''}`});

export default function BoletimTab(){
 const {usuario,hasPermission,logout}=useAuth();
 const allowed=(!usuario?.grupoAdmin||usuario.grupoAdmin==='Language School')&&hasPermission('boletim');
 const writable=allowed&&hasPermission('boletim','write');
 const [ctx,setCtx]=useState<Ctx>({turmas:[],inscricoes:[],estudantes:[]});
 const [items,setItems]=useState<Boletim[]>([]);
 const [form,setForm]=useState<Form>(blank);
 const [editing,setEditing]=useState<Boletim|null>(null);
 const [open,setOpen]=useState(false);
 const [filters,setFilters]=useState({turma:'',estudante:'',professor:''});
 const [pageSize,setPageSize]=useState(30);
 const [page,setPage]=useState(1);
 const load=async()=>{if(!allowed)return;const[a,b]=await Promise.all([fetch('/api/boletins/contexto',{headers:auth()}),fetch('/api/boletins',{headers:auth()})]);if(a.status===401||b.status===401){toast.error('Sua sessao expirou. Entre novamente.');logout();return;}if(a.ok&&b.ok){setCtx(await a.json());setItems(await b.json());}else{toast.error('Nao foi possivel carregar as turmas do Language School.');}};
 useEffect(()=>{load();},[allowed]);
 useEffect(()=>{setPage(1);},[filters,pageSize]);
 const student=(id:string)=>ctx.estudantes.find(e=>e.id===id)?.nome||'-';
 const turma=(id:string)=>{const t=ctx.turmas.find(x=>x.id===id);return t?`${t.atividadeNome} - ${t.nome}`:'-';};
 const enrolled=ctx.estudantes.filter(e=>ctx.inscricoes.some(i=>i.turmaAtividadeId===form.turmaId&&i.estudanteId===e.id));
 const visible=items.filter(b=>(!filters.turma||b.turmaId===filters.turma)&&student(b.estudanteId).toLowerCase().includes(filters.estudante.toLowerCase())&&b.professor.toLowerCase().includes(filters.professor.toLowerCase()));
 const professorName=usuario?.isProfessor?(usuario.nome||usuario.email):'';
 const edit=(b?:Boletim)=>{setEditing(b||null);setForm(b?{turmaId:b.turmaId,estudanteId:b.estudanteId,professor:b.professor,midTerm:b.midTerm,endOfTerm:b.endOfTerm,listening:b.listening,speaking:b.speaking,performance:b.performance,comentario:b.comentario,status:b.status}:{...blank,professor:professorName});setOpen(true);};
 const createFor=(i:Inscricao)=>{setEditing(null);setForm({...blank,turmaId:i.turmaAtividadeId,estudanteId:i.estudanteId,professor:professorName});setOpen(true);};
 const save=async(status:Form['status'])=>{const url=editing?`/api/boletins/${editing.id}`:'/api/boletins';const r=await fetch(url,{method:editing?'PUT':'POST',headers:auth(true),body:JSON.stringify({...form,status})});const data=await r.json();if(!r.ok)return toast.error(data.error);toast.success('Boletim salvo.');setOpen(false);load();};
 const pdf=async(b:Boletim)=>{
  try{
   const {jsPDF}=await import('jspdf');
   const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
   const navy:[number,number,number]=[7,28,67],blue:[number,number,number]=[24,67,125],gold:[number,number,number]=[239,174,20],line:[number,number,number]=[215,225,239];
   const className=ctx.turmas.find(x=>x.id===b.turmaId)?.nome||turma(b.turmaId);
   const classRows=[b];
   const [schoolBlob,languageBlob]=await Promise.all([
    fetch('/logo-colegio-juizdefora.png').then(r=>{if(!r.ok)throw new Error('Logo Colégio');return r.blob();}),
    fetch('/logo-language-school.png').then(r=>{if(!r.ok)throw new Error('Logo Language School');return r.blob();})
   ]);
   const dataUrl=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
   const [schoolLogo,languageLogo]=await Promise.all([dataUrl(schoolBlob),dataUrl(languageBlob)]);
   const box=(x:number,y:number,w:number,h:number)=>{doc.setDrawColor(...line);doc.setLineWidth(.35);doc.roundedRect(x,y,w,h,2,2,'S');};
   const score=(value:number,max:number,always=false)=>always||value>0?`${value.toFixed(1).replace('.',',')}`:'-';
   const gradeAverage=(row:Boletim)=>{const values=[row.midTerm,row.endOfTerm].filter(v=>v>0);return values.length?values.reduce((a,v)=>a+v,0)/values.length:0;};
   doc.addImage(schoolLogo,'PNG',10,7,100,26.3);
   doc.addImage(languageLogo,'PNG',171,6,28,28);
   doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text('BOLETIM ESCOLAR',105,47,{align:'center'});
   doc.setFontSize(7);doc.setCharSpace(2);doc.text('LANGUAGE SCHOOL',105,53,{align:'center'});doc.setCharSpace(0);
   doc.setFillColor(...navy);doc.roundedRect(97.5,6,15,6,1,1,'F');doc.setTextColor(255,255,255);doc.setFontSize(6);doc.text('2026',105,10,{align:'center'});
   box(14,59,182,28);doc.setTextColor(...navy);doc.setFontSize(7);doc.text('STUDENT’S FULL NAME',21,67);doc.setFontSize(12);doc.text(student(b.estudanteId),21,74);
   doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(`TURMA: ${className}`,21,81);doc.setFont('helvetica','normal');doc.text('PERÍODO: 1º Semestre / 2026',75,81);
   doc.setDrawColor(...line);doc.line(118,63,118,83);doc.setFontSize(7);doc.text('DATA DE EMISSÃO:',126,68);doc.setFont('helvetica','normal');doc.text(new Date().toLocaleDateString('pt-BR'),126,73);
   doc.setFont('helvetica','bold');doc.text('PROFESSOR(A):',126,79);doc.setFont('helvetica','normal');doc.text(b.professor,126,84);
   doc.setFillColor(...navy);doc.roundedRect(14,92,182,8,2,2,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('RESULTADOS ACADEMICOS',19,97.5);
   const widths=[42,23,23,23,23,23,23],headers=['COMPONENTES','MID-TERM\n(100,0)','END-OF-TERM\n(100,0)','LISTENING\n(20,0)','SPEAKING\n(60,0)','PERFORMANCE\n(20,0)','MEDIA FINAL\n(100,0)'];
   let x=14,y=101;headers.forEach((h,i)=>{doc.setFillColor(...(i===0?navy:i===1?[235,137,16]:i===2?blue:i===3?[63,151,102]:i===4?[126,68,145]:i===5?gold:navy) as [number,number,number]);doc.rect(x,y,widths[i],12,'F');doc.setTextColor(255,255,255);doc.setFontSize(5.2);doc.text(h.split('\n'),x+widths[i]/2,y+4.5,{align:'center'});x+=widths[i];});
   const studentAvg=gradeAverage(b);
   const componentRows=[
    ['Mid-Term',score(b.midTerm,100,true),'-','-','-','-',score(studentAvg,100,true)],
    ['End-of-Term','-',score(b.endOfTerm,100),'-','-','-','-'],
    ['Listening','-','-',score(b.listening,20),'-','-','-'],
    ['Speaking','-','-','-',score(b.speaking,60),'-','-'],
    ['Performance','-','-','-','-',score(b.performance,20),'-'],
    ['MEDIA FINAL',score(b.midTerm,100,true),score(b.endOfTerm,100),score(b.listening,20),score(b.speaking,60),score(b.performance,20),score(studentAvg,100,true)]
   ];
   y=113;componentRows.forEach((row,index)=>{x=14;const summary=index===componentRows.length-1;doc.setFillColor(summary?242:index%2?249:255,summary?245:index%2?251:255,summary?250:index%2?253:255);doc.rect(14,y,180,7,'F');doc.setDrawColor(...line);doc.rect(14,y,180,7,'S');row.forEach((value,i)=>{if(i>0)doc.line(x,y,x,y+7);const numeric=value!=='-'?Number(String(value).replace(',','.')):NaN;doc.setTextColor(i>0&&Number.isFinite(numeric)&&numeric<70?220:18,i>0&&Number.isFinite(numeric)&&numeric<70?45:38,i>0&&Number.isFinite(numeric)&&numeric<70?45:64);doc.setFont('helvetica',i===0||summary?'bold':'normal');doc.setFontSize(i===0?5.7:6);doc.text(String(value),i===0?x+2:x+widths[i]/2,y+4.7,{align:i===0?'left':'center'});x+=widths[i];});y+=7;});
   y+=6;box(14,y,182,29);doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('COMENTÁRIO DO PROFESSOR',22,y+8);doc.setFont('helvetica','italic');doc.setFontSize(6.5);doc.setTextColor(25,35,55);doc.text(doc.splitTextToSize(b.comentario,164),22,y+15);
   doc.setFillColor(...navy);doc.triangle(0,282,0,297,165,297,'F');doc.setFillColor(...gold);doc.triangle(80,292,210,285,210,297,'F');doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text(b.professor,105,279,{align:'center'});doc.setDrawColor(...blue);doc.line(78,275,132,275);doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.text('Language School',105,284,{align:'center'});
   doc.save(`boletim-${className.replace(/[^a-z0-9]+/gi,'-')}.pdf`);
  }catch{toast.error('Não foi possível gerar o PDF.');}
 };
 const classes=ctx.turmas.map(t=><option key={t.id} value={t.id}>{turma(t.id)}</option>);
 const students=enrolled.map(e=><option key={e.id} value={e.id}>{e.nome}</option>);
 const comments=Object.entries(BOLETIM_COMMENTS).map(([g,list])=><optgroup label={g} key={g}>{list.map(c=><option key={c}>{c}</option>)}</optgroup>);
 const num=(key:keyof Form,max:number)=>(e:any)=>setForm({...form,[key]:Math.min(max,Math.max(0,Number(e.target.value)))});
 if(!allowed)return <Card><CardContent>Acesso restrito ao grupo Language School.</CardContent></Card>;
 const reportRows=visible.map(b=><div className='grid grid-cols-6 gap-2 border-b p-3' key={b.id}><b>{student(b.estudanteId)}</b><span>{turma(b.turmaId)}</span><span>{b.professor}</span><span>{b.midTerm} / {b.endOfTerm}</span><span>{b.status}</span><span className='flex flex-wrap gap-2'><Button size='sm' onClick={()=>edit(b)}>Editar</Button><Button size='sm' variant='outline' onClick={()=>pdf(b)}>PDF</Button></span></div>);
 const pending=ctx.inscricoes.filter(i=>(!filters.turma||i.turmaAtividadeId===filters.turma)&&student(i.estudanteId).toLowerCase().includes(filters.estudante.toLowerCase())&&!items.some(b=>b.turmaId===i.turmaAtividadeId&&b.estudanteId===i.estudanteId));
 const pendingRows=pending.map(i=><div className='grid grid-cols-6 gap-2 border-b p-3' key={i.id}><b>{student(i.estudanteId)}</b><span>{turma(i.turmaAtividadeId)}</span><span>-</span><span>-</span><span className='text-amber-600 font-medium'>Pendente</span><span className='flex flex-wrap gap-2'><Button size='sm' onClick={()=>createFor(i)}>Lançar notas</Button></span></div>);
 const rows=[...reportRows,...pendingRows];
 const pageCount=Math.max(1,Math.ceil(rows.length/pageSize));
 const safePage=Math.min(page,pageCount);
 const paginatedRows=rows.slice((safePage-1)*pageSize,safePage*pageSize);
 const listHeader=<div className='grid grid-cols-6 gap-2 border-b bg-muted/40 p-3 text-xs font-semibold uppercase text-muted-foreground'><span>Estudante</span><span>Turma</span><span>Professor</span><span>Mid / End</span><span>Status</span><span>Ações</span></div>;
 const pagination=<div className='flex flex-wrap items-center justify-end gap-3 border-t bg-muted/20 px-4 py-3'><label className='text-sm text-muted-foreground' htmlFor='boletim-page-size'>Itens por página:</label><select id='boletim-page-size' className='h-9 rounded-md border bg-background px-3 text-sm' value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>{[10,20,30,50].map(size=><option key={size} value={size}>{size}</option>)}</select><Button size='sm' variant='outline' disabled={safePage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>Anterior</Button><span className='min-w-16 text-center text-sm font-semibold'>{safePage} / {pageCount}</span><Button size='sm' variant='outline' disabled={safePage===pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>Próxima</Button></div>;
 const listView=<Card className='overflow-hidden'><CardContent className='p-0'>{listHeader}{rows.length?paginatedRows:<p className='p-6'>Nenhum estudante ou boletim encontrado.</p>}{pagination}</CardContent></Card>; const selectorsView=<><div className='space-y-2'><Label>Turma</Label><select className='h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm' value={form.turmaId} onChange={e=>setForm({...form,turmaId:e.target.value,estudanteId:''})}><option value=''>Selecione</option>{classes}</select></div><div className='space-y-2'><Label>Student Full Name</Label><select className='h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm' value={form.estudanteId} onChange={e=>setForm({...form,estudanteId:e.target.value})}><option value=''>Selecione</option>{students}</select></div><div className='space-y-2 md:col-span-2'><Label>Professor</Label><Input disabled={!!usuario?.isProfessor} value={form.professor} onChange={e=>setForm({...form,professor:e.target.value})}/></div></>;
 const gradesView=<>{([['midTerm','Mid-Term',100],['endOfTerm','End-of-Term',100],['listening','Listening',20],['speaking','Speaking',60],['performance','Performance',20]] as const).map(([key,label,max])=><div className='space-y-2' key={key}><Label>{label} / {max}</Label><Input type='number' min={0} max={max} step='0.1' value={form[key]} onChange={num(key,max)}/></div>)}</>;
 const commentView=<><div className='space-y-2 md:col-span-2 min-w-0'><Label>Comentario pronto</Label><select className='h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm' onChange={e=>setForm({...form,comentario:e.target.value})}><option value=''>Escolha por desempenho</option>{comments}</select></div><div className='space-y-2 md:col-span-2'><Label>Comentario do professor</Label><Textarea className='min-h-28 resize-y' value={form.comentario} onChange={e=>setForm({...form,comentario:e.target.value})}/></div></>;
 const formView=<Dialog open={open} onOpenChange={setOpen}><DialogContent className='w-[calc(100%_-_2rem)] max-w-3xl max-h-[90vh] overflow-y-auto'><DialogTitle>{editing?'Editar boletim':'Novo boletim'}</DialogTitle><div className='grid min-w-0 gap-4 md:grid-cols-2'>{selectorsView}{gradesView}{commentView}</div><DialogFooter className='gap-2 pt-2'><Button variant='outline' onClick={()=>setOpen(false)}>Cancelar</Button><Button variant='secondary' onClick={()=>save('rascunho')}>Salvar rascunho</Button><Button onClick={()=>save('finalizado')}>Finalizar boletim</Button></DialogFooter></DialogContent></Dialog>;
 return <div className='space-y-6'><div className='flex justify-between'><h2 className='text-2xl font-bold'>Boletim Escolar</h2><Button disabled={!writable} onClick={()=>edit()}>Criar boletim</Button></div><Card><CardContent className='p-4 grid gap-3 md:grid-cols-3'><select className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring' value={filters.turma} onChange={e=>setFilters({...filters,turma:e.target.value})}><option value=''>Turmas</option>{classes}</select><Input placeholder='Estudante' onChange={e=>setFilters({...filters,estudante:e.target.value})}/><Input placeholder='Professor' onChange={e=>setFilters({...filters,professor:e.target.value})}/></CardContent></Card>{listView}{formView}</div>;
}
