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
  const [tab, setTab] = useState('today')   // today | history

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

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <span className={styles.logo}>TrackWC</span>
            <p className={styles.subtitle}>Admin Dashboard</p>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
        <p className={styles.dateLabel}>{formatDate(today)}</p>
      </header>

      {/* Quick Actions */}
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={() => navigate('/foreman')}>
          <span className={styles.actionIcon}>👷</span>
          <span className={styles.actionLabel}>Assign Crew</span>
        </button>
        <button className={styles.actionBtn} onClick={() => navigate('/reports')}>
          <span className={styles.actionIcon}>📋</span>
          <span className={styles.actionLabel}>Export Report</span>
        </button>
        <button className={styles.actionBtn} onClick={() => navigate('/admin/employees')}>
          <span className={styles.actionIcon}>👥</span>
          <span className={styles.actionLabel}>Employees</span>
        </button>
        <button className={styles.actionBtn} onClick={() => navigate('/admin/jobs')}>
          <span className={styles.actionIcon}>📍</span>
          <span className={styles.actionLabel}>Jobs</span>
        </button>
      </div>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>Loading today's data...</div>
        ) : (
          <>
            {/* Coverage Card */}
            <div className={styles.coverageCard}>
              <div className={styles.coverageLeft}>
                <p className={styles.coverageNumber}>{stats?.checked_in_today || 0}</p>
                <p className={styles.coverageLabel}>of {allEmployees.length} checked in</p>
              </div>
              <div className={styles.coverageRight}>
                <div className={styles.coverageRing}>
                  <svg viewBox="0 0 36 36" className={styles.ringsvg}>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3"/>
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={coveragePct === 100 ? '#22c55e' : coveragePct >= 75 ? '#f97316' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray={`${coveragePct} ${100 - coveragePct}`}
                      strokeDashoffset="25"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className={styles.ringPct}>{coveragePct}%</span>
                </div>
              </div>
            </div>

            {/* Code Breakdown */}
            {stats?.entries_by_code?.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Today by Classification</h3>
                <div className={styles.codeBreakdown}>
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
                <div className={styles.sectionHead}>
                  <h3 className={styles.sectionTitle}>Not Yet Checked In</h3>
                  <span className={styles.missingCount}>{missing.length}</span>
                </div>
                <div className={styles.missingList}>
                  {missing.map(emp => (
                    <div key={emp.id} className={styles.missingRow}>
                      <div className={styles.avatar}>
                        {emp.first_name[0]}{emp.last_name[0]}
                      </div>
                      <span className={styles.missingName}>
                        {emp.first_name} {emp.last_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent entries */}
            {stats?.recent_entries?.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Recent Check-ins</h3>
                <div className={styles.entryList}>
                  {stats.recent_entries.map(entry => (
                    <div key={entry.id} className={styles.entryRow}>
                      <div className={styles.entryLeft}>
                        <span
                          className={styles.entryCode}
                          style={{ background: entry.wc_code?.color }}
                        >
                          {entry.wc_code?.code}
                        </span>
                        <div>
                          <p className={styles.entryName}>
                            {entry.employee?.first_name} {entry.employee?.last_name}
                          </p>
                          {entry.job && (
                            <p className={styles.entryJob}>{entry.job.name}</p>
                          )}
                        </div>
                      </div>
                      <span className={styles.entryHours}>{entry.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats?.checked_in_today === 0 && (
              <div className={styles.emptyState}>
                <p className={styles.emptyIcon}>📋</p>
                <p className={styles.emptyTitle}>No check-ins yet today</p>
                <p className={styles.emptyText}>
                  Employees will appear here once they submit their classification.
                </p>
                <button className={styles.btnPrimary} onClick={() => navigate('/foreman')}>
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
