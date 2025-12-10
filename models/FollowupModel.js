const mongoose = require("mongoose");

const FollowupSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Types.ObjectId,
      unique: true,
      required: true,
      ref: "Student",
    },
    assignee: { type: mongoose.Types.ObjectId, default: null, ref: "Employee" },
    stage: { type: mongoose.Types.ObjectId, default: null },
    status: {
      type: String,
      enum: ["Lead", "Hot", "Warm"],
      default: "Lead",
    },
    communication: [{ type: mongoose.Types.ObjectId }],
    attachments: [
      {
        name: { type: String },
        key: { type: String },
        location: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    comments: [
      {
        commentor: { type: mongoose.Types.ObjectId, ref: "Employee" },
        commentorName: { type: String },
        commentText: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    notes: [
      {
        type: {
          author: { type: mongoose.Types.ObjectId, ref: "Employee" },
          content: { type: String },
        },
      },
    ],
  },
  { timestamps: true }
);

const Followup = mongoose.model("Followup", FollowupSchema);

module.exports = Followup;
