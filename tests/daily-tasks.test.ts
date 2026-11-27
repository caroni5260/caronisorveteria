import test from 'node:test';
import assert from 'node:assert/strict';
import { demo } from '../src/lib/demo';
import { atTime, dailyTasks, dayKey } from '../src/lib/daily-tasks';

const now = new Date(2026,10,26,16,0,0);
test('rotinas de tarde e manhã geram pendências independentes e prazo ultrapassado',()=>{
  const d=demo();d.orders=[];
  const tasks=dailyTasks(d,'centro',now);
  assert.equal(tasks.length,3);
  assert.equal(tasks.find(t=>t.routine?.id==='tarde')?.status,'overdue');
  assert.equal(tasks.find(t=>t.routine?.id==='manha')?.status,'pending');
  assert.equal(dayKey(tasks.find(t=>t.routine?.id==='manha')!.due!),'2026-11-27');
});
test('um pedido de tarde não conclui o pedido da manhã, e pedido de ontem não conclui hoje',()=>{
  const d=demo();const o=d.orders[0];o.createdAt=atTime(now,'14:00').toISOString();o.due=atTime(now,'17:00').toISOString();
  const tasks=dailyTasks(d,'centro',now);
  assert.equal(tasks.find(t=>t.routine?.id==='tarde')?.status,'done');
  assert.equal(tasks.find(t=>t.routine?.id==='manha')?.status,'pending');
  o.createdAt=atTime(now,'14:00',-1).toISOString();
  assert.equal(dailyTasks(d,'centro',now).find(t=>t.routine?.id==='tarde')?.status,'overdue');
});
test('contagem parcial não conclui o dia; contagens complementares concluem',()=>{
  const d=demo();const line=(productId:string)=>({productId,closed:0,opened:0,loose:0,condition:''});
  d.counts=[{id:'1',unitId:'centro',actor:'Ana',createdAt:atTime(now,'10:00').toISOString(),lines:[line(d.products[0].id)]}];
  assert.equal(dailyTasks(d,'centro',now).find(t=>t.kind==='count')?.status,'pending');
  d.counts.push({id:'2',unitId:'centro',actor:'Ana',createdAt:atTime(now,'11:00').toISOString(),lines:d.products.slice(1).map(p=>line(p.id))});
  assert.equal(dailyTasks(d,'centro',now).find(t=>t.kind==='count')?.status,'done');
  assert.equal(dailyTasks(d,'centro',atTime(now,'01:00',1)).find(t=>t.kind==='count')?.status,'pending');
});
test('contagem de outra unidade ou de ontem não elimina a pendência',()=>{
  const d=demo();const lines=d.products.map(p=>({productId:p.id,closed:0,opened:0,loose:0,condition:''}));
  d.counts=[{id:'a',unitId:'central',actor:'Ana',createdAt:now.toISOString(),lines},{id:'b',unitId:'centro',actor:'Ana',createdAt:atTime(now,'20:00',-1).toISOString(),lines}];
  assert.equal(dailyTasks(d,'centro',now).find(t=>t.kind==='count')?.status,'pending');
});
test('produtos inativos não impedem a conclusão e quantidades zeradas são contagens válidas',()=>{
  const d=demo();d.products.slice(1).forEach(p=>p.active=false);
  d.counts=[{id:'1',unitId:'centro',actor:'Ana',createdAt:now.toISOString(),lines:[{productId:d.products[0].id,closed:0,opened:0,loose:0,condition:''}]}];
  assert.equal(dailyTasks(d,'centro',now).find(t=>t.kind==='count')?.status,'done');
  d.units[1].active=false;
  assert.equal(dailyTasks(d,'centro',now).length,0);
});
