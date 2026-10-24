/* Configuração pública do Supabase para o RunWorld.
   A chave publishable/anon pode ser usada no frontend; nunca coloque service_role aqui. */
(() => {
  const SUPABASE_URL = "https://tysxervuxkedluqkhxsw.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_0bfEPwf2uBwNhiu3Y4DDYA_UlFfWuU_";
  if (window.supabase && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    window.supabaseClient = null;
    console.warn("RunWorld: a biblioteca Supabase não carregou.");
  }
})();
