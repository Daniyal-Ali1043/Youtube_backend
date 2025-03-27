// models/Search.js
const mongoose = require("mongoose");

const searchSchema = new mongoose.Schema({
  query: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: "search" }); // Explicitly set collection name

module.exports = mongoose.model("Search", searchSchema);
