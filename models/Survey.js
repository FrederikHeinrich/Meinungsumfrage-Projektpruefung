const mongoose = require("mongoose");

var SurveyFields = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  orderId: {
    type: Number,
    required: true,
    default: 0,
  },
  happy: {
    type: Number,
    required: true,
    default: 0,
  },
  okay: {
    type: Number,
    required: true,
    default: 0,
  },
  sad: {
    type: Number,
    required: true,
    default: 0,
  },
});

const SurveySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  fields: {
    type: [SurveyFields],
  },
  comments: {
    type: [String],
  },
  invitedEmails: {
    type: [String],
  },
  entries: {
    type: Number,
    required: true,
    default: 0,
  },
  createDate: {
    type: Date,
    require: true,
    default: new Date(),
  },
});

module.exports = mongoose.model("Survey", SurveySchema);
