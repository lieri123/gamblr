"use client";

import {useEffect, useState} from "react";

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
export default function ProfilePage(){

    const[profile, setProfile] = useState<UserProfile | null>(null);
    const[loading, setLoading] = useState(true);
    const[error, setError] = useState<string | null>(null);

    useEffect(()=>{
        async function loadProfile(){
            try{

            }
            catch{

            }
        }
    })

    return(
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        My Profile
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your profile and preferences
                    </p>
                </header>

                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">

                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}