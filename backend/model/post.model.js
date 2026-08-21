import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      trim: true,
      maxLength: 1000,
      default: "",
    },
    img: {
      type: String,
      default: "",
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [commentSchema],

    // AI-Powered Moderation Fields
    moderationStatus: {
      type: String,
      enum: ["SAFE", "FLAGGED", "BLOCKED"],
      default: "SAFE",
      index: true,
    },
    moderationScore: {
      type: Number,
      default: 0.0,
      min: 0.0,
      max: 1.0,
    },
    moderationCategories: {
      type: [String],
      default: [],
    },
    moderationReason: {
      type: String,
      default: "",
    },
    moderatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound indexes for optimal cursor pagination and sorting
postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ moderationStatus: 1, createdAt: -1 });
postSchema.index({ user: 1, createdAt: -1, _id: -1 });
postSchema.index({ likes: 1, createdAt: -1 });

export default mongoose.model("Post", postSchema);
