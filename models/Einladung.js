const mongoose = require("mongoose");
const shortId = require("shortid");

const EinladungSchema = new mongoose.Schema({
  Email: {
    type: String,
    required: true,
  },
  Token: {
    type: String,
    required: true,
    default: shortId.generate,
  },
  Ablaufdatum: {
    type: Date,
    required: true,
    default: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
  },
});

/**
 *
 * Email
 * Token
 *
 */

module.exports = mongoose.model("Einladung", EinladungSchema);
