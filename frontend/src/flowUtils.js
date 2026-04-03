export const LAST_JOB_KEY = 'queueforge:lastJobId'
export const ACTIVE_STATUSES = new Set(['WAITING', 'ACTIVE'])
export const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED'])

export function normalizeJob(job) {
  return {
    jobId: job?.jobId || '-',
    type: job?.type || '-',
    status: job?.status || '-',
    attemptsMade: Number.isFinite(job?.attemptsMade) ? job.attemptsMade : 0,
    attemptsStarted: Number.isFinite(job?.attemptsStarted) ? job.attemptsStarted : 0,
    result: job?.result ?? null,
    failedReason: job?.failedReason ?? null,
    finalFailureReason: job?.finalFailureReason ?? null,
  }
}

export function formatJsonValue(value) {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'string') {
    return value
  }

  return JSON.stringify(value, null, 2)
}

export function getSavedJobId() {
  return window.localStorage.getItem(LAST_JOB_KEY) || ''
}

export function saveJobId(jobId) {
  const value = jobId.trim()

  if (!value) {
    window.localStorage.removeItem(LAST_JOB_KEY)
    return
  }

  window.localStorage.setItem(LAST_JOB_KEY, value)
}
