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
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validateForm() {
    if (jobType === 'email') {
      if (!recipientEmail.trim()) {
        return 'Recipient email is required.'
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(recipientEmail.trim())) {
        return 'Enter a valid email address.'
      }

      return ''
    }

    if (!reportName.trim()) {
      return 'Report name is required.'
    }

    if (reportName.trim().length < 3) {
      return 'Report name must be at least 3 characters.'
    }

    return ''
  }

  async function handleCreateJob(event) {
    event.preventDefault()
    setCreateError('')
    setFormError('')

    const validationMessage = validateForm()
    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    setIsSubmitting(true)

    try {
      const payload =
        jobType === 'email'
          ? {
              recipientEmail: recipientEmail.trim(),
              subject: subject.trim(),
            }
          : {
              reportName: reportName.trim(),
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
        <p className="tag">Create</p>
        <h1>Create Job</h1>
        <p className="subtitle">Fill one short form. After submit, you will be redirected to live tracking automatically.</p>
      </header>

      <article className="panel create-layout">
        <form className="stack" onSubmit={handleCreateJob}>
          <p className="muted-note">Choose a job type and complete only the required fields.</p>

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
                  onChange={(event) => {
                    setRecipientEmail(event.target.value)
                    if (formError) setFormError('')
                  }}
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
                onChange={(event) => {
                  setReportName(event.target.value)
                  if (formError) setFormError('')
                }}
                placeholder="daily-summary"
                required
              />
            </label>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating and redirecting...' : 'Create Job'}
          </button>

          {formError && <p className="error">{formError}</p>}
          {createError && <p className="error">{createError}</p>}
        </form>

        <aside className="preview-column">
          <section className="ops-card">
            <h3>What happens next</h3>
            <p>You will get a job ID, then we open the tracking view and refresh status automatically.</p>
          </section>
        </aside>
      </article>
    </section>
  )
}

export default CreateJobPage
