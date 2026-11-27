'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Count, Data, qty, stamp } from '@/lib/domain';

export default function CountPrint({ data, counts, close }: { data: Data; counts: Count[]; close: ()=>void }) {
  useEffect(()=>{
    const original=document.body.getAttribute('data-print-layout');
    document.body.setAttribute('data-print-layout','a4');
    const afterPrint=()=>close();
    window.addEventListener('afterprint',afterPrint);
    const frame=requestAnimationFrame(()=>window.print());
    return ()=>{
      cancelAnimationFrame(frame);window.removeEventListener('afterprint',afterPrint);
      if(original===null)document.body.removeAttribute('data-print-layout');else document.body.setAttribute('data-print-layout',original);
    };
  },[close]);
  const unitName=(id:string)=>(data.referenceUnits||data.units).find(u=>u.id===id)?.name||'Unidade';
  return createPortal(<div className="a4-report">
    <style>{`
      .a4-report{display:none}
      @page count-report{size:A4 portrait;margin:14mm}
      @media print{
        html:has(body[data-print-layout="a4"]),body[data-print-layout="a4"]{width:auto!important;min-width:0!important;height:auto!important;min-height:0!important;background:white!important;margin:0!important;color:#111!important;font-family:Arial,sans-serif!important}
        body[data-print-layout="a4"]>:not(.a4-report){display:none!important}
        .a4-report{display:block!important;page:count-report;width:auto!important;color:#111;font:10pt Arial,sans-serif;line-height:1.4}
        .a4-report h1{font:700 19pt Arial,sans-serif;color:#111;margin:0 0 3mm;letter-spacing:0}
        .a4-report h2{font:700 13pt Arial,sans-serif;color:#111;margin:5mm 0 2mm;letter-spacing:0}
        .a4-report p{font-size:10pt;margin:1.5mm 0;color:#333}
        .a4-report table{font:9pt Arial,sans-serif;width:100%;border-collapse:collapse;margin:4mm 0}
        .a4-report th,.a4-report td{padding:2.5mm 2mm;border:1px solid #ccc;color:#111;font-size:9pt;min-width:0;background:white}
        .a4-report th{font-weight:700;background:#f4f4f4}
        .a4-report thead{display:table-header-group}.a4-report tr{break-inside:avoid}
        .a4-report .report-count{break-before:page}.a4-report .report-count:first-of-type{break-before:auto}
        .a4-report .report-signature{margin-top:9mm;font-size:9pt}
        .a4-report .report-note{font-size:8pt;color:#555;border-top:1px solid #ddd;padding-top:3mm;margin-top:5mm}
      }
    `}</style>
    <h1>{data.name}</h1><p>Histórico de contagens de estoque · {counts.length} registro(s)</p>
    {counts.map(c=><section className="report-count" key={c.id}><h2>{unitName(c.unitId)}</h2><p>Contagem realizada em {stamp(c.createdAt)} · Responsável: {c.actor}</p><p>Identificação: {c.id}</p><table><thead><tr><th>Produto / embalagem</th><th>Fechados</th><th>Fração aberta</th><th>Avulsos</th><th>Situação do aberto</th></tr></thead><tbody>{c.lines.map(l=>{const p=data.products.find(p=>p.id===l.productId);return <tr key={l.productId}><td>{p?.name||l.productId}{p&&<><br/><span>{p.unit} · {p.content}</span></>}</td><td>{qty(l.closed)}</td><td>{qty(l.opened)}</td><td>{qty(l.loose)}</td><td>{l.condition||'—'}</td></tr>;})}</tbody></table><p className="report-signature">Conferido por: __________________________________________</p><p className="report-note">Este documento reproduz as quantidades informadas naquela contagem e não representa o saldo físico atual. Impresso em {new Date().toLocaleString('pt-BR')}.</p></section>)}
  </div>,document.body);
}
