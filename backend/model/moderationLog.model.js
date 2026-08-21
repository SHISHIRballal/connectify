import mongoose from "mongoose";

const moderationLogSchema = new mongoose.Schema(
  {
    moderator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "SUSPEND_USER",
        "ACTIVATE_USER",
        "DELETE_POST",
        "CHANGE_ROLE",
        "RESOLVE_REPORT",
        "DISMISS_REPORT",
      ],
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ["USER", "POST", "REPORT"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

moderationLogSchema.index({ createdAt: -1 });
moderationLogSchema.index({ action: 1, createdAt: -1 });
moderationLogSchema.index({ moderator: 1, createdAt: -1 });

export default mongoose.model("ModerationLog", moderationLogSchema);
