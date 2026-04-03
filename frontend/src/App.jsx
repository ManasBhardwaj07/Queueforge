import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import CreateJobPage from './pages/CreateJobPage'
import OverviewPage from './pages/OverviewPage'
import ResultPage from './pages/ResultPage'
import TrackJobPage from './pages/TrackJobPage'

function App() {
  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim()

  return (
    <main className="shell" id="top">
      <header className="heading app-shell">
        <div>
          <p className="tag">QueueForge Phase 4</p>
          <h1>Queue Command Center</h1>
          <p className="subtitle">A guided multi-page flow for job creation, queue tracking, and result validation.</p>
        </div>
        <p className="api-label">API: {apiBaseUrl}</p>
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
      </nav>

      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/create" element={<CreateJobPage apiBaseUrl={apiBaseUrl} />} />
        <Route path="/track" element={<TrackJobPage apiBaseUrl={apiBaseUrl} />} />
        <Route path="/track/:jobId" element={<TrackJobPage apiBaseUrl={apiBaseUrl} />} />
        <Route path="/result/:jobId" element={<ResultPage apiBaseUrl={apiBaseUrl} />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </main>
  )
}

export default App
