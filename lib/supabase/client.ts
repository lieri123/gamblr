import { createBrowserClient } from "@supabase/ssr";

// Next.js only inlines NEXT_PUBLIC_* variables into browser bundles when they are
// written out literally. A dynamic lookup like process.env[name] (requireEnv) is
// always undefined in the browser, so read them directly here.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
    if (!url || !anonKey) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.example."
        );
    }

    return createBrowserClient(url, anonKey);
}
