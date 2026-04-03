import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createJobsApi, getApiErrorMessage } from '../api/jobsApi'
import { formatJsonValue, normalizeJob, saveJobId } from '../flowUtils'

function ResultPage({ apiBaseUrl }) {
  const { jobId: routeJobId } = useParams()
  const jobsApi = useMemo(() => createJobsApi(apiBaseUrl), [apiBaseUrl])

  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const normalizedJob = useMemo(() => normalizeJob(job), [job])

  useEffect(() => {
    const value = decodeURIComponent(routeJobId || '').trim()
    if (!value) {
      return
    }

    saveJobId(value)
    fetchJob(value)
  }, [routeJobId])

  async function fetchJob(jobId) {
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
  }

  return (
    <section className="page">
      <header className="page-header compact">
        <p className="tag">Step 3</p>
        <h1>Result Review</h1>
        <p className="subtitle">Final audit view for the job lifecycle and output.</p>
      </header>

      <article className="panel">
        {isLoading && <p className="hint">Loading result...</p>}
        {error && <p className="error">{error}</p>}

        {job && (
          <section className="result-box">
            <h3>Job Outcome</h3>
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
                    {normalizedJob.status}
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
