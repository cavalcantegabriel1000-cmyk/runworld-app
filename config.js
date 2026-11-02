
(() => {
    "use strict";

    const SUPABASE_URL =
        "https://tysxervuxkedluqkhxsw.supabase.co";

    const SUPABASE_ANON_KEY =
        "sb_publishable_0bfEPwf2uBwNhiu3Y4DDYA_UlFfWuU_";

    if (
        window.supabase &&
        typeof window.supabase.createClient === "function"
    ) {
        window.supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
            {
                auth: {
                    flowType: "pkce",
                    detectSessionInUrl: true,
                    persistSession: true,
                    autoRefreshToken: true
                }
            }
        );
    } else {
        window.supabaseClient = null;
        console.error(
            "RunWorld: a biblioteca Supabase não carregou."
        );
    }
})();
