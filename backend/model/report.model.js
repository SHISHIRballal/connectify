import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    reportedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      enum: ["spam", "harassment", "hate_speech", "inappropriate", "violence", "other"],
    },
    details: {
      type: String,
      default: "",
      maxLength: 500,
    },
    status: {
      type: String,
      enum: ["PENDING", "RESOLVED", "DISMISSED"],
      default: "PENDING",
      index: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: "",
    },
    actionTaken: {
      type: String,
      enum: ["NONE", "POST_DELETED", "USER_SUSPENDED", "DISMISSED"],
      default: "NONE",
    },
  },
  { timestamps: true },
);

reportSchema.index({ createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reason: 1 });

export default mongoose.model("Report", reportSchema);
