"use client";

import {
    getCurrentUserProfile,
    updateUserProfile,
} from "@/lib/actions/profile";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PhotoUpload  from "@/components/PhotoUpload";
import {PaymentElement, useElements, useStripe} from "@stripe/react-stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";



export default function EditProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const [clientSecret, setClientSecret] = useState("");
    const stripe = useStripe();
    const elements = useElements();

    const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);


    const [formData, setFormData] = useState({
        full_name: "",
        username: "",
        bio: "",
        gender: "male" as "male" | "female" | "other",
        birthdate: "",
        avatar_url: "",
    });

    useEffect(() => {
        async function loadProfile() {
            try {
                const profileData = await getCurrentUserProfile();
                if (profileData) {
                    setFormData({
                        full_name: profileData.full_name || "",
                        username: profileData.username || "",
                        bio: profileData.bio || "",
                        gender: profileData.gender || "male",
                        birthdate: profileData.birthdate || "",
                        avatar_url: profileData.avatar_url || "",
                    });

                    const stripeId = profileData.stripe_id

                    if (!stripeId) {

                        try {
                            const stripesetup = await fetch("/api/create-customer-intent", {
                                method: "POST",
                                headers: {"Content-Type": "application/json"},
                                body: JSON.stringify({email: profileData.email}),

                            })

                            const data = await stripesetup.json();

                            setClientSecret(data.clientSecret);
                        } catch (err) {
                            console.error("failed to create stripe customer");

                        }
                    }
                    const setupRes = await fetch("/api/create-setup-intent", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ customerId: stripeId }),
                    });
                    const setupData = await setupRes.json();
                    setClientSecret(setupData.clientSecret);
                }

            }catch {
                setError("Failed to load profile");
            }
            finally {
                setLoading(false);
            }
        }

        loadProfile();

    }, []);

    async function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const result = await updateUserProfile(formData);
            if(!result.success){

                setError(result.error || "Failed to update profile.");
                setSaving(false);
                return;

            }

            if (stripe && elements && clientSecret) {
                const {error} = await stripe.confirmSetup({
                    elements,
                    redirect: "if_required",
                });

                if (error) {
                    console.error("Error confirming card:", error);
                    setError(error.message || "Failed to save card.");
                    setSaving(false);
                    return;
                }
            }


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
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    }

    // --- Inline Styles ---

    const labelStyle: React.CSSProperties = {
        fontWeight: 500,
        marginBottom: "0.25rem",
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
        alignItems:"center"
    };

    return (

        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Edit Profile
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Update your profile information
                    </p>
                </header>

                <div className="max-w-2xl mx-auto">
                    <form
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8"
                        onSubmit={handleFormSubmit}
                    >
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                Profile Picture
                            </label>
                            <div className="flex items-center space-x-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full overflow-hidden">
                                        <img
                                            src={formData.avatar_url || "/default-avatar.png"}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <PhotoUpload
                                        onPhotoUploaded={(url) => {
                                            setFormData((prev) => ({
                                                ...prev,
                                                avatar_url: url,
                                            }));
                                        }}
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
                                <label style={labelStyle}>Gender</label>
                                <div style={radioContainerStyle}>
                                    {["male", "female", "other"].map((g) => (
                                        <label key={g} style={radioLabelStyle(formData.gender === g)}>
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
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                            {<PaymentElement /> }
                        </Elements>
                    </form>
                </div>
            </div>
        </div>
    );
}
