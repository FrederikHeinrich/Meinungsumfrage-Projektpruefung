const mongoose = require("mongoose");

const UmfragenSchema = new mongoose.Schema({
  Name: {
    type: String,
    required: true,
  },
  Beschreibung: {
    type: String,
    required: false,
  },
  Felder: [],
});

/**
 *
 * Name
 * Beschreibung
 * Felder:
 *  name
 *  typ <int> = 0(Stimme voll zu) 1(Stimme nicht zu) 2(Weiß ich nicht) || String
 *  requierd
 *
 *
 */

module.exports = mongoose.model("Umfrage", UmfragenSchema);
