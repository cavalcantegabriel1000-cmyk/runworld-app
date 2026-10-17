/* =====================================================
   RUNWORLD — CONFIGURAÇÃO DO SUPABASE
===================================================== */

window.RUNWORLD_CONFIG = {
    SUPABASE_URL:
        "https://tysxervuxkedluqkhxsw.supabase.co",

    SUPABASE_ANON_KEY:
        "sb_publishable_0bfEPwf2uBwNhiu3Y4DDYA_UlFfWuU_"
};

/* =====================================================
   INICIALIZAÇÃO
===================================================== */

(function () {
    // Reutiliza o cliente se já estiver inicializado
    if (window.supabaseClient) {
        return;
    }

    function iniciarSupabase() {

        // Verifica se a biblioteca carregou
        if (
            !window.supabase ||
            typeof window.supabase.createClient !== "function"
        ) {
            console.error(
                "RunWorld: biblioteca do Supabase não foi carregada."
            );

            return null;
        }

        const config = window.RUNWORLD_CONFIG;

        if (
            !config ||
            !config.SUPABASE_URL ||
            !config.SUPABASE_ANON_KEY
        ) {
            console.error(
                "RunWorld: URL ou chave pública não configurada."
            );

            return null;
        }

        
try {
    window.supabaseClient =
        window.supabase.createClient(
            config.SUPABASE_URL.trim(),
            config.SUPABASE_ANON_KEY.trim(),
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    flowType: "pkce"
                }
            }
        );
   

            console.log(
                "RunWorld: cliente Supabase inicializado."
            );

            return window.supabaseClient;

        } catch (erro) {
            console.error(
                "RunWorld: erro ao iniciar o Supabase:",
                erro
            );

            window.supabaseClient = null;

            return null;
        }
    }

    // Disponibiliza a função para outras páginas e scripts
    window.iniciarSupabase = iniciarSupabase;

    window.obterSupabase = function () {
        return window.supabaseClient || iniciarSupabase();
    };

    // Inicializa automaticamente
    iniciarSupabase();

})();
