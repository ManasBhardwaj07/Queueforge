export const LAST_JOB_KEY = 'queueforge:lastJobId'
export const ACTIVE_STATUSES = new Set(['WAITING', 'ACTIVE'])
export const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED'])

const STATUS_LABELS = Object.freeze({
  WAITING: 'Queued',
  ACTIVE: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
})

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

  if (Array.isArray(value)) {
    return value.length === 0 ? 'No items' : `${value.length} items`
  }

  if (typeof value === 'object') {
    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message
    }

    if (typeof value.reportName === 'string' && value.reportName.trim()) {
      return `Report: ${value.reportName}`
    }

    if (typeof value.recipientEmail === 'string' && value.recipientEmail.trim()) {
      return `Email sent to ${value.recipientEmail}`
    }

    return 'Details available'
  }

  return String(value)
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || '-'
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
