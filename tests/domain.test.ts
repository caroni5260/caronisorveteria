import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, erpSummary } from '../src/lib/domain';
import { demo, emptyCompany } from '../src/lib/demo';

test('troca de sabor persiste mesmo quando a consolidação ERP coincide', () => {
  const d=demo(); const r=apply(d,{type:'receive',id:'demo-order',amounts:{chocolate:1,morango:2,lanche:16},note:'Um balde de chocolate foi substituído por morango.'},'Ana');
  assert.equal(r.orders[0].divergence,true);
  assert.equal(erpSummary(r.orders[0].lines).find(r=>r.name==='Balde de sorvete')?.quantity,3);
  assert.equal(r.orders[0].lines[0].received,1);
  assert.equal(d.orders[0].status,'dispatched');
});
test('não recebe duas vezes nem altera expedição após retirada',()=>{
  const r=apply(demo(),{type:'receive',id:'demo-order',amounts:{chocolate:2,morango:1,lanche:16},note:''},'Ana');
  assert.throws(()=>apply(r,{type:'receive',id:'demo-order',amounts:{},note:''},'Ana'));
  assert.throws(()=>apply(r,{type:'prepare',id:'demo-order',amounts:{}},'Luciana'));
});
test('divergência exige justificativa e quantidades não podem ser negativas',()=>{
  assert.throws(()=>apply(demo(),{type:'receive',id:'demo-order',amounts:{chocolate:1,morango:1,lanche:16},note:''},'Ana'));
  assert.throws(()=>apply(demo(),{type:'receive',id:'demo-order',amounts:{chocolate:-1,morango:1,lanche:16},note:'Falta'},'Ana'));
});
test('produto extra entra na conferência e na consolidação com divergência',()=>{
  const r=apply(demo(),{type:'receive',id:'demo-order',amounts:{chocolate:2,morango:1,lanche:16,copos:2},note:'Dois pacotes extras aceitos.'},'Ana');
  assert.equal(r.orders[0].divergence,true);
  assert.equal(erpSummary(r.orders[0].lines).find(r=>r.name==='Copo descartável')?.quantity,200);
});
test('nova empresa não contém classificações ou produtos fixos',()=>{
  const d=emptyCompany('Outra empresa');
  for(const key of ['products','units','routes','categories','erpProducts','sectors','orders'] as const)assert.equal(d[key].length,0);
});
test('o nome e o título de impressão da forma de atendimento podem mudar',()=>{
  const d=demo();const r=apply(d,{type:'save_route',record:{...d.routes[0],name:'Retirada do armazém',printTitle:'Checklist do depósito'}},'Luciana');
  assert.equal(r.routes[0].name,'Retirada do armazém');assert.equal(r.routes[0].printTitle,'Checklist do depósito');
  assert.equal(r.orders[0].lines[0].routeName,'Reposição normal');
});
