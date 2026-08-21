import React, { useState, useRef } from "react";
import { userApi } from "../../api/userApi";
import { Modal } from "../common/Modal";
import { UserAvatar } from "../common/UserAvatar";
import { Camera, Lock, User, Globe, FileText, AlertCircle } from "lucide-react";

export const EditProfileModal = ({ isOpen, onClose, user, onProfileUpdated }) => {
  const [formData, setFormData] = useState({
    fullname: user.fullname || "",
    username: user.username || "",
    bio: user.bio || "",
    link: user.link || "",
    currentPassword: "",
    newPassword: "",
  });
  const [profileimg, setProfileimg] = useState("");
  const [profileimgPreview, setProfileimgPreview] = useState(user.profileimg || "");
  const [coverimg, setCoverimg] = useState("");
  const [coverimgPreview, setCoverimgPreview] = useState(user.coverimg || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const profileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be smaller than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (type === "profile") {
          setProfileimg(reader.result);
          setProfileimgPreview(reader.result);
        } else {
          setCoverimg(reader.result);
          setCoverimgPreview(reader.result);
        }
        setError("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        ...(profileimg && { profileimg }),
        ...(coverimg && { coverimg }),
      };

      const data = await userApi.updateProfile(payload);
      if (!data || !data.success) {
        throw new Error(data?.message || "Failed to update profile");
      }

      if (onProfileUpdated) {
        onProfileUpdated(data.data);
      }
      onClose();
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" maxWidth="580px">
      {error && (
        <div className="auth-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="edit-profile-form">
        {/* Cover Image Upload */}
        <div className="edit-cover-wrapper">
          <div
            className="edit-cover-preview"
            style={{
              backgroundImage: coverimgPreview ? `url(${coverimgPreview})` : "none",
              backgroundColor: "var(--bg-card)",
            }}
          >
            <input
              type="file"
              accept="image/*"
              ref={coverInputRef}
              onChange={(e) => handleImageChange(e, "cover")}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="change-image-badge"
              onClick={() => coverInputRef.current?.click()}
              title="Change cover photo"
            >
              <Camera size={18} />
              <span>Cover Photo</span>
            </button>
          </div>

          {/* Profile Image Upload */}
          <div className="edit-avatar-container">
            <div className="edit-avatar-preview">
              <UserAvatar user={{ ...user, profileimg: profileimgPreview }} size="xl" />
              <input
                type="file"
                accept="image/*"
                ref={profileInputRef}
                onChange={(e) => handleImageChange(e, "profile")}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="change-avatar-btn"
                onClick={() => profileInputRef.current?.click()}
                title="Change avatar"
              >
                <Camera size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Input Fields */}
        <div className="input-group">
          <label>Full Name</label>
          <div className="input-wrapper">
            <User size={18} className="input-icon" />
            <input
              type="text"
              name="fullname"
              value={formData.fullname}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label>Username</label>
          <div className="input-wrapper">
            <User size={18} className="input-icon" />
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Username"
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label>Bio</label>
          <div className="input-wrapper">
            <FileText size={18} className="input-icon" />
            <input
              type="text"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell the world about yourself..."
              maxLength={160}
            />
          </div>
        </div>

        <div className="input-group">
          <label>Website Link</label>
          <div className="input-wrapper">
            <Globe size={18} className="input-icon" />
            <input
              type="url"
              name="link"
              value={formData.link}
              onChange={handleChange}
              placeholder="https://yourwebsite.com"
            />
          </div>
        </div>

        {/* Password Update Accordion */}
        <div className="password-change-section">
          <h4 className="password-section-title">Change Password (Optional)</h4>
          <div className="password-inputs-row">
            <div className="input-group">
              <label>Current Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="input-group">
              <label>New Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions-row">
          <button type="button" onClick={onClose} className="modal-cancel-btn" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="modal-save-btn" disabled={loading}>
            {loading ? <span className="spinner"></span> : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
