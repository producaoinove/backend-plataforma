import { createClient } from "@supabase/supabase-js";

// ---------- NIO_AFILIADOS (indique_e_ganhe) ----------
const nioUrl = process.env.SUPABASE_URL_NIO_AFILIADOS;
const nioServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_NIO_AFILIADOS;

// ---------- PAINEL_URA (sistema_ura) ----------
const uraUrl = process.env.SUPABASE_URL_PAINEL_URA;
const uraServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PAINEL_URA;

if (!nioUrl || !nioServiceKey) {
  console.error("ERRO: Variáveis do Supabase NIO_AFILIADOS não configuradas.");
  process.exit(1);
}

if (!uraUrl || !uraServiceKey) {
  console.error("ERRO: Variáveis do Supabase PAINEL_URA não configuradas.");
  process.exit(1);
}

export const supabaseNioAfiliados = createClient(nioUrl, nioServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabasePainelUra = createClient(uraUrl, uraServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
