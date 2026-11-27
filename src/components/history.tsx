'use client';

import { useState } from 'react';
import { Check, ClipboardCheck, History as HistoryIcon, Search, Truck } from 'lucide-react';
import { Data, qty, stamp } from '@/lib/domain';
import { dayKey } from '@/lib/daily-tasks';

export default function History({ data, unitId, openOrder }: { data: Data; unitId: string; openOrder: (id: string) => void }) {
  const [tab, setTab] = useState('activities');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState('');
  const unitName = (id: string) => (data.referenceUnits || data.units).find(u => u.id === id)?.name || 'Unidade';
  const includes = (s: string) => s.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
  const inRange = (s: string) => (!from || dayKey(s) >= from) && (!to || dayKey(s) <= to);
  const orders = data.orders.filter(o => (!unitId || [o.sourceId,o.destinationId].includes(unitId)) && (tab !== 'receipts' || o.status === 'received') && inRange(tab === 'receipts' ? o.receivedAt! : o.createdAt) && includes(`${o.number} ${unitName(o.sourceId)} ${unitName(o.destinationId)} ${o.actor}`)).sort((a,b) => (tab === 'receipts' ? b.receivedAt! : b.createdAt).localeCompare(tab === 'receipts' ? a.receivedAt! : a.createdAt));
  const counts = data.counts.filter(c => (!unitId || c.unitId === unitId) && inRange(c.createdAt) && includes(`${unitName(c.unitId)} ${c.actor}`)).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const events = data.events.filter(e => (!unitId || !e.unitIds.length || e.unitIds.includes(unitId)) && inRange(e.at) && includes(`${e.action} ${e.actor} ${e.detail}`));
  return <>
    <div className="tabs history-tabs">{[['activities','Atividades'],['orders','Pedidos'],['receipts','Recebimentos'],['counts','Contagens']].map(([id,label]) => <button key={id} className={tab === id ? 'selected' : ''} onClick={() => {setTab(id);setExpanded('');}}>{label}</button>)}</div>
    <div className="history-filters"><div className="search"><Search size={18}/><input aria-label="Buscar no histórico" placeholder="Buscar no histórico" value={query} onChange={e=>setQuery(e.target.value)}/></div><label>De<input aria-label="Data inicial" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Até<input aria-label="Data final" type="date" min={from} value={to} onChange={e=>setTo(e.target.value)}/></label></div>
    {tab === 'activities' && <div className="panel timeline">{events.map(e=><div className="timeline-row" key={e.id}><span className="timeline-icon"><Check size={16}/></span><div><strong>{e.action}</strong><p>{e.detail}</p><small>{e.actor} · {stamp(e.at)}</small></div></div>)}{!events.length && <HistoryEmpty text="Nenhuma atividade neste período."/>}</div>}
    {['orders','receipts'].includes(tab) && <div className="panel order-list">{orders.map(o=><button key={o.id} className="order-card" onClick={()=>openOrder(o.id)}><span className="order-icon"><Truck size={21}/></span><div className="grow"><strong>Pedido #{o.number}</strong><p>{unitName(o.sourceId)} / {unitName(o.destinationId)}</p><small>{tab==='receipts'?'Recebido':'Solicitado'} em {stamp(tab==='receipts'?o.receivedAt!:o.createdAt)}{tab==='orders'?` · ${o.actor}`:''}</small></div><span className={`tag ${o.divergence?'warning':o.status==='received'?'success':'blue'}`}>{o.divergence?'Com divergência':o.status==='received'?'Recebido':o.status==='dispatched'?'Em transporte':o.status==='preparing'?'Em preparação':'Solicitado'}</span></button>)}{!orders.length && <HistoryEmpty text={tab==='receipts'?'Nenhum recebimento neste período.':'Nenhum pedido neste período.'}/>}</div>}
    {tab === 'counts' && <div className="panel count-history">{counts.map(c=><section key={c.id}><button className="order-card" aria-expanded={expanded===c.id} onClick={()=>setExpanded(expanded===c.id?'':c.id)}><span className="order-icon"><ClipboardCheck size={21}/></span><div className="grow"><strong>{unitName(c.unitId)}</strong><p>{c.actor} · {stamp(c.createdAt)}</p></div><span className="tag blue">{c.lines.length} produtos</span><span className="text-link">{expanded===c.id?'Fechar':'Detalhes'}</span></button>{expanded===c.id&&<div className="table-scroll"><table><thead><tr><th>Produto</th><th>Fechados</th><th>Fração aberta</th><th>Avulsos</th><th>Situação do aberto</th></tr></thead><tbody>{c.lines.map(l=><tr key={l.productId}><td>{data.products.find(p=>p.id===l.productId)?.name||l.productId}</td><td>{qty(l.closed)}</td><td>{qty(l.opened)}</td><td>{qty(l.loose)}</td><td>{l.condition||'—'}</td></tr>)}</tbody></table></div>}</section>)}{!counts.length&&<HistoryEmpty text="Nenhuma contagem neste período."/>}</div>}
    {tab==='activities'&&data.events.length===500&&<p className="muted">Exibindo as 500 atividades mais recentes disponíveis.</p>}
  </>;
}
function HistoryEmpty({text}:{text:string}) {return <div className="empty"><HistoryIcon size={32}/><h3>{text}</h3><p>Os registros aparecerão aqui após as operações da equipe.</p></div>;}
