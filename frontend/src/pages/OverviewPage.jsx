import { Link } from 'react-router-dom'

function OverviewPage() {
  return (
    <section className="page">
      <header className="page-header">
        <p className="tag">Welcome</p>
        <h1>How QueueForge Helps You</h1>
        <p className="subtitle">
          Submit a job in seconds, follow real-time status updates, and quickly understand whether your request finished
          successfully.
        </p>
      </header>

      <section className="timeline-grid">
        <article className="timeline-card">
          <p className="timeline-step">Step 1</p>
          <h2>Submit</h2>
          <p>Choose email or report, complete the form, and get your job ID instantly.</p>
        </article>
        <article className="timeline-card">
          <p className="timeline-step">Step 2</p>
          <h2>Follow Progress</h2>
          <p>Watch status changes from waiting to active and see retry attempts automatically.</p>
        </article>
        <article className="timeline-card">
          <p className="timeline-step">Step 3</p>
          <h2>Review Outcome</h2>
          <p>Check final result details, or clear failure reasons with all metadata in one view.</p>
        </article>
      </section>

      <section className="ops-grid">
        <article className="ops-card">
          <h3>What You Can Do Here</h3>
          <p>Create new jobs, return to existing jobs, and continue tracking after page refresh.</p>
        </article>
        <article className="ops-card">
          <h3>What Status Means</h3>
          <p>Waiting means queued, Active means processing, Completed means done, Failed means attention needed.</p>
        </article>
        <article className="ops-card">
          <h3>Why It Is Reliable</h3>
          <p>Automatic retries and persistent tracking help avoid lost requests and make issue triage easier.</p>
        </article>
      </section>

      <section className="ops-card quick-start-card" aria-label="Before you start">
        <h3>Before You Start</h3>
        <ul className="quick-list">
          <li>Choose email when you need message delivery, or report for generated output jobs.</li>
          <li>Save your job ID so you can check progress later on any device.</li>
          <li>If a job fails, open the Result page to see the exact failure reason.</li>
        </ul>
      </section>

      <div className="page-actions">
        <Link className="action-btn" to="/create">
          Create Your First Job
        </Link>
        <Link className="ghost-btn" to="/track">
          I Already Have a Job ID
        </Link>
      </div>
    </section>
  )
}

export default OverviewPage
