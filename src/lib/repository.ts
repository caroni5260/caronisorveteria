import { getSupabase } from './supabase/client';
import { Data, Operation } from './domain';
export async function remoteList(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await getSupabase().rpc('workspace_list'); if (error) throw error; return data || [];
}
export async function remoteLoad(id: string): Promise<Data> {
  const { data, error } = await getSupabase().rpc('workspace_get', { workspace_id: id }); if (error) throw error; return data;
}
export async function remoteApply(id: string, operation: Operation): Promise<Data> {
  const { error } = await getSupabase().rpc('workspace_apply', { workspace_id: id, operation }); if (error) throw error; return remoteLoad(id);
}
export async function remoteCreate(name: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('workspace_create', { company_name: name }); if (error) throw error; return data;
}
