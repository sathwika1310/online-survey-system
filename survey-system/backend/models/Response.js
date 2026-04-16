const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String },
  questionType: { type: String },
  value: { type: mongoose.Schema.Types.Mixed }, // string, number, array
});

const responseSchema = new mongoose.Schema({
  survey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey',
    required: true,
  },
  respondent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  respondentEmail: { type: String, default: '' },
  respondentName: { type: String, default: 'Anonymous' },
  answers: [answerSchema],
  isComplete: { type: Boolean, default: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  submittedAt: { type: Date, default: Date.now },
  timeTaken: { type: Number }, // seconds
  sessionId: { type: String }, // prevent duplicate submissions
}, { timestamps: true });

// Index for fast analytics queries
responseSchema.index({ survey: 1, submittedAt: -1 });
responseSchema.index({ survey: 1, sessionId: 1 });

module.exports = mongoose.model('Response', responseSchema);
