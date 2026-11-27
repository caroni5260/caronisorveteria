'use client';

import { useCallback, useState } from 'react';
import { Check, ClipboardCheck, History as HistoryIcon, Printer, Search, Truck } from 'lucide-react';
import { Data, qty, stamp } from '@/lib/domain';
import { dayKey } from '@/lib/daily-tasks';
import { countScope, isSupplyUnit } from '@/lib/unit-operations';
import CountPrint from './count-print';

export default function History({ data, unitId, initialTab='activities', openOrder }: { data: Data; unitId: string; initialTab?: string; openOrder: (id: string) => void }) {
  const [tab,setTab]=useState(initialTab); const [query,setQuery]=useState('');
  const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [countUnit,setCountUnit]=useState('');
  const [expanded,setExpanded]=useState(''); const [printing,setPrinting]=useState('');
  const closePrint=useCallback(()=>setPrinting(''),[]);
  const unitName=(id:string)=>(data.referenceUnits||data.units).find(u=>u.id===id)?.name||'Unidade';
  const includes=(s:string)=>s.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
  const inRange=(s:string)=>(!from||dayKey(s)>=from)&&(!to||dayKey(s)<=to);
  const orders=data.orders.filter(o=>(!unitId||[o.sourceId,o.destinationId].includes(unitId))&&(tab!=='receipts'||o.status==='received')&&inRange(tab==='receipts'?o.receivedAt!:o.createdAt)&&includes(`${o.number} ${unitName(o.sourceId)} ${unitName(o.destinationId)} ${o.actor}`)).sort((a,b)=>(tab==='receipts'?b.receivedAt!:b.createdAt).localeCompare(tab==='receipts'?a.receivedAt!:a.createdAt));
  const scope=countScope(data,unitId);
  const counts=data.counts.filter(c=>(scope===null||scope.includes(c.unitId))&&(!countUnit||c.unitId===countUnit)&&inRange(c.createdAt)&&includes(`${unitName(c.unitId)} ${c.actor}`)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const countUnits=(data.referenceUnits||data.units).filter(u=>scope===null||scope.includes(u.id));
  const events=data.events.filter(e=>(!unitId||!e.unitIds.length||e.unitIds.includes(unitId))&&inRange(e.at)&&includes(`${e.action} ${e.actor} ${e.detail}`));
  const reportCounts=printing==='filtered'?counts:counts.filter(c=>c.id===printing);
  return <>
    <div className="tabs history-tabs">{[['activities','Atividades'],['orders','Pedidos'],['receipts','Recebimentos'],['counts','Contagens']].map(([id,label])=><button key={id} className={tab===id?'selected':''} onClick={()=>{setTab(id);setExpanded('');}}>{label}</button>)}</div>
    <div className="history-filters"><div className="search"><Search size={18}/><input aria-label="Buscar no histórico" placeholder="Buscar no histórico" value={query} onChange={e=>setQuery(e.target.value)}/></div><label>De<input aria-label="Data inicial" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Até<input aria-label="Data final" type="date" min={from} value={to} onChange={e=>setTo(e.target.value)}/></label></div>
    {tab==='counts'&&<><div className="toolbar"><div><h2>{isSupplyUnit(data,unitId)?'Contagens das unidades atendidas':'Histórico de contagens'}</h2><p className="muted">Consulte os registros por unidade e período.</p></div><button className="button secondary" disabled={!counts.length} onClick={()=>setPrinting('filtered')}><Printer size={17}/> Imprimir resultado em A4</button></div><label className="field count-unit-filter"><span>Unidade da contagem</span><select value={countUnit} onChange={e=>setCountUnit(e.target.value)}><option value="">Todas as unidades desta consulta</option>{countUnits.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>{data.supplierCountsPending&&isSupplyUnit(data,unitId)&&<div className="notice warning">A consulta das contagens das outras unidades precisa da atualização do banco de dados. Seus pedidos continuam disponíveis normalmente.</div>}</>}
    {tab==='activities'&&<div className="panel timeline">{events.map(e=><div className="timeline-row" key={e.id}><span className="timeline-icon"><Check size={16}/></span><div><strong>{e.action}</strong><p>{e.detail}</p><small>{e.actor} · {stamp(e.at)}</small></div></div>)}{!events.length&&<HistoryEmpty text="Nenhuma atividade neste período."/>}</div>}
    {['orders','receipts'].includes(tab)&&<div className="panel order-list">{orders.map(o=><button key={o.id} className="order-card" onClick={()=>openOrder(o.id)}><span className="order-icon"><Truck size={21}/></span><div className="grow"><strong>Pedido #{o.number}</strong><p>{unitName(o.sourceId)} / {unitName(o.destinationId)}</p><small>{tab==='receipts'?'Recebido':'Solicitado'} em {stamp(tab==='receipts'?o.receivedAt!:o.createdAt)}{tab==='orders'?` · ${o.actor}`:''}</small></div><span className={`tag ${o.divergence?'warning':o.status==='received'?'success':'blue'}`}>{o.divergence?'Com divergência':o.status==='received'?'Recebido':o.status==='dispatched'?'Em transporte':o.status==='preparing'?'Em preparação':'Solicitado'}</span></button>)}{!orders.length&&<HistoryEmpty text={tab==='receipts'?'Nenhum recebimento neste período.':'Nenhum pedido neste período.'}/>}</div>}
    {tab==='counts'&&<div className="panel count-history">{counts.map(c=><section key={c.id}><div className="count-history-heading"><button className="order-card" aria-expanded={expanded===c.id} onClick={()=>setExpanded(expanded===c.id?'':c.id)}><span className="order-icon"><ClipboardCheck size={21}/></span><div className="grow"><strong>{unitName(c.unitId)}</strong><p>{c.actor} · {stamp(c.createdAt)}</p></div><span className="tag blue">{c.lines.length} produtos</span><span className="text-link">{expanded===c.id?'Fechar':'Detalhes'}</span></button><button className="button compact secondary" aria-label={`Imprimir contagem de ${unitName(c.unitId)} em ${stamp(c.createdAt)} em A4`} onClick={()=>setPrinting(c.id)}><Printer size={16}/> A4</button></div>{expanded===c.id&&<div className="table-scroll"><table><thead><tr><th>Produto</th><th>Fechados</th><th>Fração aberta</th><th>Avulsos</th><th>Situação do aberto</th></tr></thead><tbody>{c.lines.map(l=><tr key={l.productId}><td>{data.products.find(p=>p.id===l.productId)?.name||l.productId}</td><td>{qty(l.closed)}</td><td>{qty(l.opened)}</td><td>{qty(l.loose)}</td><td>{l.condition||'—'}</td></tr>)}</tbody></table></div>}</section>)}{!counts.length&&<HistoryEmpty text="Nenhuma contagem neste período."/>}</div>}
    {tab==='activities'&&data.events.length===500&&<p className="muted">Exibindo as 500 atividades mais recentes disponíveis.</p>}
    {printing&&reportCounts.length>0&&<CountPrint data={data} counts={reportCounts} close={closePrint}/>}
  </>;
}
function HistoryEmpty({text}:{text:string}){return <div className="empty"><HistoryIcon size={32}/><h3>{text}</h3><p>Os registros aparecerão aqui após as operações da equipe.</p></div>;}
