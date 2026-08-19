// OSA - Cliente Supabase
let supabaseClient = null;

function initSupabase() {
    if (!window.supabase) {
        console.error('Supabase library not loaded');
        return null;
    }
    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(
            OSA_CONFIG.SUPABASE_URL,
            OSA_CONFIG.SUPABASE_ANON_KEY,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            }
        );
    }
    return supabaseClient;
}

function getSupabase() {
    if (!supabaseClient) return initSupabase();
    return supabaseClient;
}

window.initSupabase = initSupabase;
window.getSupabase = getSupabase;
