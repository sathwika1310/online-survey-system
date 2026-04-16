const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const questionSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4() },
  type: {
    type: String,
    enum: ['mcq', 'text', 'rating', 'checkbox', 'dropdown', 'linear_scale'],
    required: true,
  },
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }], // for MCQ, checkbox, dropdown
  minRating: { type: Number, default: 1 },
  maxRating: { type: Number, default: 5 },
  placeholder: { type: String, default: '' },
  order: { type: Number, default: 0 },
});

const surveySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Survey title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questions: [questionSchema],
  shareToken: {
    type: String,
    unique: true,
    default: () => uuidv4(),
  },
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: true },
  allowAnonymous: { type: Boolean, default: true },
  allowMultipleSubmissions: { type: Boolean, default: false },
  expiresAt: { type: Date },
  theme: {
    type: String,
    enum: ['default', 'dark', 'ocean', 'sunset', 'forest'],
    default: 'default',
  },
  tags: [{ type: String }],
  totalResponses: { type: Number, default: 0 },
  estimatedTime: { type: Number, default: 5 }, // minutes
}, { timestamps: true });

// Virtual for share URL
surveySchema.virtual('shareUrl').get(function () {
  return `/survey/${this.shareToken}`;
});

surveySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Survey', surveySchema);
