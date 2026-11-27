import test from 'node:test';
import assert from 'node:assert/strict';
import { demo } from '../src/lib/demo';
import { dailyTasks } from '../src/lib/daily-tasks';
import { countScope, isSupplyUnit, supplyOrders } from '../src/lib/unit-operations';

test('unidade fornecedora não recebe tarefas de contagem ou reposição',()=>{
  const d=demo();
  assert.equal(isSupplyUnit(d,'central'),true);
  assert.equal(isSupplyUnit(d,'centro'),false);
  assert.deepEqual(dailyTasks(d,'central'),[]);
  assert.deepEqual(dailyTasks(d,'').filter(t=>t.kind==='count').map(t=>t.unitId),['centro']);
});
test('perfil configurado prevalece e não depende do nome da unidade',()=>{
  const d=demo();d.units[0].name='Unidade X';d.units[1].name='Unidade Y';
  assert.equal(isSupplyUnit(d,'central'),true);
  d.units[0].operatingProfile='store';assert.equal(isSupplyUnit(d,'central'),false);
  d.units[1].operatingProfile='supply';assert.equal(isSupplyUnit(d,'centro'),true);
});
test('histórico da central consulta as unidades atendidas e a fila não mistura origens',()=>{
  const d=demo();assert.deepEqual(countScope(d,'central'),['centro']);
  assert.deepEqual(countScope(d,'centro'),['centro']);assert.equal(countScope(d,''),null);
  assert.equal(supplyOrders(d,'central').length,1);assert.equal(supplyOrders(d,'centro').length,0);
});
