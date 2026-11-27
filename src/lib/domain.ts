export type Role = 'admin' | 'manager' | 'attendant' | 'kitchen' | 'driver';
export type Unit = { id: string; name: string; active: boolean; operatingProfile?: 'auto' | 'store' | 'supply' };
export type Sector = { id: string; name: string; unitId: string };
export type Route = { id: string; name: string; mode: 'separation' | 'production'; printTitle: string; printer: string };
export type Named = { id: string; name: string };
export type Product = { id: string; name: string; category: string; unit: string; content: string; packSize: number; fractions: boolean; kind: 'separation' | 'production'; routeId: string; sectorId: string; erpName: string; erpProductId: string; erpFactor: number; active: boolean };
export type Person = { id: string; name: string; email: string; role: Role; unitIds: string[] };
export type Routine = { id: string; unitId: string; sourceId: string; name: string; cutoff: string; ready: string; delivery: string; nextDay: boolean };
export type Line = { productId: string; name: string; unit: string; kind: Product['kind']; routeId: string; routeName: string; sectorId: string; erpName: string; erpFactor: number; requested: number; prepared?: number; received?: number };
export type Order = { id: string; number: string; sourceId: string; destinationId: string; due: string; ready: string; note: string; status: 'requested' | 'preparing' | 'dispatched' | 'received'; lines: Line[]; createdAt: string; actor: string; dispatchedAt?: string; receivedAt?: string; receiptNote?: string; divergence: boolean; resolution?: string; erpAt?: string; volumes?: string; seals?: string; driver?: string };
export type Count = { id: string; unitId: string; createdAt: string; actor: string; lines: { productId: string; closed: number; opened: number; loose: number; condition: string }[] };
export type Event = { id: string; at: string; actor: string; action: string; detail: string; unitIds: string[] };
export type Settings = { brand: string; primary: string; accent: string; whatsapp: string; losses: boolean };
export type Data = { id: string; name: string; units: Unit[]; referenceUnits?: Unit[]; supplierCountsPending?: boolean; sectors: Sector[]; routes: Route[]; categories: Named[]; erpProducts: Named[]; products: Product[]; people: Person[]; routines: Routine[]; orders: Order[]; counts: Count[]; events: Event[]; settings: Settings };
export type Operation = { type: 'save_unit' | 'save_sector' | 'save_route' | 'save_category' | 'save_erp' | 'save_product' | 'save_person' | 'save_routine' | 'save_settings'; record: unknown } | { type: 'create_order'; order: Order } | { type: 'prepare'; id: string; amounts: Record<string, number> } | { type: 'dispatch'; id: string; volumes: string; seals: string; driver: string } | { type: 'receive'; id: string; amounts: Record<string, number>; note: string } | { type: 'count'; count: Count } | { type: 'resolve'; id: string; note: string } | { type: 'mark_erp'; id: string; reference: string };
export const roles: Record<Role, string> = { admin: 'Administrador', manager: 'Gestor', attendant: 'Atendente', kitchen: 'Produção', driver: 'Entregador' };
export const statusLabels = { requested: 'Solicitado', preparing: 'Em preparação', dispatched: 'Em transporte', received: 'Recebido' };
export const uid = () => crypto.randomUUID();
export const qty = (n: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(n);
export const stamp = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export function amount(n: unknown) { const v = Number(n); if (!Number.isFinite(v) || v < 0 || v > 1000000) throw new Error('Informe uma quantidade válida entre 0 e 1.000.000.'); return v; }
export function erpSummary(lines: Line[]) {
  const grouped: Record<string, number> = {};
  for (const l of lines) if (l.received !== undefined && l.erpName) grouped[l.erpName] = (grouped[l.erpName] || 0) + l.received * l.erpFactor;
  return Object.entries(grouped).map(([name, quantity]) => ({ name, quantity }));
}
export function apply(data: Data, op: Operation, actor: string): Data {
  const d: Data = structuredClone(data); const at = new Date().toISOString(); let detail = ''; let units: string[] = [];
  const find = (id: string) => { const o = d.orders.find(x => x.id === id); if (!o) throw new Error('Pedido não encontrado.'); units = [o.sourceId, o.destinationId]; detail = o.number; return o; };
  if (op.type.startsWith('save_')) {
    const save = op as Extract<Operation, { record: unknown }>;
    if (save.type === 'save_settings') d.settings = save.record as Settings;
    else {
      const key = { save_unit: 'units', save_sector: 'sectors', save_route: 'routes', save_category: 'categories', save_erp: 'erpProducts', save_product: 'products', save_person: 'people', save_routine: 'routines' }[save.type] as 'units' | 'sectors' | 'routes' | 'categories' | 'erpProducts' | 'products' | 'people' | 'routines';
      const r = save.record as { id: string; name: string };
      if (!r.id || !r.name?.trim()) throw new Error('Preencha o nome.');
      if (save.type === 'save_category') {
        const previous = d.categories.find(c => c.id === r.id);
        if (previous) d.products.forEach(p => { if (p.category === previous.name) p.category = r.name; });
      }
      // Each collection uses UUID keys; order lines keep a historical snapshot.
      const rows = d[key] as { id: string; name: string }[]; const i = rows.findIndex(x => x.id === r.id); if (i < 0) rows.push(r); else rows[i] = r;
      detail = r.name;
    }
  } else if (op.type === 'create_order') {
    if (op.order.sourceId === op.order.destinationId) throw new Error('Origem e destino precisam ser diferentes.');
    if (!d.units.some(u => u.id === op.order.sourceId && u.active) || !d.units.some(u => u.id === op.order.destinationId && u.active)) throw new Error('Selecione unidades ativas.');
    if (!op.order.lines.length || op.order.lines.some(l => amount(l.requested) <= 0)) throw new Error('Adicione ao menos um produto com quantidade maior que zero.');
    op.order.lines.forEach(l => { if (!d.products.some(p => p.id === l.productId && p.active)) throw new Error('Produto indisponível.'); });
    const number = String(d.orders.length + 1).padStart(4, '0');
    d.orders.unshift({ ...op.order, number, createdAt: at, actor, status: 'requested', divergence: false }); detail = number; units = [op.order.sourceId, op.order.destinationId];
  } else if (op.type === 'prepare') {
    const o = find(op.id); if (!['requested', 'preparing'].includes(o.status)) throw new Error('A expedição já foi registrada.');
    o.lines.forEach(l => { l.prepared = amount(op.amounts[l.productId] ?? 0); }); o.status = 'preparing';
  } else if (op.type === 'dispatch') {
    const o = find(op.id); if (o.status !== 'preparing' || o.lines.some(l => l.prepared === undefined)) throw new Error('Registre a separação e a produção primeiro.');
    if (!op.driver.trim() || !op.volumes.trim()) throw new Error('Informe entregador e volumes.');
    Object.assign(o, { status: 'dispatched', dispatchedAt: at, driver: op.driver, volumes: op.volumes, seals: op.seals });
  } else if (op.type === 'receive') {
    const o = find(op.id); if (o.status !== 'dispatched') throw new Error('Somente uma entrega em transporte pode ser recebida.');
    const amounts = Object.fromEntries(Object.entries(op.amounts).map(([k, v]) => [k, amount(v)]));
    o.lines.forEach(l => { l.received = amounts[l.productId] ?? 0; });
    for (const [id, n] of Object.entries(amounts)) if (n > 0 && !o.lines.some(l => l.productId === id)) {
      const p = d.products.find(x => x.id === id); if (!p) throw new Error('Produto não cadastrado.');
      o.lines.push({ productId: p.id, name: p.name, unit: p.unit, kind: p.kind, routeId: p.routeId, routeName: d.routes.find(r => r.id === p.routeId)?.name || '', sectorId: p.sectorId, erpName: p.erpName, erpFactor: p.erpFactor, requested: 0, prepared: 0, received: n });
    }
    o.divergence = o.lines.some(l => l.prepared !== l.received);
    if (o.divergence && !op.note.trim()) throw new Error('Descreva a divergência antes de confirmar.');
    Object.assign(o, { status: 'received', receivedAt: at, receiptNote: op.note });
  } else if (op.type === 'count') {
    if (!d.units.some(u => u.id === op.count.unitId) || !op.count.lines.length) throw new Error('Unidade ou contagem inválida.');
    if (new Set(op.count.lines.map(l => l.productId)).size !== op.count.lines.length) throw new Error('Há produto duplicado na contagem.');
    op.count.lines.forEach(l => {
      const p = d.products.find(p => p.id === l.productId); if (!p) throw new Error('Produto inválido.');
      amount(l.closed); amount(l.opened); amount(l.loose);
      if (!Number.isInteger(l.closed) || !Number.isInteger(l.loose) || l.opened > 1 || (!p.fractions && l.opened > 0)) throw new Error('Confira embalagens fechadas, avulsos e a fração aberta.');
    });
    d.counts.unshift({ ...op.count, actor, createdAt: at }); units = [op.count.unitId]; detail = `${op.count.lines.length} produtos contados`;
  } else if (op.type === 'resolve') {
    const o = find(op.id); if (!o.divergence || o.resolution) throw new Error('Não há divergência pendente.');
    if (!op.note.trim()) throw new Error('Informe a conclusão da análise.'); o.resolution = op.note;
  } else if (op.type === 'mark_erp') {
    const o = find(op.id); if (o.status !== 'received' || o.erpAt) throw new Error('Recebimento inválido ou já lançado no ERP.');
    if (!op.reference.trim()) throw new Error('Informe a referência do lançamento no ERP.'); o.erpAt = at; detail += ` · ERP: ${op.reference}`;
  }
  const actions: Record<Operation['type'], string> = { save_route: 'Forma de atendimento cadastrada/atualizada', save_category: 'Categoria cadastrada/atualizada', save_erp: 'Correspondência ERP cadastrada/atualizada', save_unit: 'Unidade cadastrada/atualizada', save_sector: 'Setor cadastrado/atualizado', save_product: 'Produto cadastrado/atualizado', save_person: 'Acesso cadastrado/atualizado', save_routine: 'Rotina cadastrada/atualizada', save_settings: 'Configurações atualizadas', create_order: 'Pedido solicitado', prepare: 'Preparação registrada', dispatch: 'Retirada registrada', receive: 'Recebimento conferido', count: 'Contagem registrada', resolve: 'Divergência analisada', mark_erp: 'Lançamento no ERP confirmado' };
  d.events.unshift({ id: uid(), at, actor, action: actions[op.type], detail, unitIds: units }); return d;
}
