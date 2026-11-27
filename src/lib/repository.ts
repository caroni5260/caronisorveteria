import { getSupabase } from './supabase/client';
import { Data, Operation } from './domain';
import { isSupplyUnit } from './unit-operations';
export async function remoteList(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await getSupabase().rpc('workspace_list'); if (error) throw error; return data || [];
}
export async function remoteLoad(id: string): Promise<Data> {
  const { data, error } = await getSupabase().rpc('workspace_get', { workspace_id: id }); if (error) throw error;
  const workspace = data as Data;
  // Limited accounts get only their own membership from workspace_get. Managers
  // already receive every authorized count; attendants need a read-only RPC.
  if (workspace.people.length === 1 && workspace.people[0].role === 'attendant' && workspace.units.some(u => isSupplyUnit(workspace,u.id))) {
    const extra = await getSupabase().rpc('workspace_supplier_counts', { workspace_id: id });
    if (extra.error) {
      if (['PGRST202','42883','42501'].includes(extra.error.code)) workspace.supplierCountsPending = true;
      else throw extra.error;
    } else {
      const counts = new Map(workspace.counts.map(c => [c.id,c]));
      for (const count of (extra.data?.counts || []) as Data['counts']) counts.set(count.id,count);
      workspace.counts = [...counts.values()].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    }
  }
  return workspace;
}
export async function remoteApply(id: string, operation: Operation): Promise<Data> {
  const { error } = await getSupabase().rpc('workspace_apply', { workspace_id: id, operation }); if (error) throw error; return remoteLoad(id);
}
export async function remoteCreate(name: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('workspace_create', { company_name: name }); if (error) throw error; return data;
}
