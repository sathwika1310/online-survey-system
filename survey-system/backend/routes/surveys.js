const express = require('express');
const router = express.Router();
const Survey = require('../models/Survey');
const Response = require('../models/Response');
const { protect, optionalAuth } = require('../middleware/auth');

// @GET /api/surveys — get all surveys for logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { creator: req.user._id };
    const surveys = await Survey.find(query)
      .populate('creator', 'name email')
      .sort({ createdAt: -1 });

    // Attach live response count
    const surveysWithCounts = await Promise.all(surveys.map(async (s) => {
      const count = await Response.countDocuments({ survey: s._id });
      return { ...s.toJSON(), totalResponses: count };
    }));

    res.json({ success: true, surveys: surveysWithCounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/surveys — create survey
router.post('/', protect, async (req, res) => {
  try {
    const survey = await Survey.create({ ...req.body, creator: req.user._id });
    res.status(201).json({ success: true, survey });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/surveys/:id — get single survey (auth)
router.get('/:id', protect, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id).populate('creator', 'name email');
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });

    const isOwner = survey.creator._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, survey });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/surveys/:id — update survey
router.put('/:id', protect, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });

    const isOwner = survey.creator.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updated = await Survey.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    res.json({ success: true, survey: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @DELETE /api/surveys/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });

    const isOwner = survey.creator.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Response.deleteMany({ survey: req.params.id });
    await survey.deleteOne();

    // Emit socket event
    req.io.to('dashboard').emit('survey-deleted', { surveyId: req.params.id });

    res.json({ success: true, message: 'Survey and all responses deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/surveys/public/:token — get survey by share token (public)
router.get('/public/:token', optionalAuth, async (req, res) => {
  try {
    const survey = await Survey.findOne({ shareToken: req.params.token, isActive: true });
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found or inactive' });

    if (survey.expiresAt && new Date() > survey.expiresAt) {
      return res.status(410).json({ success: false, message: 'Survey has expired' });
    }

    // Return questions without exposing sensitive admin data
    res.json({
      success: true,
      survey: {
        _id: survey._id,
        title: survey.title,
        description: survey.description,
        questions: survey.questions,
        theme: survey.theme,
        estimatedTime: survey.estimatedTime,
        allowAnonymous: survey.allowAnonymous,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/surveys/:id/toggle — toggle active status
router.post('/:id/toggle', protect, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });

    survey.isActive = !survey.isActive;
    await survey.save();
    res.json({ success: true, survey });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
