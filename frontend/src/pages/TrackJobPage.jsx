import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createJobsApi, getApiErrorMessage } from '../api/jobsApi'
import {
  ACTIVE_STATUSES,
  formatJsonValue,
  getSavedJobId,
  normalizeJob,
  saveJobId,
  TERMINAL_STATUSES,
} from '../flowUtils'

function TrackJobPage({ apiBaseUrl }) {
  const navigate = useNavigate()
  const { jobId: routeJobId } = useParams()
  const jobsApi = useMemo(() => createJobsApi(apiBaseUrl), [apiBaseUrl])

  const [lookupJobId, setLookupJobId] = useState('')
  const [statusResult, setStatusResult] = useState(null)
  const [statusError, setStatusError] = useState('')
  const [isFetchingStatus, setIsFetchingStatus] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const normalizedStatusResult = useMemo(() => normalizeJob(statusResult), [statusResult])

  useEffect(() => {
    const incoming = decodeURIComponent(routeJobId || '').trim()
    if (incoming) {
      setLookupJobId(incoming)
      saveJobId(incoming)
      return
    }

    const saved = getSavedJobId().trim()
    if (saved) {
      setLookupJobId(saved)
    }
  }, [routeJobId])

  useEffect(() => {
    const value = lookupJobId.trim()
    if (!value) {
      return
    }

    saveJobId(value)
  }, [lookupJobId])

  useEffect(() => {
    if (!lookupJobId.trim() || statusResult || isFetchingStatus) {
      return
    }

    fetchStatusById(lookupJobId.trim(), { silent: false })
  }, [isFetchingStatus, lookupJobId, statusResult])

  useEffect(() => {
    if (!lookupJobId.trim() || !statusResult || !ACTIVE_STATUSES.has(statusResult.status)) {
      return
    }

    const timerId = window.setTimeout(() => {
      fetchStatusById(lookupJobId.trim(), { silent: true })
    }, 2000)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [lookupJobId, statusResult])

  useEffect(() => {
    if (!statusResult || !TERMINAL_STATUSES.has(statusResult.status) || isRedirecting) {
      return
    }

    setIsRedirecting(true)
    const timerId = window.setTimeout(() => {
      navigate(`/result/${encodeURIComponent(statusResult.jobId)}`)
    }, 1400)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [isRedirecting, navigate, statusResult])

  async function fetchStatusById(jobId, options = { silent: false }) {
    const { silent } = options

    if (!silent) {
      setStatusError('')
      setStatusResult(null)
      setIsFetchingStatus(true)
    }

    try {
      const job = await jobsApi.getJobStatus(jobId)
      setStatusResult(job)
    } catch (error) {
      setStatusError(getApiErrorMessage(error, 'Failed to fetch job status.'))
      if (!silent) {
        setStatusResult(null)
      }
    } finally {
      if (!silent) {
        setIsFetchingStatus(false)
      }
    }
  }

  async function handleFetchStatus(event) {
    event.preventDefault()
    setIsRedirecting(false)
    await fetchStatusById(lookupJobId.trim(), { silent: false })
  }

  return (
    <section className="page">
      <header className="page-header compact">
        <p className="tag">Step 2</p>
        <h1>Track Job</h1>
        <p className="subtitle">Live queue updates are automatic while status is WAITING or ACTIVE.</p>
      </header>

      <article className="panel">
        <form className="stack" onSubmit={handleFetchStatus}>
          <label>
            Job ID
            <input
              type="text"
              value={lookupJobId}
              onChange={(event) => setLookupJobId(event.target.value)}
              placeholder="paste job id"
              required
            />
          </label>
          <button type="submit" disabled={isFetchingStatus}>
            {isFetchingStatus ? 'Checking...' : 'Get Status'}
          </button>
        </form>

        {lookupJobId.trim() && <p className="hint">Stored in browser for refresh persistence.</p>}
        {statusError && <p className="error">{statusError}</p>}

        {statusResult && (
          <section className="result-box">
            <h3>Live Status</h3>

            <div className="status-headline">
              <span className={`status-badge status-${normalizedStatusResult.status.toLowerCase()}`}>
                {normalizedStatusResult.status}
              </span>
              <p>
                Job <strong>{normalizedStatusResult.jobId}</strong>
              </p>
            </div>

            <div className="status-timeline" aria-label="Status timeline">
              <span className={normalizedStatusResult.status === 'WAITING' ? 'timeline-pill active' : 'timeline-pill'}>
                WAITING
              </span>
              <span className={normalizedStatusResult.status === 'ACTIVE' ? 'timeline-pill active' : 'timeline-pill'}>
                ACTIVE
              </span>
              <span
                className={
                  normalizedStatusResult.status === 'COMPLETED' || normalizedStatusResult.status === 'FAILED'
                    ? 'timeline-pill active'
                    : 'timeline-pill'
                }
              >
                TERMINAL
              </span>
            </div>

            <dl className="details-grid">
              <div>
                <dt>Job ID</dt>
                <dd>{normalizedStatusResult.jobId}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  {normalizedStatusResult.status}
                </dd>
              </div>
              <div>
                <dt>Attempts</dt>
                <dd>
                  {normalizedStatusResult.attemptsMade} / {normalizedStatusResult.attemptsStarted}
                </dd>
              </div>
              <div>
                <dt>Result Preview</dt>
                <dd className="multiline">{formatJsonValue(normalizedStatusResult.result)}</dd>
              </div>
            </dl>

            {ACTIVE_STATUSES.has(normalizedStatusResult.status) && (
              <p className="hint live-hint">
                <span className="live-dot" /> Auto-refresh active every 2 seconds.
              </p>
            )}

            {TERMINAL_STATUSES.has(normalizedStatusResult.status) && (
              <p className="hint">Terminal state reached. Redirecting to detailed result page...</p>
            )}

            <div className="inline-actions">
              <Link className="action-btn" to={`/result/${encodeURIComponent(normalizedStatusResult.jobId)}`}>
                Open Result Now
              </Link>
              <Link className="ghost-btn" to="/create">
                Create Another Job
              </Link>
            </div>
          </section>
        )}
      </article>
    </section>
  )
}

export default TrackJobPage
