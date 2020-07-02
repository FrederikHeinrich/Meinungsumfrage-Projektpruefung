const mongoose = require("mongoose");

const InviteSchema = new mongoose.Schema({
  surveyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "survey",
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
    default: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
  },
  valid: {
    type: Boolean,
    required: true,
    default: true,
  },
  createDate: {
    type: Date,
    require: true,
    default: new Date(),
  },
});

/**
 *
 * Email
 * Token
 *
 */

module.exports = mongoose.model("Invite", InviteSchema);
