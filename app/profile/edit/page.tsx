"use client";

import {
    getCurrentUserProfile,
    updateUserProfile,
} from "@/lib/actions/profile";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditProfilePage(){
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
            } catch (err) {
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
        } catch (err) {
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

    return (
        <div className="Edit-page">
            <form onSubmit={handleFormSubmit}>
                <section>
                    <label htmlFor="full_name">Full Name</label>
                    <input
                        id="full_name"
                        type='text'
                        name="full_name"
                        placeholder="full_name"
                        required={true}
                        value={formData.full_name}
                        onChange={handleInputChange}
                    />
                    <label htmlFor="user_name">UserName</label>
                    <input
                        id="user_name"
                        type='text'
                        name="user_name"
                        placeholder="full_name"
                        required={true}
                        value={formData.username}
                        onChange={handleInputChange}
                    />
                    <label htmlFor="birthdate">Birthday</label>
                    <input
                        id="birthdate"
                        type="date"
                        name="birthdate"
                        placeholder="YYYY/MM/DD"
                        required={true}
                        value={formData.birthdate}
                        onChange={handleInputChange}
                    />

                    <label>Gender</label>
                    <div className="multiple-input-container">
                        <label htmlFor="man-gender-identity">Male</label>
                        <input
                            id="man-gender-identity"
                            type="radio"
                            name="gender"
                            value="Male"
                            onChange={handleInputChange}
                            checked={formData.gender === "male"}
                        />
                        <label htmlFor="woman-gender-identity">Female</label>
                        <input
                            id="woman-gender-identity"
                            type="radio"
                            name="gender"
                            value="Female"
                            onChange={handleInputChange}
                            checked={formData.gender === "female"}
                        />

                        <label htmlFor="more-gender-identity">Other</label>
                        <input
                            id="more-gender-identity"
                            type="radio"
                            name="gender"
                            value="Other"
                            onChange={handleInputChange}
                            checked={formData.gender === "other"}
                        />
                    </div>

                    <label htmlFor="bio">About me</label>
                    <input
                        id="bio"
                        type="text"
                        name="bio"
                        required={true}
                        placeholder="I like hockey, soccer ..."
                        value={formData.bio}
                        onChange={handleInputChange}
                    />

                    <button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                    </button>

                </section>
                <section>

                    <label htmlFor="avatar_url">Profile Photo</label>
                    <input
                        type="url"
                        name="avatar_url"
                        id="avatar_url"
                        onChange={handleInputChange}
                        required={true}
                    />
                    <div className="photo-container">
                        {formData.avatar_url && <img src={formData.avatar_url} alt="profile pic preview"/>}
                    </div>
                </section>
            </form>
        </div>
    )
}