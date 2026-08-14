"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    getCurrentUserProfile,
    updateUserProfile,
} from "@/lib/actions/profile";
import { createSetupIntent } from "@/lib/actions/payments";
import PhotoUpload from "@/components/PhotoUpload";
import PaymentMethodForm from "@/components/PaymentMethodForm";
import Navbar from "@/components/Navbar";

export default function EditProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [clientSecret, setClientSecret] = useState("");
    const router = useRouter();

    const [formData, setFormData] = useState({
        full_name: "",
        username: "",
        bio: "",
        gender: "male" as "male" | "female" | "other",
        birthdate: "",
        avatar_url: "",
    });

    useEffect(() => {
        let active = true;

        async function loadProfile() {
            try {
                const profileData = await getCurrentUserProfile();

                if (!active) return;

                if (profileData) {
                    setFormData({
                        full_name: profileData.full_name || "",
                        username: profileData.username || "",
                        bio: profileData.bio || "",
                        gender: profileData.gender || "male",
                        birthdate: profileData.birthdate || "",
                        avatar_url: profileData.avatar_url || "",
                    });
                }
            } catch {
                if (active) setError("Failed to load profile");
            } finally {
                if (active) setLoading(false);
            }
        }

        async function loadPaymentSetup() {
            try {
                const { clientSecret: secret } = await createSetupIntent();
                if (active) setClientSecret(secret);
            } catch (err) {
                console.error("Failed to prepare payment form:", err);
            }
        }

        loadProfile();
        loadPaymentSetup();

        return () => {
            active = false;
        };
    }, []);

    async function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSaved(false);

        try {
            const result = await updateUserProfile(formData);

            if (!result.success) {
                setError(result.error || "Failed to update profile.");
                return;
            }

            setSaved(true);
            router.refresh();
        } catch {
            setError("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    }

    function handleInputChange(
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }

    const labelStyle: React.CSSProperties = {
        fontWeight: 500,
        marginBottom: "0.25rem",
        display: "block",
    };

    const inputStyle: React.CSSProperties = {
        padding: "0.75rem",
        border: "1px solid #ccc",
        borderRadius: "8px",
        fontSize: "1rem",
        width: "100%",
    };

    const radioLabelStyle = (selected: boolean): React.CSSProperties => ({
        padding: "0.5rem 1rem",
        borderRadius: "8px",
        border: selected ? "2px solid #FF4F40" : "1px solid #ccc",
        color: selected ? "#FF4F40" : "#000",
        cursor: "pointer",
    });

    const radioContainerStyle: React.CSSProperties = {
        display: "flex",
        gap: "1rem",
        flexWrap: "nowrap",
        alignItems: "center",
    };

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

    return (
        <div className="min-h-full flex flex-col bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
            <Navbar />

            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Edit Profile
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Update your profile information
                    </p>
                </header>

                <div className="max-w-2xl mx-auto space-y-8">
                    <form
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8"
                        onSubmit={handleFormSubmit}
                    >
                        <div className="mb-8">
                            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                Profile Picture
                            </span>
                            <div className="flex items-center space-x-6">
                                <div className="relative w-24 h-24">
                                    <div className="w-24 h-24 rounded-full overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={formData.avatar_url || "/default-avatar.png"}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <PhotoUpload
                                        onPhotoUploaded={(url) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                avatar_url: url,
                                            }))
                                        }
                                    />
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        Upload a new profile picture
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                        JPG, PNG or GIF. Max 5MB.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label
                                    htmlFor="full_name"
                                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    id="full_name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter your full name"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="username"
                                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Username *
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Choose a username"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <span style={labelStyle}>Gender</span>
                                <div style={radioContainerStyle}>
                                    {(["male", "female", "other"] as const).map((g) => (
                                        <label
                                            key={g}
                                            style={radioLabelStyle(formData.gender === g)}
                                        >
                                            <input
                                                type="radio"
                                                name="gender"
                                                value={g}
                                                checked={formData.gender === g}
                                                onChange={handleInputChange}
                                                style={{ display: "none" }}
                                            />
                                            {g.charAt(0).toUpperCase() + g.slice(1)}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="birthdate" style={labelStyle}>
                                    Birthday
                                </label>
                                <input
                                    id="birthdate"
                                    type="date"
                                    name="birthdate"
                                    required
                                    value={formData.birthdate}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div className="mb-8">
                            <label
                                htmlFor="bio"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            >
                                About Me *
                            </label>
                            <textarea
                                id="bio"
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                required
                                rows={4}
                                maxLength={500}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                                placeholder="Tell others about yourself..."
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formData.bio.length}/500 characters
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                                {error}
                            </div>
                        )}

                        {saved && (
                            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                                Profile saved.
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>

                    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Payment method
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Save a card so you can place bets.
                        </p>
                        <PaymentMethodForm clientSecret={clientSecret} />
                    </section>
                </div>
            </div>
        </div>
    );
}
