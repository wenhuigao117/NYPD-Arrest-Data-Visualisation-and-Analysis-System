import express from "express";
import trendsData from "../data/trends.js";

const router = express.Router();

// UPDATED: /monthly supports ?format=json for API-style responses
router.route("/monthly").get(async (req, res) => {
  try {
    const monthlyTrends = await trendsData.getMonthlyTrends();

    // if the stats page calls /trends/monthly?format=json
    // return raw JSON instead of rendering the handlebars view
    if (req.query.format === "json") {
      return res.json({ trends: monthlyTrends}); // updated
    }

    // Default: render the trends page as before 
    res.render("trends", {
      title: "Monthly Arrest Trends",
      trends: monthlyTrends,
      type: "month"
    });
  } catch (error) {
    res.status(500).render("error", { title: "Error", error: error.message });
  }
});

// updated a bit to support weekly trend for ?format=json
router.route("/weekly").get(async (req, res) => {
  try {
    const weeklyTrends = await trendsData.getWeeklyTrends();

    // updated: JSON mode
    if (req.query.format === "json") {
      return res.json({ trends: weeklyTrends}); // updated
    }

    // kept the same as before
    res.render("trends", {
      title: "Weekly Arrest Trends",
      trends: weeklyTrends,
      type: "week"
    });
  } catch (error) {
    res.status(500).render("error", { title: "Error", error: error.message });
  }
});

export default router;
