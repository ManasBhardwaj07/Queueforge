import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import CreateJobPage from './pages/CreateJobPage'
import { getSavedJobId } from './flowUtils'
import OverviewPage from './pages/OverviewPage'
import ResultPage from './pages/ResultPage'
import TrackJobPage from './pages/TrackJobPage'

const routeSteps = [
  {
    title: 'Overview',
    description: 'Understand the full queue journey.',
    path: '/overview',
  },
  {
    title: 'Create',
    description: 'Submit a new report or email job.',
    path: '/create',
  },
  {
    title: 'Track',
    description: 'Monitor processing and retries.',
    path: '/track',
  },
  {
    title: 'Result',
    description: 'Inspect final output and metadata.',
    path: '/result',
  },
]

function App() {
  const location = useLocation()
  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim()
  const savedJobId = getSavedJobId()
  const currentStepIndex = routeSteps.findIndex((step) => location.pathname.startsWith(step.path))

  return (
    <main className="shell" id="top">
      <header className="heading app-shell">
        <div>
          <p className="tag">QueueForge</p>
          <h1>Track Every Job</h1>
          <p className="subtitle">Create a request, watch progress live, and check final results in one place.</p>
        </div>
        <div className="header-meta">
          {savedJobId && (
            <NavLink className="saved-job-link" to={`/track/${encodeURIComponent(savedJobId)}`}>
              Resume Last Job
            </NavLink>
          )}
        </div>
      </header>

      <nav className="main-nav" aria-label="Primary">
        <NavLink to="/overview" className={({ isActive }) => (isActive ? 'nav-pill active' : 'nav-pill')}>
          Overview
        </NavLink>
        <NavLink to="/create" className={({ isActive }) => (isActive ? 'nav-pill active' : 'nav-pill')}>
          Create Job
        </NavLink>
        <NavLink to="/track" className={({ isActive }) => (isActive ? 'nav-pill active' : 'nav-pill')}>
          Track Job
        </NavLink>
        <NavLink to="/result" className={({ isActive }) => (isActive ? 'nav-pill active' : 'nav-pill')}>
          Result
        </NavLink>
      </nav>

      <section className="route-rail" aria-label="Journey progress">
        {routeSteps.map((step, index) => (
          <div
            key={step.title}
            className={
              currentStepIndex >= index || (step.path === '/result' && location.pathname.startsWith('/result'))
                ? 'rail-node active'
                : 'rail-node'
            }
          >
            <span className="rail-index">{index + 1}</span>
            <div>
              <p className="rail-title">{step.title}</p>
              <p className="rail-description">{step.description}</p>
            </div>
          </div>
        ))}
      </section>

      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/create" element={<CreateJobPage apiBaseUrl={apiBaseUrl} />} />
        <Route path="/track" element={<TrackJobPage apiBaseUrl={apiBaseUrl} />} />
        <Route path="/track/:jobId" element={<TrackJobPage apiBaseUrl={apiBaseUrl} />} />
        <Route path="/result" element={<ResultPage apiBaseUrl={apiBaseUrl} />} />
        <Route path="/result/:jobId" element={<ResultPage apiBaseUrl={apiBaseUrl} />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </main>
  )
}

export default App
