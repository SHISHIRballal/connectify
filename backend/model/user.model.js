import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    fullname: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minLength: 6,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    bio: {
      type: String,
      maxLength: 160,
      default: "",
    },
    profileimg: {
      type: String,
      default: "",
    },
    coverimg: {
      type: String,
      default: "",
    },
    link: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["USER", "MODERATOR", "ADMIN", "user", "moderator", "admin"],
      default: "USER",
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspensionReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Indexes for optimal user queries and aggregation pipelines
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1 });
userSchema.index({ isSuspended: 1 });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });

// Normalize role to uppercase before saving
userSchema.pre("save", function (next) {
  if (this.role) {
    this.role = this.role.toUpperCase();
  }
  next();
});

export default mongoose.model("User", userSchema);
