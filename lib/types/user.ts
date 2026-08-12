export interface UserProfile {
    id: string;
    full_name: string;
    username: string;
    email: string;
    gender: "male" | "female" | "other";
    birthdate: string;
    bio: string;
    avatar_url: string;
    stripe_id: string | null;
    preferences: string[] | null;
    last_active: string;
    is_online: boolean;
    created_at: string;
    updated_at: string;
}
