"use server";

import { createClient, requireUser } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types/user";

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Error getting user profile:", error);
        return null;
    }

    return profile as UserProfile | null;
}

export async function updateUserProfile(profileData: Partial<UserProfile>) {
    const { supabase, user } = await requireUser();

    const { error } = await supabase
        .from("users")
        .update({
            full_name: profileData.full_name,
            username: profileData.username,
            bio: profileData.bio,
            gender: profileData.gender,
            birthdate: profileData.birthdate,
            avatar_url: profileData.avatar_url,
            updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

    if (error) {
        console.error("Supabase error (profile update):", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function uploadProfilePhoto(file: File) {
    const { supabase, user } = await requireUser();

    const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        return { success: false, error: error.message };
    }

    const {
        data: { publicUrl },
    } = supabase.storage.from("profile-photos").getPublicUrl(fileName);

    return { success: true, url: publicUrl };
}
