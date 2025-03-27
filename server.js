require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { spawn } = require("child_process");
// const path = require("path");
const mongoose = require("mongoose");
// const fs = require("fs");

const User = require("./models/User");
const Download = require("./models/Download");
const searchRoutes = require("./routes/searchRoutes");
const downloadRoutes = require("./routes/downloadRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/api", searchRoutes);
app.use("/", downloadRoutes);
// ✅ Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    createAdminUser();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ✅ Admin user creation (Avoid hardcoded credentials)
const createAdminUser = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const admin = new User({ email: adminEmail, password: adminPassword });
    await admin.save();
    console.log("✅ Admin user created successfully");
  }
};



// ✅ Extract YouTube video ID from URL
const extractVideoId = (url) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*[?&]v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

// ✅ YouTube preview endpoint
app.get("/preview", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    const response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: { id: videoId, key: YOUTUBE_API_KEY, part: "snippet" },
    });

    if (!response.data.items.length) return res.status(404).json({ error: "Video not found" });

    const video = response.data.items[0].snippet;

    res.json({
      title: video.title,
      thumbnail: video.thumbnails.high.url,
      videoId,
      downloadUrl: `/download?videoId=${videoId}`,
    });
  } catch (error) {
    console.error("❌ Preview Error:", error);
    res.status(500).json({ error: "Error fetching video details" });
  }
});


// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
