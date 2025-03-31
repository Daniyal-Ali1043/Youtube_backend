const express = require("express");
const { spawn } = require("child_process");
const Download = require("../models/Download"); // Ensure correct model path
const Search = require("../models/Search"); // Ensure correct model path
const fs = require("fs");
const router = express.Router();

let downloadProgress = {}; // Store progress per request

// ✅ Route to Stream Progress Updates to Frontend
router.get("/progress", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify(downloadProgress)}\n\n`);
  }, 1000);

  req.on("close", () => clearInterval(interval)); // Cleanup on client disconnect
});

router.get("/download", async (req, res) => {
  try {
    const { videoId, format = "mp4" } = req.query;
    if (!videoId) return res.status(400).json({ error: "Video ID is required" });

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const ytOptions = format === "mp3"
      ? ["-f", "bestaudio", "--extract-audio", "--audio-format", "mp3", "-o", "-", videoUrl]
      : ["-f", "bestvideo+bestaudio", "-o", "-", videoUrl];

    console.log("Executing yt-dlp with options:", ytOptions.join(" "));

    const ytProcess = spawn("yt-dlp", ytOptions);

    res.setHeader("Content-Disposition", `attachment; filename="video.${format}"`);
    res.setHeader("Content-Type", format === "mp3" ? "audio/mpeg" : "video/mp4");
    res.flushHeaders();

    let downloadedSize = 0;
    let totalSize = 0;

    ytProcess.stderr.on("data", (data) => {
      const stderrOutput = data.toString();

      const progressMatch = stderrOutput.match(/\[download\]\s+([\d.]+)%/);
      if (progressMatch) {
        const percentage = parseFloat(progressMatch[1]);
        console.log(`⬇️ Download Progress: ${percentage}%`);
      }

      const sizeMatch = stderrOutput.match(/Total file size:\s([\d.]+)MiB/);
      if (sizeMatch) {
        totalSize = parseFloat(sizeMatch[1]) * 1024 * 1024;
      }
    });

    ytProcess.stdout.on("data", (chunk) => {
      downloadedSize += chunk.length;
      if (totalSize > 0) {
        const percentage = ((downloadedSize / totalSize) * 100).toFixed(2);
        console.log(`📤 Streaming Progress: ${percentage}%`);
      }
    });

    ytProcess.stdout.pipe(res);

    ytProcess.on("close", async (code) => {
      if (code !== 0) {
        console.error(`❌ yt-dlp process exited with code ${code}`);
        return res.status(500).json({ error: "Failed to download video/audio" });
      } else {
        console.log("✅ Download Completed Successfully!");

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
      }
    });

  } catch (error) {
    console.error("❌ Download Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error during download" });
    }
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
