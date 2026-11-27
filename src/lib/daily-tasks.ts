import type { Data, Routine } from './domain';

export type DailyTask = {
  id: string;
  kind: 'order' | 'count';
  title: string;
  unitId: string;
  unitName: string;
  status: 'pending' | 'overdue' | 'done';
  description: string;
  cutoff?: string;
  routine?: Routine;
  due?: Date;
  orderId?: string;
  completedAt?: string;
};

/** Routine times are wall-clock times in the operator's device timezone. */
export function dayKey(value: Date | string): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function atTime(date: Date, time: string, days = 0): Date {
  const result = new Date(date);
  const [hours, minutes] = time.split(':').map(Number);
  result.setDate(result.getDate() + days);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function localDateTime(date: Date): string {
  return `${dayKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function dailyTasks(data: Data, unitId: string, now = new Date()): DailyTask[] {
  const today = dayKey(now);
  const units = data.units.filter(u => u.active && (!unitId || u.id === unitId));
  const availableUnits = new Set(units.map(u => u.id));
  const result: DailyTask[] = [];
  for (const routine of [...data.routines].sort((a, b) => a.cutoff.localeCompare(b.cutoff))) {
    if (!availableUnits.has(routine.unitId)) continue;
    const deadline = atTime(now, routine.cutoff);
    const due = atTime(now, routine.delivery, routine.nextDay ? 1 : 0);
    // Match the actual delivery window, not just any order sent today. This also
    // recognizes legacy orders, without requiring a database migration.
    const order = [...data.orders].filter(o =>
      o.destinationId === routine.unitId && o.sourceId === routine.sourceId &&
      dayKey(o.createdAt) === today &&
      Math.floor(new Date(o.due).getTime() / 60000) === Math.floor(due.getTime() / 60000)
    ).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    const late = order && new Date(order.createdAt) > deadline;
    result.push({
      id: `order:${routine.id}:${today}`, kind: 'order', title: routine.name,
      unitId: routine.unitId, unitName: units.find(u => u.id === routine.unitId)!.name,
      status: order ? 'done' : now > deadline ? 'overdue' : 'pending',
      description: order ? `Pedido #${order.number} enviado${late ? ' após o horário' : ' no prazo'}.` : `Solicitar até ${routine.cutoff}. Entrega ${routine.nextDay ? 'amanhã' : 'hoje'} até ${routine.delivery}.`,
      cutoff: routine.cutoff, routine, due, orderId: order?.id, completedAt: order?.createdAt,
    });
  }
  const activeProducts = new Set(data.products.filter(p => p.active).map(p => p.id));
  if (activeProducts.size) for (const unit of units) {
    const counts = data.counts.filter(c => c.unitId === unit.id && dayKey(c.createdAt) === today);
    const covered = new Set(counts.flatMap(c => c.lines.map(l => l.productId)).filter(id => activeProducts.has(id)));
    const done = covered.size === activeProducts.size;
    result.push({
      id: `count:${unit.id}:${today}`, kind: 'count', title: 'Contagem diária de estoque',
      unitId: unit.id, unitName: unit.name, status: done ? 'done' : 'pending',
      description: done ? `Todos os ${activeProducts.size} produtos ativos foram contados hoje.` : `${covered.size} de ${activeProducts.size} produtos contados hoje. ${activeProducts.size - covered.size} pendente(s).`,
      completedAt: done ? [...counts].sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0]?.createdAt : undefined,
    });
  }
  return result;
}
