const mongoose = require('mongoose');
const { JOB_TYPE_LIST } = require('../queue/jobTypes');

const JOB_STATUS = Object.freeze({
  WAITING: 'WAITING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
});

const jobSchema = new mongoose.Schema(
  {
    jobId: { type: String, index: true, unique: true, sparse: true },
    type: { type: String, required: true, enum: JOB_TYPE_LIST },
    status: {
      type: String,
      enum: Object.values(JOB_STATUS),
      default: JOB_STATUS.WAITING,
      required: true,
      index: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    attempts: { type: Number, default: 0 },
    attemptsMade: { type: Number, default: 0 },
    attemptsStarted: { type: Number, default: 0 },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    failedReason: { type: String, default: null },
    processedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

jobSchema.index({ status: 1, createdAt: -1 });

const JobModel = mongoose.models.Job || mongoose.model('Job', jobSchema);

module.exports = {
  JobModel,
  JOB_STATUS,
};
