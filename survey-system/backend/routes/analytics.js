const express = require('express');
const router = express.Router();
const Response = require('../models/Response');
const Survey = require('../models/Survey');
const { protect } = require('../middleware/auth');

// @GET /api/analytics/overview
router.get('/overview', protect, async (req, res) => {
  try {
    const { startDate, endDate, surveyId } = req.query;
    const isAdmin = req.user.role === 'admin';
    const surveyFilter = isAdmin ? {} : { creator: req.user._id };

    let surveys = await Survey.find(surveyFilter).select('_id title');
    let surveyIds = surveys.map(s => s._id);

    if (surveyId) {
      surveyIds = surveyIds.filter(id => id.toString() === surveyId);
    }

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchQuery = { survey: { $in: surveyIds } };
    if (Object.keys(dateFilter).length) matchQuery.submittedAt = dateFilter;

    // Hourly distribution (what time of day people respond)
    const hourlyDist = await Response.aggregate([
      { $match: matchQuery },
      { $group: { _id: { $hour: '$submittedAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Day of week distribution
    const weeklyDist = await Response.aggregate([
      { $match: matchQuery },
      { $group: { _id: { $dayOfWeek: '$submittedAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Survey comparison
    const surveyComparison = await Response.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$survey', count: { $sum: 1 }, avgTime: { $avg: '$timeTaken' } } },
      {
        $lookup: {
          from: 'surveys',
          localField: '_id',
          foreignField: '_id',
          as: 'surveyInfo',
        },
      },
      { $unwind: '$surveyInfo' },
      {
        $project: {
          title: '$surveyInfo.title',
          count: 1,
          avgTime: { $round: ['$avgTime', 0] },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Response.aggregate([
      { $match: { survey: { $in: surveyIds }, submittedAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$submittedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      analytics: {
        hourlyDist,
        weeklyDist,
        surveyComparison,
        monthlyTrend,
        availableSurveys: surveys,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
