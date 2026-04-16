const express = require('express');
const router = express.Router();
const Survey = require('../models/Survey');
const Response = require('../models/Response');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @GET /api/dashboard/stats — global dashboard stats
router.get('/stats', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const surveyFilter = isAdmin ? {} : { creator: req.user._id };

    const surveys = await Survey.find(surveyFilter).select('_id');
    const surveyIds = surveys.map(s => s._id);

    const [
      totalSurveys,
      activeSurveys,
      totalResponses,
      totalUsers,
    ] = await Promise.all([
      Survey.countDocuments(surveyFilter),
      Survey.countDocuments({ ...surveyFilter, isActive: true }),
      Response.countDocuments({ survey: { $in: surveyIds } }),
      isAdmin ? User.countDocuments() : Promise.resolve(null),
    ]);

    // Responses in last 7 days (daily trend)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyTrend = await Response.aggregate([
      {
        $match: {
          survey: { $in: surveyIds },
          submittedAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top surveys by responses
    const topSurveys = await Response.aggregate([
      { $match: { survey: { $in: surveyIds } } },
      { $group: { _id: '$survey', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'surveys',
          localField: '_id',
          foreignField: '_id',
          as: 'survey',
        },
      },
      { $unwind: '$survey' },
      { $project: { title: '$survey.title', count: 1 } },
    ]);

    // Recent responses
    const recentResponses = await Response.find({ survey: { $in: surveyIds } })
      .sort({ submittedAt: -1 })
      .limit(10)
      .populate('survey', 'title');

    // Average completion time
    const avgTime = await Response.aggregate([
      { $match: { survey: { $in: surveyIds }, timeTaken: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$timeTaken' } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalSurveys,
        activeSurveys,
        totalResponses,
        totalUsers,
        completionRate: totalSurveys > 0 ? Math.round((totalResponses / (totalSurveys * 10)) * 100) : 0,
        avgCompletionTime: avgTime[0]?.avg ? Math.round(avgTime[0].avg) : 0,
        dailyTrend,
        topSurveys,
        recentResponses,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/dashboard/survey/:id/analytics — per-survey analytics
router.get('/survey/:id/analytics', protect, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });

    const responses = await Response.find({ survey: req.params.id });

    // Per-question analytics
    const questionAnalytics = survey.questions.map(q => {
      const answers = responses.flatMap(r => r.answers.filter(a => a.questionId === q.id));

      if (q.type === 'mcq' || q.type === 'dropdown') {
        const distribution = {};
        q.options.forEach(opt => { distribution[opt] = 0; });
        answers.forEach(a => {
          if (distribution[a.value] !== undefined) distribution[a.value]++;
          else distribution[a.value] = 1;
        });
        return { questionId: q.id, question: q.question, type: q.type, distribution };
      }

      if (q.type === 'rating' || q.type === 'linear_scale') {
        const values = answers.map(a => Number(a.value)).filter(v => !isNaN(v));
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        const distribution = {};
        for (let i = q.minRating || 1; i <= (q.maxRating || 5); i++) distribution[i] = 0;
        values.forEach(v => { if (distribution[v] !== undefined) distribution[v]++; });
        return { questionId: q.id, question: q.question, type: q.type, avg: avg.toFixed(2), distribution };
      }

      if (q.type === 'checkbox') {
        const distribution = {};
        q.options.forEach(opt => { distribution[opt] = 0; });
        answers.forEach(a => {
          const vals = Array.isArray(a.value) ? a.value : [a.value];
          vals.forEach(v => { if (distribution[v] !== undefined) distribution[v]++; else distribution[v] = 1; });
        });
        return { questionId: q.id, question: q.question, type: q.type, distribution };
      }

      // text type
      const textAnswers = answers.map(a => a.value).filter(Boolean);
      return { questionId: q.id, question: q.question, type: q.type, responses: textAnswers.slice(0, 20), total: textAnswers.length };
    });

    // 30-day trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trend = await Response.aggregate([
      { $match: { survey: survey._id, submittedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      analytics: {
        totalResponses: responses.length,
        trend,
        questionAnalytics,
        avgTimeTaken: responses.reduce((a, r) => a + (r.timeTaken || 0), 0) / (responses.length || 1),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
