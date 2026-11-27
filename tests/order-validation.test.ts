import test from 'node:test';
import assert from 'node:assert/strict';
import { demo } from '../src/lib/demo';
import { orderIssues } from '../src/lib/order-validation';

test('um único lanche pode ser revisado e enviado',()=>{
  assert.deepEqual(orderIssues(demo(),'central','centro',{lanche:1},'2026-11-27T09:00','08:30'),[]);
});
test('origem igual ao destino tem explicação, sem relação com a quantidade mínima',()=>{
  const issues=orderIssues(demo(),'centro','centro',{lanche:1},'2026-11-27T09:00','08:30');
  assert.ok(issues.some(i=>i.includes('Origem e destino precisam ser diferentes')));
  assert.ok(!issues.some(i=>i.includes('quantidade maior')));
});
test('origem inativa é identificada mesmo quando configurada na rotina',()=>{
  const d=demo();d.units[0].active=false;
  assert.ok(orderIssues(d,'central','centro',{lanche:1},'2026-11-27T09:00','08:30').some(i=>i.includes('Central está inativa')));
});
test('quantidade inválida, data inválida e setor de outra origem são explicados',()=>{
  const d=demo();d.units.push({id:'outra',name:'Outra loja',active:true});
  assert.ok(orderIssues(d,'outra','centro',{lanche:1},'2026-11-27T09:00','08:30').some(i=>i.includes('setor responsável')));
  const issues=orderIssues(d,'central','centro',{lanche:NaN},'inválida','99:99');
  assert.ok(issues.some(i=>i.includes('quantidades válidas')));
  assert.ok(issues.some(i=>i.includes('data e hora válidas')));
  assert.ok(issues.some(i=>i.includes('horário')));
});
