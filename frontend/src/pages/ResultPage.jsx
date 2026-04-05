import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createJobsApi, getApiErrorMessage } from '../api/jobsApi'
import { formatJsonValue, getSavedJobId, getStatusLabel, normalizeJob, saveJobId } from '../flowUtils'

function ResultPage({ apiBaseUrl }) {
  const { jobId: routeJobId } = useParams()
  const navigate = useNavigate()
  const jobsApi = useMemo(() => createJobsApi(apiBaseUrl), [apiBaseUrl])

  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [jobIdInput, setJobIdInput] = useState(() => getSavedJobId())

  const normalizedJob = useMemo(() => normalizeJob(job), [job])

  const fetchJob = useCallback(async (jobId) => {
    setError('')
    setIsLoading(true)

    try {
      const response = await jobsApi.getJobStatus(jobId)
      setJob(response)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load job result.'))
      setJob(null)
    } finally {
      setIsLoading(false)
    }
  }, [jobsApi])

  useEffect(() => {
    const value = decodeURIComponent(routeJobId || '').trim()
    if (!value) {
      return
    }

    saveJobId(value)
    fetchJob(value)
  }, [fetchJob, routeJobId])

  function openResultById(event) {
    event.preventDefault()
    const value = jobIdInput.trim()
    if (!value) {
      setError('Enter a job ID to view result.')
      return
    }

    setError('')
    navigate(`/result/${encodeURIComponent(value)}`)
  }

  function openSavedResult() {
    const value = getSavedJobId().trim()
    if (!value) {
      setError('No saved job ID found yet. Create or track a job first.')
      return
    }

    setError('')
    navigate(`/result/${encodeURIComponent(value)}`)
  }

  return (
    <section className="page">
      <header className="page-header compact">
        <p className="tag">Step 3</p>
        <h1>Result Review</h1>
        <p className="subtitle">Final audit view for the job lifecycle and output.</p>
      </header>

      <article className="panel">
        {!routeJobId && !job && !isLoading && !error && (
          <div className="empty-state">
            <p className="hint">No result selected yet. Open a job result using an ID below.</p>
          </div>
        )}

        {!routeJobId && (
          <section className="result-box">
            <h3>Open a Job Result</h3>
            <p className="hint">Enter a job ID to load its final status, result payload, and failure details.</p>

            <form className="stack" onSubmit={openResultById}>
              <label>
                Job ID
                <input
                  type="text"
                  value={jobIdInput}
                  onChange={(event) => {
                    setJobIdInput(event.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Paste job ID"
                />
              </label>

              <div className="inline-actions">
                <button type="submit">Open Result</button>
                <button type="button" className="ghost-btn" onClick={openSavedResult}>
                  Use Last Job ID
                </button>
              </div>
            </form>
          </section>
        )}

        {isLoading && <p className="hint">Loading result...</p>}
        {error && <p className="error">{error}</p>}

        {job && (
          <section className="result-box">
            <h3>Job Outcome</h3>

            <div className={`outcome-banner outcome-${normalizedJob.status.toLowerCase()}`}>
              <p>
                <strong>{getStatusLabel(normalizedJob.status)}</strong> for job <strong>{normalizedJob.jobId}</strong>
              </p>
            </div>

            <div className="summary-strip">
              <div>
                <p>Type</p>
                <strong>{normalizedJob.type}</strong>
              </div>
              <div>
                <p>Status</p>
                <strong>{getStatusLabel(normalizedJob.status)}</strong>
              </div>
              <div>
                <p>Attempts</p>
                <strong>
                  {normalizedJob.attemptsMade}/{normalizedJob.attemptsStarted}
                </strong>
              </div>
            </div>

            <dl className="details-grid">
              <div>
                <dt>Job ID</dt>
                <dd>{normalizedJob.jobId}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{normalizedJob.type}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`status-badge status-${normalizedJob.status.toLowerCase()}`}>
                    {getStatusLabel(normalizedJob.status)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Attempts</dt>
                <dd>
                  {normalizedJob.attemptsMade} / {normalizedJob.attemptsStarted}
                </dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd className="multiline">{formatJsonValue(normalizedJob.result)}</dd>
              </div>
              <div>
                <dt>Error</dt>
                <dd className="multiline">{formatJsonValue(normalizedJob.failedReason)}</dd>
              </div>
              <div>
                <dt>Final Failure Reason</dt>
                <dd>{formatJsonValue(normalizedJob.finalFailureReason)}</dd>
              </div>
            </dl>
          </section>
        )}

        <div className="inline-actions">
          <Link className="action-btn" to="/create">
            Create Another Job
          </Link>
          <Link className="ghost-btn" to="/track">
            Track Different Job
          </Link>
        </div>
      </article>
    </section>
  )
}

export default ResultPage
