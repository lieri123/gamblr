#!/usr/bin/env node
// stdio entrypoint. Usage:
//   GAMBLR_BACKEND=memory npx tsx src/index.ts            # fixture data, fake cards
//   GAMBLR_BACKEND=supabase GAMBLR_USER_ID=<uuid> ...     # real Supabase + Stripe
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGamblrServer } from "./server.js";
import { MemoryStore } from "./store/memory.js";
import { baseWorld, DEMO_USER } from "./store/fixtures.js";
import type { Store } from "./types.js";

async function main() {
    const backend = process.env.GAMBLR_BACKEND ?? "memory";
    let store: Store;
    let userId: string;

    if (backend === "supabase") {
        const { SupabaseStore } = await import("./store/supabase.js");
        store = new SupabaseStore();
        userId = process.env.GAMBLR_USER_ID ?? "";
        if (!userId) throw new Error("GAMBLR_USER_ID is required with GAMBLR_BACKEND=supabase");
    } else {
        store = new MemoryStore(baseWorld());
        userId = process.env.GAMBLR_USER_ID ?? DEMO_USER;
    }

    await createGamblrServer(store, userId).connect(new StdioServerTransport());
    console.error(`gamblr MCP server running on stdio (backend=${backend})`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
