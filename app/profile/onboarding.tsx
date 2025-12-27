"use client";

import { getCurrentUserProfile } from "@/lib/actions/profile";
import { useEffect, useState } from "react";
import Link from "next/link";


export interface UserProfile{
    id: string;
    full_name: string;
    username: string;
    email: string;
    gender: "male" | "female" | "other";
    birthdate: string;
    bio: string;
    avatar_url: string;
    last_active: string;
    is_online: boolean;
    created_at: string;
    updated_at: string;
}
export default function onbaordingPage(){



}