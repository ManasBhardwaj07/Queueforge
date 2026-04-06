import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createJobsApi, getApiErrorMessage } from '../api/jobsApi'
import {
  ACTIVE_STATUSES,
  formatJsonValue,
  getStatusLabel,
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
  const [displayStatus, setDisplayStatus] = useState('')
  const [isTimelineReplaying, setIsTimelineReplaying] = useState(false)
  const timelineTimersRef = useRef([])

  const normalizedStatusResult = useMemo(() => normalizeJob(statusResult), [statusResult])
  const visibleStatus = displayStatus || normalizedStatusResult.status

  const clearTimelineReplay = useCallback(() => {
    timelineTimersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId)
    })
    timelineTimersRef.current = []
    setDisplayStatus('')
    setIsTimelineReplaying(false)
  }, [])

  const replayTerminalTimeline = useCallback((terminalStatus) => {
    clearTimelineReplay()
    setIsTimelineReplaying(true)
    setDisplayStatus('WAITING')

    const toActive = window.setTimeout(() => {
      setDisplayStatus('ACTIVE')
    }, 1100)

    const toTerminal = window.setTimeout(() => {
      setDisplayStatus(terminalStatus)
      setIsTimelineReplaying(false)
    }, 2600)

    timelineTimersRef.current = [toActive, toTerminal]
  }, [clearTimelineReplay])

  const fetchStatusById = useCallback(async (jobId, options = { silent: false }) => {
    const { silent, replayTerminal } = options

    if (!silent) {
      setStatusError('')
      setStatusResult(null)
      setIsFetchingStatus(true)
      if (!replayTerminal) {
        clearTimelineReplay()
      }
    }

    try {
      const job = await jobsApi.getJobStatus(jobId)
      setStatusResult(job)
      saveJobId(job.jobId)

      if (!silent && replayTerminal && TERMINAL_STATUSES.has(job.status)) {
        replayTerminalTimeline(job.status)
      }
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
  }, [clearTimelineReplay, jobsApi, replayTerminalTimeline])

  useEffect(() => {
    const incoming = decodeURIComponent(routeJobId || '').trim()
    if (incoming) {
      setLookupJobId(incoming)
      return
    }
  }, [routeJobId])

  useEffect(() => {
    if (!lookupJobId.trim() || statusResult || isFetchingStatus) {
      return
    }

    fetchStatusById(lookupJobId.trim(), { silent: false, replayTerminal: true })
  }, [fetchStatusById, isFetchingStatus, lookupJobId, statusResult])

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
  }, [fetchStatusById, lookupJobId, statusResult])

  useEffect(() => {
    if (!statusResult || !TERMINAL_STATUSES.has(visibleStatus) || isRedirecting) {
      return
    }

    setIsRedirecting(true)
    const timerId = window.setTimeout(() => {
      navigate(`/result/${encodeURIComponent(statusResult.jobId)}`)
    }, 1800)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [isRedirecting, navigate, statusResult, visibleStatus])

  useEffect(() => {
    return () => {
      clearTimelineReplay()
    }
  }, [clearTimelineReplay])

  async function handleFetchStatus(event) {
    event.preventDefault()
    setIsRedirecting(false)
    await fetchStatusById(lookupJobId.trim(), { silent: false, replayTerminal: true })
  }

  return (
    <section className="page">
      <header className="page-header compact">
        <p className="tag">Track</p>
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
              onChange={(event) => {
                setLookupJobId(event.target.value)
                setStatusResult(null)
                setStatusError('')
                setIsRedirecting(false)
                clearTimelineReplay()
              }}
              placeholder="paste job id"
              required
            />
          </label>
          <button type="submit" disabled={isFetchingStatus}>
            {isFetchingStatus ? 'Checking...' : 'Get Status'}
          </button>
        </form>

        {!lookupJobId.trim() && !statusResult && !statusError && (
          <div className="empty-state">
            <p className="hint">Paste a Job ID from Create Job to start live tracking.</p>
          </div>
        )}

        {statusError && <p className="error">{statusError}</p>}

        {statusResult && (
          <section className="result-box">
            <h3>Live Status</h3>

            <div className="status-headline">
              <span className={`status-badge status-${visibleStatus.toLowerCase()}`}>
                {getStatusLabel(visibleStatus)}
              </span>
              <p>
                Job <strong>{normalizedStatusResult.jobId}</strong>
              </p>
            </div>

            <div className="status-timeline" aria-label="Status timeline">
              <span className={visibleStatus === 'WAITING' ? 'timeline-pill active' : 'timeline-pill'}>
                Queued
              </span>
              <span className={visibleStatus === 'ACTIVE' ? 'timeline-pill active' : 'timeline-pill'}>
                Processing
              </span>
              <span
                className={
                  visibleStatus === 'COMPLETED' || visibleStatus === 'FAILED'
                    ? 'timeline-pill active'
                    : 'timeline-pill'
                }
              >
                Finished
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
                  {getStatusLabel(visibleStatus)}
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

            {isTimelineReplaying && (
              <p className="hint">Showing queue flow sequence for clarity...</p>
            )}

            {TERMINAL_STATUSES.has(visibleStatus) && (
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
