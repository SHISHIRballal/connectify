import React, { useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { postApi } from "../../api/postApi";
import { UserAvatar } from "../common/UserAvatar";
import { Image, X, Send } from "lucide-react";

export const CreatePost = ({ onPostCreated }) => {
  const { authUser } = useAuth();
  const [text, setText] = useState("");
  const [img, setImg] = useState("");
  const [imgPreview, setImgPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size cannot exceed 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImg(reader.result);
        setImgPreview(reader.result);
        setError("");
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImg("");
    setImgPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !img) return;

    setLoading(true);
    setError("");

    try {
      const data = await postApi.createPost({ text: text.trim(), img });
      if (!data || !data.success) {
        throw new Error(data?.message || "Failed to create post");
      }

      setText("");
      removeImage();
      if (onPostCreated) {
        onPostCreated(data.data);
      }
    } catch (err) {
      setError(err.message || "Error creating post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post-card">
      <div className="create-post-top">
        <UserAvatar user={authUser} size="md" />

        <div className="create-post-input-wrapper">
          <textarea
            placeholder="What's happening?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={3}
            className="post-textarea"
          />

          {imgPreview && (
            <div className="post-img-preview-container">
              <img src={imgPreview} alt="Post preview" className="post-img-preview" />
              <button type="button" onClick={removeImage} className="remove-img-btn" title="Remove image">
                <X size={16} />
              </button>
            </div>
          )}

          {error && <div className="post-error-message">{error}</div>}

          <div className="create-post-actions">
            <div className="action-icons">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="icon-action-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Attach Image"
              >
                <Image size={20} />
              </button>
              <span className="char-counter">{1000 - text.length}</span>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={(!text.trim() && !img) || loading}
              className="post-submit-btn"
            >
              {loading ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <span>Post</span>
                  <Send size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
