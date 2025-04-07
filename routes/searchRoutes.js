const express = require("express");
const axios = require("axios");
const router = express.Router();
const Search = require("../models/Search"); // Ensure correct path

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Query is required" });

    const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: { q: query, key: YOUTUBE_API_KEY, part: "snippet", maxResults: 200, type: "video" },
    });

    const videos = response.data.items?.map((video) => ({
      title: video.snippet.title,
      videoId: video.id.videoId,
      thumbnail: video.snippet.thumbnails.high.url,
      channelTitle: video.snippet.channelTitle,
      publishTime: video.snippet.publishTime,
    }));

    // ✅ Save the search query to the database
    try {
      const newSearch = new Search({ query });
      await newSearch.save();
      console.log("✅ Search query saved to database:", query);
    } catch (dbError) {
      console.error("❌ Database Save Error:", dbError);
    }

    res.json(videos);
  } catch (error) {
    console.error("❌ YouTube API Error:", error);
    res.status(500).json({ error: "Error fetching YouTube videos" });
  }
});

router.get("/search/all", async (req, res) => {
  try {
    const searches = await Search.find({}).sort({ searchedAt: -1 }); // Sorting by latest searches
    res.status(200).json(searches);
  } catch (error) {
    console.error("❌ Error fetching search history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Route: Get total search count
router.get("/search/count", async (req, res) => {
  try {
    const totalSearches = await Search.countDocuments();
    res.status(200).json({ totalSearches });
  } catch (error) {
    console.error("❌ Error fetching search count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



// ✅ Route: Get Top 10 Most Searched Queries
router.get("/search/top", async (req, res) => {
  try {
    const topSearchQueries = await Search.aggregate([
      { $group: { _id: "$query", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { title: "$_id", count: 1, _id: 0 } },
    ]);

    res.status(200).json(topSearchQueries);
  } catch (error) {
    console.error("❌ Error fetching top search queries:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
