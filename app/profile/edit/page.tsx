"use client";

import {
    getCurrentUserProfile,
    updateUserProfile,
} from "@/lib/actions/profile";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
                }
            } catch {
                setError("Failed to load profile");
            } finally {
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
            if (result.success) {
                router.push("/profile");
            } else {
                setError(result.error || "Failed to update profile.");
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
    const containerStyle: React.CSSProperties = {
        maxWidth: "800px",
        margin: "3rem auto",
        padding: "2rem",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        fontFamily: "Arial, sans-serif",
    };

    const headingStyle: React.CSSProperties = {
        textAlign: "center",
        fontSize: "2rem",
        fontStyle: "italic",
        marginBottom: "2rem",
    };

    const formStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "row",
        gap: "2rem",
        flexWrap: "wrap",
    };

    const sectionStyle: React.CSSProperties = {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    };

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

    const buttonStyle: React.CSSProperties = {
        marginTop: "1rem",
        padding: "0.75rem 2rem",
        background: "linear-gradient(45deg, #FE3072, #FF593F)",
        color: "white",
        border: "none",
        borderRadius: "30px",
        textTransform: "uppercase",
        fontWeight: 600,
        cursor: "pointer",
    };

    const photoContainerStyle: React.CSSProperties = {
        marginTop: "1rem",
        width: "100%",
        height: "250px",       // fixed height for consistent preview
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #ccc",
    };

    const photoStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        objectFit: "cover",    // ensures image covers the container without distortion
        display: "block",
    };

    const radioContainerStyle: React.CSSProperties = {
        display: "flex",
        gap: "1rem",
        flexWrap: "nowrap",
        alignItems:"center"
    };

    return (
        <div style={containerStyle}>
            <h2 style={headingStyle}>Edit Profile</h2>

            {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

            <form onSubmit={handleFormSubmit} style={formStyle}>
                {/* Left Section */}
                <section style={sectionStyle}>
                    <div>
                        <label htmlFor="full_name" style={labelStyle}>
                            Full Name
                        </label>
                        <input
                            id="full_name"
                            type="text"
                            name="full_name"
                            placeholder="Full Name"
                            required
                            value={formData.full_name}
                            onChange={handleInputChange}
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label htmlFor="username" style={labelStyle}>
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            name="username"
                            placeholder="Username"
                            required
                            value={formData.username}
                            onChange={handleInputChange}
                            style={inputStyle}
                        />
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
                        <label htmlFor="bio" style={labelStyle}>
                            About Me
                        </label>
                        <input
                            id="bio"
                            type="text"
                            name="bio"
                            placeholder="I like hockey, soccer ..."
                            required
                            value={formData.bio}
                            onChange={handleInputChange}
                            style={inputStyle}
                        />
                    </div>

                    <button type="submit" disabled={saving} style={buttonStyle}>
                        {saving ? "Saving..." : "Save"}
                    </button>
                </section>

                {/* Right Section - Profile Photo */}
                <section style={sectionStyle}>
                    <label htmlFor="avatar_url" style={labelStyle}>
                        Profile Photo
                    </label>
                    <input
                        type="url"
                        name="avatar_url"
                        id="avatar_url"
                        required
                        onChange={handleInputChange}
                        style={inputStyle}
                    />
                    {formData.avatar_url && (
                        <div style={photoContainerStyle}>
                            <img
                                src={formData.avatar_url}
                                alt="profile pic preview"
                                style={photoStyle}
                            />
                        </div>
                    )}
                </section>
            </form>
        </div>
    );
}
