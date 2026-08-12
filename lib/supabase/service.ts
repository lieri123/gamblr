import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (!cached) {
        cached = createClient(
            requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
            requireEnv("SUPABASE_SECRET_KEY"),
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            }
        );
    }

    return cached;
}
