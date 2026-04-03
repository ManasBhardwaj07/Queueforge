import { Link } from 'react-router-dom'

function OverviewPage() {
  return (
    <section className="page">
      <header className="page-header">
        <p className="tag">QueueForge Flow</p>
        <h1>From Request to Result</h1>
        <p className="subtitle">
          This console guides users through one clear route: create a job, track processing, and inspect the final outcome.
        </p>
      </header>

      <section className="timeline-grid">
        <article className="timeline-card">
          <p className="timeline-step">Step 1</p>
          <h2>Create</h2>
          <p>Submit an email or report job and get a generated job ID.</p>
        </article>
        <article className="timeline-card">
          <p className="timeline-step">Step 2</p>
          <h2>Track</h2>
          <p>Monitor queue progress with automatic status refresh while processing.</p>
        </article>
        <article className="timeline-card">
          <p className="timeline-step">Step 3</p>
          <h2>Review</h2>
          <p>See attempts, final status, and result or failure reason in one place.</p>
        </article>
      </section>

      <div className="page-actions">
        <Link className="action-btn" to="/create">
          Start New Job
        </Link>
        <Link className="ghost-btn" to="/track">
          Track Existing Job
        </Link>
      </div>
    </section>
  )
}

export default OverviewPage
