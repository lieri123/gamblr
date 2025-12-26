"use client";

import {useEffect, useState} from "react";
import {getCurrentUserProfile} from "@/lib/actions/profile";

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
                const profileData = await getCurrentUserProfile();
                console.log(profileData);
                if (profileData){
                    setProfile(profileData);
                }
                else{
                    setError("Failed to load profile");
                }
            }
            catch(err){
                console.error("Error loading profile", err);
                setError("Failed to load profile");
            }finally{
                setLoading(false);
            }
        }

        loadProfile();
    }, []);

    function calculateAge(birthdate: string){
        const today = new Date();
        const birthDate = new Date(birthdate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 && today.getDate() > birthDate.getDate()){
            age -- ;
        }

        return age;
    }
    if (error || !profile){
        return (
            <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">❌</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Profile not found
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {error || "Unable to load your profile. Please try again."}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 px-6 rounded-full hover:from-pink-600 hover:to-red-600 transition-all duration-200"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

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
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full overflow-hidden">
                                        <img
                                            src={profile.avatar_url || "/default-avatar.png"}
                                            alt={profile.full_name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                        {profile.full_name}, {calculateAge(profile.birthdate)}
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                                        @{profile.username}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-500">
                                        Member since{" "}
                                        {new Date(profile.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                        About Me
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {profile.bio || "No bio added yet."}
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                        Basic Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Gender
                                            </label>
                                            <p className="text-gray-900 dark:text-white capitalize">
                                                {profile.gender}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Birthday
                                            </label>
                                            <p className="text-gray-900 dark:text-white">
                                                {new Date(profile.birthdate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}