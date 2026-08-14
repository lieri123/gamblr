"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    const [loading, setLoading] = useState<boolean>(true);

    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    useEffect(() => {
        let active = true;

        supabase.auth
            .getSession()
            .then(({ data: { session } }) => {
                if (!active) return;
                setUser(session?.user ?? null);
            })
            .catch((error) => {
                console.error("Failed to read session:", error);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    async function signOut() {
        try {
            await supabase.auth.signOut();
            router.replace("/auth");
            router.refresh();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }

    const value = useMemo(
        () => ({ user, loading, signOut }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user, loading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}
