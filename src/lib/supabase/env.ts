export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Falso mientras no se haya completado .env.local. */
export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseKey);
