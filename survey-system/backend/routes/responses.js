const express = require('express');
const router = express.Router();
const Response = require('../models/Response');
const Survey = require('../models/Survey');
const { protect, optionalAuth } = require('../middleware/auth');

// @POST /api/responses — submit a survey response
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { surveyId, answers, respondentName, respondentEmail, timeTaken, sessionId } = req.body;

    const survey = await Survey.findById(surveyId);
    if (!survey || !survey.isActive) {
      return res.status(404).json({ success: false, message: 'Survey not found or inactive' });
    }

    // Prevent duplicate submissions via sessionId
    if (sessionId && !survey.allowMultipleSubmissions) {
      const existing = await Response.findOne({ survey: surveyId, sessionId });
      if (existing) {
        return res.status(409).json({ success: false, message: 'You have already submitted this survey' });
      }
    }

    const response = await Response.create({
      survey: surveyId,
      respondent: req.user?._id || null,
      respondentName: respondentName || (req.user?.name) || 'Anonymous',
      respondentEmail: respondentEmail || (req.user?.email) || '',
      answers,
      timeTaken,
      sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Update survey response count
    await Survey.findByIdAndUpdate(surveyId, { $inc: { totalResponses: 1 } });

    // ⚡ Real-time: emit to dashboard and survey-specific room
    const updatedCount = await Response.countDocuments({ survey: surveyId });

    const emitData = {
      surveyId,
      response: {
        _id: response._id,
        respondentName: response.respondentName,
        submittedAt: response.submittedAt,
        answers: response.answers,
        timeTaken: response.timeTaken,
      },
      totalResponses: updatedCount,
    };

    req.io.to('dashboard').emit('new-response', emitData);
    req.io.to(`survey-${surveyId}`).emit('new-response', emitData);

    res.status(201).json({ success: true, message: 'Response submitted successfully', responseId: response._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/responses/survey/:surveyId — get all responses for a survey
router.get('/survey/:surveyId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const survey = await Survey.findById(req.params.surveyId);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });

    const isOwner = survey.creator.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const filter = { survey: req.params.surveyId };
    if (startDate || endDate) {
      filter.submittedAt = {};
      if (startDate) filter.submittedAt.$gte = new Date(startDate);
      if (endDate) filter.submittedAt.$lte = new Date(endDate);
    }

    const total = await Response.countDocuments(filter);
    const responses = await Response.find(filter)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      responses,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/responses/survey/:surveyId/export — export as CSV
router.get('/survey/:surveyId/export', protect, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.surveyId);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });

    const responses = await Response.find({ survey: req.params.surveyId }).sort({ submittedAt: -1 });

    // Build CSV
    const headers = ['Response ID', 'Respondent', 'Email', 'Submitted At', 'Time Taken (s)'];
    survey.questions.forEach(q => headers.push(`Q: ${q.question}`));

    const rows = responses.map(r => {
      const row = [
        r._id.toString(),
        r.respondentName,
        r.respondentEmail,
        new Date(r.submittedAt).toISOString(),
        r.timeTaken || '',
      ];
      survey.questions.forEach(q => {
        const answer = r.answers.find(a => a.questionId === q.id);
        row.push(answer ? (Array.isArray(answer.value) ? answer.value.join('; ') : answer.value) : '');
      });
      return row;
    });

    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="survey-${req.params.surveyId}-responses.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @DELETE /api/responses/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const response = await Response.findByIdAndDelete(req.params.id);
    if (!response) return res.status(404).json({ success: false, message: 'Response not found' });
    await Survey.findByIdAndUpdate(response.survey, { $inc: { totalResponses: -1 } });
    res.json({ success: true, message: 'Response deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
