import type { Data, Order } from './domain';

/** The workflow comes from configuration, never from a company's or unit's name. */
export function isSupplyUnit(data: Data, unitId: string): boolean {
  if (!unitId) return false;
  const unit = (data.referenceUnits || data.units).find(u => u.id === unitId);
  if (unit?.operatingProfile === 'supply') return true;
  if (unit?.operatingProfile === 'store') return false;
  const supplies = data.routines.some(r => r.sourceId === unitId) || data.orders.some(o => o.sourceId === unitId);
  const requests = data.routines.some(r => r.unitId === unitId) || data.orders.some(o => o.destinationId === unitId);
  return supplies && !requests;
}

export function suppliedUnitIds(data: Data, sourceId: string): string[] {
  return [...new Set([
    ...data.routines.filter(r => r.sourceId === sourceId).map(r => r.unitId),
    ...data.orders.filter(o => o.sourceId === sourceId).map(o => o.destinationId),
  ])];
}

export function countScope(data: Data, unitId: string): string[] | null {
  if (!unitId) return null;
  return isSupplyUnit(data, unitId) ? suppliedUnitIds(data, unitId) : [unitId];
}

export function supplyOrders(data: Data, sourceId: string): Order[] {
  return data.orders.filter(o => o.sourceId === sourceId).sort((a,b) => a.due.localeCompare(b.due));
}
