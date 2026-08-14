"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getCurrentUserProfile } from "@/lib/actions/profile";
import type { UserProfile } from "@/lib/types/user";

function calculateAge(birthdate: string): number | null {
    const birthDate = new Date(birthdate);

    if (Number.isNaN(birthDate.getTime())) {
        return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
        age -= 1;
    }

    return age;
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        async function loadProfile() {
            try {
                const profileData = await getCurrentUserProfile();

                if (!active) return;

                if (profileData) {
                    setProfile(profileData);
                } else {
                    setError("Failed to load profile");
                }
            } catch (err) {
                console.error("Error loading profile", err);
                if (active) setError("Failed to load profile");
            } finally {
                if (active) setLoading(false);
            }
        }

        loadProfile();

        return () => {
            active = false;
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-full flex flex-col bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500" />
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-full flex flex-col bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
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
            </div>
        );
    }

    const age = calculateAge(profile.birthdate);

    return (
        <div className="min-h-full flex flex-col bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
            <Navbar />

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
                                <div className="flex items-center space-x-6 mb-8">
                                    <div className="w-24 h-24 rounded-full overflow-hidden shrink-0">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={profile.avatar_url || "/default-avatar.png"}
                                            alt={profile.full_name || "Profile photo"}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                            {profile.full_name}
                                            {age !== null && `, ${age}`}
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                                            @{profile.username}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-500">
                                            Member since{" "}
                                            {new Date(
                                                profile.created_at
                                            ).toLocaleDateString()}
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
                                                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Gender
                                                </span>
                                                <p className="text-gray-900 dark:text-white capitalize">
                                                    {profile.gender}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Birthday
                                                </span>
                                                <p className="text-gray-900 dark:text-white">
                                                    {profile.birthdate
                                                        ? new Date(
                                                              profile.birthdate
                                                          ).toLocaleDateString()
                                                        : "—"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Quick Actions
                                </h3>
                                <Link
                                    href="/profile/edit"
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                                >
                                    <span className="text-gray-900 dark:text-white">
                                        Edit Profile
                                    </span>
                                    <svg
                                        className="w-5 h-5 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </Link>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Account
                                </h3>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                                    <span className="text-gray-900 dark:text-white">
                                        Username
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                        @{profile.username}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
