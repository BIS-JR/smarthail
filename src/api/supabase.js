import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase. As variáveis são públicas por natureza (a chave "anon"
 * só permite o que as políticas de RLS liberam) e ficam em `.env.production`.
 * Sem elas, o app roda em modo local (dados no navegador).
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey
  ? createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // link de redefinição de senha e retorno do Google
    },
  })
  : null;

export const isCloud = Boolean(supabase);
