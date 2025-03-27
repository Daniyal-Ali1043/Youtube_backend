const mongoose = require("mongoose");

const downloadSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoId: { type: String, required: true },
  format: { type: String, required: true, default: "mp4" },
  quality: { type: String, required: true, default: "highest" },
  downloadedAt: { type: Date, default: Date.now },
});

const Download = mongoose.model("Download", downloadSchema, "download");

module.exports = Download;
