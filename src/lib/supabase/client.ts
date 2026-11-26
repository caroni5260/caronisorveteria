import { createBrowserClient } from '@supabase/ssr';
export const isConnected = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export function getSupabase() {
  if (!isConnected) throw new Error('Configure as variáveis do Supabase antes de entrar.');
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
