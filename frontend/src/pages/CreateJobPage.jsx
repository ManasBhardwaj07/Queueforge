import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createJobsApi, getApiErrorMessage } from '../api/jobsApi'
import { saveJobId } from '../flowUtils'

function CreateJobPage({ apiBaseUrl }) {
  const navigate = useNavigate()
  const jobsApi = useMemo(() => createJobsApi(apiBaseUrl), [apiBaseUrl])

  const [jobType, setJobType] = useState('report')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [reportName, setReportName] = useState('')
  const [createError, setCreateError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleCreateJob(event) {
    event.preventDefault()
    setCreateError('')
    setIsSubmitting(true)

    try {
      const payload =
        jobType === 'email'
          ? {
              recipientEmail,
              subject,
            }
          : {
              reportName,
            }

      const createdJob = await jobsApi.createJob({
        type: jobType,
        payload,
      })

      if (createdJob?.jobId) {
        saveJobId(createdJob.jobId)
        navigate(`/track/${encodeURIComponent(createdJob.jobId)}`)
      }
    } catch (error) {
      setCreateError(getApiErrorMessage(error, 'Failed to create job.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page">
      <header className="page-header compact">
        <p className="tag">Step 1</p>
        <h1>Create Job</h1>
        <p className="subtitle">Fill one form and you will be redirected to live tracking automatically.</p>
      </header>

      <article className="panel">
        <form className="stack" onSubmit={handleCreateJob}>
          <label>
            Type
            <select value={jobType} onChange={(event) => setJobType(event.target.value)}>
              <option value="report">report</option>
              <option value="email">email</option>
            </select>
          </label>

          {jobType === 'email' ? (
            <>
              <label>
                Recipient Email
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  placeholder="dev@example.com"
                  required
                />
              </label>
              <label>
                Subject (optional)
                <input
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Queue update"
                />
              </label>
            </>
          ) : (
            <label>
              Report Name
              <input
                type="text"
                value={reportName}
                onChange={(event) => setReportName(event.target.value)}
                placeholder="daily-summary"
                required
              />
            </label>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating and redirecting...' : 'Create Job'}
          </button>
        </form>

        {createError && <p className="error">{createError}</p>}
      </article>
    </section>
  )
}

export default CreateJobPage
