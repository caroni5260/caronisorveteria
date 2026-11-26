import { Data } from './domain';
// Only demonstration fixtures. A newly created company starts with empty registries.
export function demo(): Data {
  const now = new Date(); const due = new Date(now); due.setHours(17, 0, 0, 0);
  return {
    id: 'demo-caroni', name: 'Empório Caroni',
    units: [{ id: 'central', name: 'Central', active: true }, { id: 'centro', name: 'Centro', active: true }],
    sectors: [{ id: 'estoque', name: 'Estoque', unitId: 'central' }, { id: 'camara', name: 'Câmara fria', unitId: 'central' }, { id: 'cozinha', name: 'Cozinha', unitId: 'central' }],
    routes: [{ id: 'separacao', name: 'Reposição normal', mode: 'separation', printTitle: 'Lista de separação', printer: '' }, { id: 'producao', name: 'Produção sob pedido', mode: 'production', printTitle: 'Comanda de produção', printer: '' }],
    categories: ['Sorvetes','Complementos','Bebidas','Produção','Embalagens'].map(name => ({ id: name, name })),
    erpProducts: ['Balde de sorvete','Granola 500 g','Coca-Cola lata','Lanche natural','Copo descartável'].map(name => ({ id: name, name })),
    products: [
      { id: 'chocolate', name: 'Sorvete de chocolate', category: 'Sorvetes', unit: 'Balde', content: '12 L', packSize: 1, fractions: true, kind: 'separation', routeId: 'separacao', sectorId: 'camara', erpName: 'Balde de sorvete', erpProductId: 'Balde de sorvete', erpFactor: 1, active: true },
      { id: 'morango', name: 'Sorvete de morango', category: 'Sorvetes', unit: 'Balde', content: '12 L', packSize: 1, fractions: true, kind: 'separation', routeId: 'separacao', sectorId: 'camara', erpName: 'Balde de sorvete', erpProductId: 'Balde de sorvete', erpFactor: 1, active: true },
      { id: 'creme', name: 'Sorvete de creme', category: 'Sorvetes', unit: 'Balde', content: '12 L', packSize: 1, fractions: true, kind: 'separation', routeId: 'separacao', sectorId: 'camara', erpName: 'Balde de sorvete', erpProductId: 'Balde de sorvete', erpFactor: 1, active: true },
      { id: 'granola', name: 'Granola', category: 'Complementos', unit: 'Saco', content: '500 g', packSize: 1, fractions: false, kind: 'separation', routeId: 'separacao', sectorId: 'estoque', erpName: 'Granola 500 g', erpProductId: 'Granola 500 g', erpFactor: 1, active: true },
      { id: 'coca', name: 'Coca-Cola', category: 'Bebidas', unit: 'Unidade', content: 'Lata · 350 ml', packSize: 1, fractions: false, kind: 'separation', routeId: 'separacao', sectorId: 'estoque', erpName: 'Coca-Cola lata', erpProductId: 'Coca-Cola lata', erpFactor: 1, active: true },
      { id: 'lanche', name: 'Lanche natural', category: 'Produção', unit: 'Unidade', content: 'Frango', packSize: 1, fractions: false, kind: 'production', routeId: 'producao', sectorId: 'cozinha', erpName: 'Lanche natural', erpProductId: 'Lanche natural', erpFactor: 1, active: true },
      { id: 'copos', name: 'Copos descartáveis', category: 'Embalagens', unit: 'Pacote', content: '100 unidades', packSize: 100, fractions: false, kind: 'separation', routeId: 'separacao', sectorId: 'estoque', erpName: 'Copo descartável', erpProductId: 'Copo descartável', erpFactor: 100, active: true },
    ],
    people: [{ id: 'ana', name: 'Ana Silva', email: 'ana@exemplo.com', role: 'attendant', unitIds: ['centro'] }, { id: 'luciana', name: 'Luciana', email: 'luciana@exemplo.com', role: 'admin', unitIds: ['central', 'centro'] }],
    routines: [{ id: 'tarde', name: 'Reposição da tarde', unitId: 'centro', sourceId: 'central', cutoff: '15:00', ready: '16:30', delivery: '17:00', nextDay: false }, { id: 'manha', name: 'Reposição da manhã', unitId: 'centro', sourceId: 'central', cutoff: '22:00', ready: '08:30', delivery: '09:00', nextDay: true }],
    orders: [{ id: 'demo-order', number: '0001', sourceId: 'central', destinationId: 'centro', due: due.toISOString(), ready: '16:30', note: 'Lanches embalados individualmente.', status: 'dispatched', createdAt: now.toISOString(), dispatchedAt: now.toISOString(), actor: 'Luciana', volumes: '3', seals: '001 a 003', driver: 'João', divergence: false, lines: [
      { productId: 'chocolate', name: 'Sorvete de chocolate', unit: 'Balde', kind: 'separation', routeId: 'separacao', routeName: 'Reposição normal', sectorId: 'camara', erpName: 'Balde de sorvete', erpFactor: 1, requested: 2, prepared: 2 },
      { productId: 'morango', name: 'Sorvete de morango', unit: 'Balde', kind: 'separation', routeId: 'separacao', routeName: 'Reposição normal', sectorId: 'camara', erpName: 'Balde de sorvete', erpFactor: 1, requested: 1, prepared: 1 },
      { productId: 'lanche', name: 'Lanche natural', unit: 'Unidade', kind: 'production', routeId: 'producao', routeName: 'Produção sob pedido', sectorId: 'cozinha', erpName: 'Lanche natural', erpFactor: 1, requested: 20, prepared: 16 },
    ] }],
    counts: [], events: [], settings: { brand: 'Cremoso', primary: '#10145e', accent: '#00a9e5', whatsapp: '', losses: false },
  };
}
export function emptyCompany(name: string): Data {
  return { id: crypto.randomUUID(), name, units: [], sectors: [], routes: [], categories: [], erpProducts: [], products: [], people: [], routines: [], orders: [], counts: [], events: [], settings: { brand: name, primary: '#10145e', accent: '#00a9e5', whatsapp: '', losses: false } };
}
