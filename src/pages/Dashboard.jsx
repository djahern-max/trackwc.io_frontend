import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { entries, employees, auth } from '../services/api'
import styles from './Dashboard.module.css'

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })
}

const today = new Date().toISOString().split('T')[0]

export default function Dashboard() {
  const navigate = useNavigate()
  const employee = auth.getEmployee()
  const [stats, setStats] = useState(null)
  const [allEmployees, setAllEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([entries.today(), employees.list()])
      .then(([s, emps]) => {
        setStats(s)
        setAllEmployees(emps.filter(e => e.role === 'worker'))
      })
      .finally(() => setLoading(false))
  }, [])

  function handleLogout() {
    auth.logout()
    navigate('/login')
  }

  const checkedInIds = new Set(stats?.recent_entries?.map(e => e.employee_id) || [])
  const missing = allEmployees.filter(e => !checkedInIds.has(e.id))
  const coveragePct = allEmployees.length
    ? Math.round((stats?.checked_in_today || 0) / allEmployees.length * 100)
    : 0

  // Ring SVG values
  const radius = 15.9
  const circumference = 2 * Math.PI * radius
  const strokeDash = (coveragePct / 100) * circumference

  const ringColor = coveragePct === 100
    ? 'var(--success)'
    : coveragePct >= 75
      ? 'var(--accent)'
      : 'var(--danger)'

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoText}>
            TrackWC<span className={styles.logoAccent}>.io</span>
          </div>
          <div className={styles.dateLabel}>{formatDate(today)}</div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <i className="fi fi-rr-sign-out-alt" />
          Sign out
        </button>
      </header>

      {/* ── Quick Actions ── */}
      <nav className={styles.actions}>
        <button className={styles.actionBtn} onClick={() => navigate('/foreman')}>
          <div className={styles.actionIcon}>
            <i className="fi fi-rr-users" />
          </div>
          <span className={styles.actionLabel}>Assign Crew</span>
        </button>
        <button className={styles.actionBtn} onClick={() => navigate('/reports')}>
          <div className={styles.actionIcon}>
            <i className="fi fi-rr-chart-histogram" />
          </div>
          <span className={styles.actionLabel}>Reports</span>
        </button>
        <button className={styles.actionBtn} onClick={() => navigate('/admin/employees')}>
          <div className={styles.actionIcon}>
            <i className="fi fi-rr-id-card-clip-alt" />
          </div>
          <span className={styles.actionLabel}>Employees</span>
        </button>
        <button className={styles.actionBtn} onClick={() => navigate('/admin/jobs')}>
          <div className={styles.actionIcon}>
            <i className="fi fi-rr-map-marker" />
          </div>
          <span className={styles.actionLabel}>Jobs</span>
        </button>
      </nav>

      {/* ── Main ── */}
      <main className={styles.main}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Loading today's data…</span>
          </div>
        ) : (
          <>

            {/* Coverage Card */}
            <div className={styles.coverageCard}>
              <div className={styles.coverageLeft}>
                <div className={styles.coverageNumber}>
                  {stats?.checked_in_today || 0}
                  <span className={styles.coverageOf}>/{allEmployees.length}</span>
                </div>
                <div className={styles.coverageLabel}>workers checked in today</div>
                <div className={styles.coveragePill} style={{ '--ring-color': ringColor }}>
                  {coveragePct === 100 ? (
                    <><i className="fi fi-sr-check-circle" /> Full coverage</>
                  ) : coveragePct >= 75 ? (
                    <><i className="fi fi-rr-clock" /> {100 - coveragePct}% outstanding</>
                  ) : (
                    <><i className="fi fi-rr-triangle-warning" /> {missing.length} missing</>
                  )}
                </div>
              </div>
              <div className={styles.coverageRing}>
                <svg viewBox="0 0 36 36" className={styles.ringsvg}>
                  <circle
                    cx="18" cy="18" r={radius}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="18" cy="18" r={radius}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="2.5"
                    strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
                    strokeDashoffset={circumference * 0.25}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={styles.ringPct}>{coveragePct}%</span>
              </div>
            </div>

            {/* Code Breakdown */}
            {stats?.entries_by_code?.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Today by Classification</h2>
                </div>
                <div className={styles.codeGrid}>
                  {stats.entries_by_code.map(group => (
                    <div
                      key={group.code}
                      className={styles.codeCard}
                      style={{ '--col': group.color }}
                    >
                      <div className={styles.codeCardTop}>
                        <span className={styles.codeCardBadge}>{group.code}</span>
                        <span className={styles.codeCardCount}>{group.count}</span>
                      </div>
                      <p className={styles.codeCardDesc}>{group.description}</p>
                      <p className={styles.codeCardHours}>{group.total_hours.toFixed(1)} hrs</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing employees */}
            {missing.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Not Yet Checked In</h2>
                  <span className={styles.dangerBadge}>
                    <i className="fi fi-rr-exclamation" />
                    {missing.length}
                  </span>
                </div>
                <div className={styles.listCard}>
                  {missing.map(emp => (
                    <div key={emp.id} className={styles.listRow}>
                      <div className={styles.avatar}>
                        {emp.first_name[0]}{emp.last_name[0]}
                      </div>
                      <span className={styles.listName}>
                        {emp.first_name} {emp.last_name}
                      </span>
                      <span className={styles.missingTag}>
                        <i className="fi fi-rr-circle" />
                        Missing
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent check-ins */}
            {stats?.recent_entries?.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Recent Check-ins</h2>
                  <span className={styles.successBadge}>
                    <i className="fi fi-sr-check-circle" />
                    {stats.recent_entries.length}
                  </span>
                </div>
                <div className={styles.listCard}>
                  {stats.recent_entries.map(entry => (
                    <div key={entry.id} className={styles.entryRow}>
                      <div className={styles.entryLeft}>
                        <span
                          className={styles.entryCodePill}
                          style={{ background: entry.wc_code?.color }}
                        >
                          {entry.wc_code?.code}
                        </span>
                        <div>
                          <p className={styles.entryName}>
                            {entry.employee?.first_name} {entry.employee?.last_name}
                          </p>
                          {entry.job && (
                            <p className={styles.entryJob}>
                              <i className="fi fi-rr-map-marker" />
                              {entry.job.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={styles.entryHours}>{entry.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {stats?.checked_in_today === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIconWrap}>
                  <i className="fi fi-rr-user-check" />
                </div>
                <p className={styles.emptyTitle}>No check-ins yet today</p>
                <p className={styles.emptyText}>
                  Employees will appear here once they submit their classification.
                </p>
                <button className={styles.emptyBtn} onClick={() => navigate('/foreman')}>
                  <i className="fi fi-rr-users" />
                  Assign Crew Now
                </button>
              </div>
            )}

          </>
        )}
      </main>
    </div>
  )
}