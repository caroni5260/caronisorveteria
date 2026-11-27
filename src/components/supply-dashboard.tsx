'use client';

import { useState } from 'react';
import { AlertTriangle, Box, ChefHat, ClipboardCheck, Clock3, History, Printer, Search, Truck } from 'lucide-react';
import { Data, qty, stamp, statusLabels } from '@/lib/domain';
import { supplyOrders } from '@/lib/unit-operations';

export default function SupplyDashboard({ data, unitId, openOrder, history }: { data: Data; unitId: string; openOrder: (id:string)=>void; history: (tab:string)=>void }) {
  const [status,setStatus] = useState('pending'); const [sector,setSector] = useState(''); const [search,setSearch] = useState('');
  const unitName=(id:string)=>(data.referenceUnits||data.units).find(u=>u.id===id)?.name||'Unidade';
  const orders=supplyOrders(data,unitId);
  const pending=orders.filter(o=>['requested','preparing'].includes(o.status));
  const awaitingProduction=pending.filter(o=>o.lines.some(l=>l.kind==='production'));
  const shown=orders.filter(o=>(status==='all'||status==='pending'&&['requested','preparing'].includes(o.status)||o.status===status)&&(!sector||o.lines.some(l=>l.sectorId===sector))&&`${o.number} ${unitName(o.destinationId)}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  return <>
    <div className="page-heading"><div><p className="eyebrow">{unitName(unitId)} · ATENDIMENTO ÀS UNIDADES</p><h1>Central de pedidos<span className="cyan">.</span></h1><p>O que preparar, para qual unidade e até que horas.</p></div><button className="button secondary" onClick={()=>history('orders')}><History size={17}/> Histórico de pedidos</button></div>
    <div className="stats-grid supply-stats"><button className="stat" onClick={()=>setStatus('pending')}><span><ClipboardCheck/>Pedidos para atender</span><strong>{pending.length}</strong><small>Aguardando separação ou produção</small></button><button className="stat" onClick={()=>setStatus('pending')}><span><ChefHat/>Com itens de produção</span><strong>{awaitingProduction.length}</strong><small>Encaminhar ao setor responsável</small></button><button className="stat" onClick={()=>setStatus('dispatched')}><span><Truck/>Em transporte</span><strong>{orders.filter(o=>o.status==='dispatched').length}</strong><small>Acompanhar até a conferência</small></button></div>
    <div className="supply-shortcuts"><button onClick={()=>history('counts')}><ClipboardCheck size={21}/><div><strong>Contagens das unidades atendidas</strong><small>Consultar histórico e imprimir em A4</small></div><Printer size={18}/></button><button onClick={()=>history('receipts')}><Truck size={21}/><div><strong>Recebimentos e divergências</strong><small>Veja o que chegou em cada unidade</small></div><History size={18}/></button></div>
    <div className="section-title spaced"><h2>Fila de atendimento</h2><span className="muted">{shown.length} pedido(s)</span></div>
    <div className="tabs"><button className={status==='pending'?'selected':''} onClick={()=>setStatus('pending')}>Para preparar</button><button className={status==='dispatched'?'selected':''} onClick={()=>setStatus('dispatched')}>Em transporte</button><button className={status==='received'?'selected':''} onClick={()=>setStatus('received')}>Recebidos</button><button className={status==='all'?'selected':''} onClick={()=>setStatus('all')}>Todos</button></div>
    <div className="toolbar"><div className="search"><Search size={18}/><input aria-label="Buscar pedido ou destino" placeholder="Buscar pedido ou destino" value={search} onChange={e=>setSearch(e.target.value)}/></div><select aria-label="Filtrar setor responsável" value={sector} onChange={e=>setSector(e.target.value)}><option value="">Todos os setores</option>{data.sectors.filter(s=>s.unitId===unitId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    <div className="supply-queue">{shown.map(o=>{
      const sectors=[...new Set(o.lines.map(l=>l.sectorId))];
      return <article key={o.id} className="panel supply-order"><header><div><span className="eyebrow">PEDIDO #{o.number}</span><h2>Enviar para {unitName(o.destinationId)}</h2><p><Clock3 size={15}/> Pronto até {o.ready} · Entrega {stamp(o.due)}</p></div><span className={`tag ${o.status==='received'?'success':'blue'}`}>{statusLabels[o.status]}</span></header>
        {sectors.filter(id=>!sector||sector===id).map(id=><section key={id} className="supply-sector"><div className="supply-sector-title"><span className="product-icon">{o.lines.filter(l=>l.sectorId===id).some(l=>l.kind==='production')?<ChefHat size={20}/>:<Box size={20}/>}</span><div><h3>{data.sectors.find(s=>s.id===id)?.name||'Setor responsável'}</h3><small>{[...new Set(o.lines.filter(l=>l.sectorId===id).map(l=>l.routeName))].join(' · ')}</small></div></div>{o.lines.filter(l=>l.sectorId===id).map(l=><div key={l.productId} className="supply-item"><span>{l.name}</span><strong>{qty(l.requested)} {l.unit.toLowerCase()}(s)</strong></div>)}</section>)}
        <footer>{o.divergence?<span className="tag warning"><AlertTriangle size={13}/> Divergência registrada</span>:<small>Solicitado por {o.actor}</small>}<button className="button primary" onClick={()=>openOrder(o.id)}><Printer size={16}/> Abrir e imprimir por setor</button></footer>
      </article>;
    })}</div>
    {!shown.length&&<div className="panel empty"><ClipboardCheck size={35}/><h3>{status==='pending'?'Nenhum pedido aguardando preparação':'Nenhum pedido com esses filtros'}</h3><p>Os pedidos enviados pelas unidades aparecerão aqui, separados por destino e setor.</p></div>}
  </>;
}
