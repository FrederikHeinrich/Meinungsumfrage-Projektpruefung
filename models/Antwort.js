const mongoose = require("mongoose");
const { text } = require("express");

const AntwortsSchema = new mongoose.Schema({
  UmfragenId: {
    type: text,
    required: true,
  },
    Felder: [],
    Kommentar: {
        type: text,
        required: false,
  }
});

/**
 *
 * UmfrageId
 * Felder:
 *  name
 *  typ <int> = 0(Stimme voll zu) 1(Stimme nicht zu) 2(Weiß ich nicht)
 *
 *
 */

module.exports = mongoose.model("Antwort", AntwortsSchema);
