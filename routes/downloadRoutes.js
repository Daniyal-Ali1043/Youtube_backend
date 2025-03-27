const express = require("express");
const { spawn } = require("child_process");
const Download = require("../models/Download"); // Ensure correct model path
const Search = require("../models/Search"); // Ensure correct model path

const router = express.Router();

// ✅ Route: Download Video/Audio and Save to Database
router.get("/download", async (req, res) => {
  try {
    const { videoId, format = "mp4" } = req.query;
    if (!videoId) return res.status(400).json({ error: "Video ID is required" });

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    res.setHeader("Content-Disposition", `attachment; filename="video.${format}"`);
    res.setHeader("Content-Type", format === "mp3" ? "audio/mpeg" : "video/mp4");
    res.flushHeaders(); // Ensure headers are sent

    const ytOptions = format === "mp3"
      ? ["--cookies", cookiesPath, "-f", "bestaudio", "--extract-audio", "--audio-format", "mp3", "-o", "-", videoUrl]
      : ["--cookies", cookiesPath, "-f", "bestvideo+bestaudio", "-o", "-", videoUrl];

    const ytProcess = spawn("yt-dlp", ytOptions);

    ytProcess.stdout.pipe(res); // Stream directly to response

    ytProcess.stderr.on("data", (data) => {
      console.warn("⚠️ yt-dlp Warning:", data.toString());
    });

    ytProcess.on("close", async (code) => {
      if (code === 0) {
        try {
          const newDownload = new Download({
            title: `Downloaded video (${videoId})`, 
            videoId,
            format,
            downloadedAt: new Date(),
          });
          await newDownload.save();
          console.log("✅ Download saved to database:", newDownload);
        } catch (dbError) {
          console.error("❌ Database Save Error:", dbError);
        }
      } else {
        console.error(`❌ yt-dlp process exited with code ${code}`);
        res.status(500).json({ error: "Failed to download video/audio" });
      }
    });

  } catch (error) {
    console.error("❌ Download Error:", error);
    res.status(500).json({ error: "Internal server error during download" });
  }
});

// ✅ Route: Total Download Count
router.get("/download/count", async (req, res) => {
  try {
    const totalDownloads = await Download.countDocuments();
    res.json({ totalDownloads });
  } catch (error) {
    console.error("❌ Error fetching download count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Route: Get All Download Records
router.get("/download/all", async (req, res) => {
  try {
    const downloads = await Download.find({});
    res.status(200).json(downloads);
  } catch (error) {
    console.error("❌ Error fetching download history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Route: Get Download Count by Format (MP3 vs MP4)
router.get("/download/count/formats", async (req, res) => {
  try {
    const mp3Count = await Download.countDocuments({ format: "mp3" });
    const mp4Count = await Download.countDocuments({ format: "mp4" });

    res.status(200).json({ mp3: mp3Count, mp4: mp4Count });
  } catch (error) {
    console.error("❌ Error fetching format counts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Route: Get Download Count by Quality
router.get("/download/count/quality", async (req, res) => {
  try {
    const qualityCount = await Download.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$quality", "Unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const qualityDistribution = qualityCount.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.status(200).json(qualityDistribution);
  } catch (error) {
    console.error("❌ Error fetching quality distribution:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = router;
