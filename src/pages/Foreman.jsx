import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { employees, wcCodes, jobs, entries, auth } from '../services/api'
import styles from './Foreman.module.css'

const today = new Date().toISOString().split('T')[0]

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })
}

export default function Foreman() {
  const navigate = useNavigate()
  const currentEmployee = auth.getEmployee()

  const [empList, setEmpList] = useState([])
  const [codeList, setCodeList] = useState([])
  const [jobList, setJobList] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [step, setStep] = useState('crew')   // crew | code | job | hours | done
  const [chosenCode, setChosenCode] = useState(null)
  const [chosenJob, setChosenJob] = useState(null)
  const [hours, setHours] = useState('8')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    Promise.all([employees.list(), wcCodes.list(), jobs.list()])
      .then(([emps, codes, js]) => {
        setEmpList(emps.filter(e => e.role === 'worker'))
        setCodeList(codes)
        setJobList(js)
      })
  }, [])

  function toggleEmployee(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() { setSelected(new Set(empList.map(e => e.id))) }
  function clearAll() { setSelected(new Set()) }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const created = await entries.bulkCreate({
        employee_ids: Array.from(selected),
        wc_code_id: chosenCode.id,
        job_id: chosenJob?.id || null,
        entry_date: today,
        hours: parseFloat(hours),
      })
      setResults(created)
      setStep('done')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setSelected(new Set())
    setChosenCode(null)
    setChosenJob(null)
    setHours('8')
    setStep('crew')
    setError('')
    setResults([])
  }

  function handleLogout() {
    auth.logout()
    navigate('/login')
  }

  const selectedEmployees = empList.filter(e => selected.has(e.id))
  const stepIndex = { crew: 1, code: 2, job: 3, hours: 4, done: 4 }[step]

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.backNav} onClick={() => navigate('/dashboard')}>
            <i className="fi fi-rr-arrow-left" />
            Dashboard
          </button>
          <div className={styles.logoText}>
            TrackWC<span className={styles.logoAccent}>.io</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <i className="fi fi-rr-sign-out-alt" />
            Sign out
          </button>
        </div>
        <div className={styles.headerBottom}>
          <div>
            <h1 className={styles.title}>Crew Assignment</h1>
            <p className={styles.date}>{formatDate(today)}</p>
          </div>
          {step !== 'done' && (
            <div className={styles.crewCountBadge}>
              <i className="fi fi-rr-users" />
              {selected.size > 0 ? `${selected.size} selected` : 'No crew yet'}
            </div>
          )}
        </div>
      </header>

      {/* ── Step Progress ── */}
      {step !== 'done' && (
        <div className={styles.progress}>
          {['Crew', 'Classification', 'Job Site', 'Hours'].map((label, i) => (
            <div
              key={label}
              className={`${styles.progressStep} ${i + 1 === stepIndex ? styles.progressActive : ''} ${i + 1 < stepIndex ? styles.progressDone : ''}`}
            >
              <div className={styles.progressDot}>
                {i + 1 < stepIndex
                  ? <i className="fi fi-sr-check" />
                  : i + 1
                }
              </div>
              <span className={styles.progressLabel}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Main ── */}
      <main className={styles.main}>

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className={styles.doneBlock}>
            <div className={styles.doneIconWrap}>
              <i className="fi fi-sr-check-circle" />
            </div>
            <h2 className={styles.doneTitle}>{results.length} employees assigned</h2>
            <p className={styles.doneSub}>Entries saved for today</p>

            <div className={styles.doneSummary} style={{ borderColor: chosenCode?.color }}>
              <div className={styles.doneSummaryRow}>
                <span className={styles.doneSummaryLabel}>Classification</span>
                <span className={styles.doneCodePill} style={{ background: chosenCode?.color }}>
                  {chosenCode?.code}
                </span>
              </div>
              <div className={styles.doneSummaryRow}>
                <span className={styles.doneSummaryLabel}>Description</span>
                <span className={styles.doneSummaryVal}>{chosenCode?.description}</span>
              </div>
              {chosenJob && (
                <div className={styles.doneSummaryRow}>
                  <span className={styles.doneSummaryLabel}>Job site</span>
                  <span className={styles.doneSummaryVal}>
                    <i className="fi fi-rr-map-marker" style={{ fontSize: '0.75rem', marginRight: 4 }} />
                    {chosenJob.name}
                  </span>
                </div>
              )}
              <div className={`${styles.doneSummaryRow} ${styles.doneSummaryHours}`}>
                <span className={styles.doneSummaryLabel}>Hours each</span>
                <span className={styles.doneHoursVal}>{hours}h</span>
              </div>
            </div>

            <div className={styles.doneNames}>
              {selectedEmployees.map(e => (
                <span key={e.id} className={styles.namePill}>
                  {e.first_name} {e.last_name}
                </span>
              ))}
            </div>

            <button className={styles.submitBtn} onClick={reset}>
              <i className="fi fi-rr-users" />
              Assign another crew
            </button>
            <button className={styles.secondaryBtn} onClick={() => navigate('/dashboard')}>
              <i className="fi fi-rr-house-chimney" />
              View Dashboard
            </button>
          </div>
        )}

        {/* ── STEP 1: Select Crew ── */}
        {step === 'crew' && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Who's on the crew today?</h2>
              <div className={styles.selectActions}>
                <button className={styles.linkBtn} onClick={selectAll}>Select all</button>
                <span className={styles.dot}>·</span>
                <button className={styles.linkBtn} onClick={clearAll}>Clear</button>
              </div>
            </div>

            <div className={styles.empList}>
              {empList.map(emp => {
                const isSelected = selected.has(emp.id)
                return (
                  <button
                    key={emp.id}
                    className={`${styles.empRow} ${isSelected ? styles.empRowSelected : ''}`}
                    onClick={() => toggleEmployee(emp.id)}
                  >
                    <div className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ''}`}>
                      {isSelected && <i className="fi fi-sr-check" />}
                    </div>
                    <div className={styles.empAvatar}>
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div className={styles.empInfo}>
                      <span className={styles.empName}>{emp.first_name} {emp.last_name}</span>
                      <span className={styles.empDefault}>
                        {emp.eligible_codes?.[0]?.code
                          ? `Default: ${emp.eligible_codes[0].code}`
                          : 'No default code'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Sticky footer bar */}
            <div className={styles.stickyBar}>
              <div className={styles.selectedCount}>
                {selected.size > 0
                  ? <><strong>{selected.size}</strong> employee{selected.size !== 1 ? 's' : ''} selected</>
                  : 'Select employees above'
                }
              </div>
              <button
                className={styles.submitBtn}
                disabled={selected.size === 0}
                onClick={() => setStep('code')}
              >
                Next
                <i className="fi fi-rr-angle-right" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: WC Code ── */}
        {step === 'code' && (
          <div className={styles.section}>
            <button className={styles.backBtn} onClick={() => setStep('crew')}>
              <i className="fi fi-rr-arrow-left" />
              Back
            </button>

            <div className={styles.crewPills}>
              {selectedEmployees.slice(0, 5).map(e => (
                <span key={e.id} className={styles.namePill}>{e.first_name}</span>
              ))}
              {selectedEmployees.length > 5 && (
                <span className={styles.namePillMore}>+{selectedEmployees.length - 5} more</span>
              )}
            </div>

            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>What classification today?</h2>
            </div>

            <div className={styles.codeList}>
              {codeList.map(code => (
                <button
                  key={code.id}
                  className={styles.codeRow}
                  style={{ '--col': code.color }}
                  onClick={() => { setChosenCode(code); setStep('job') }}
                >
                  <span className={styles.codeBadge}>{code.code}</span>
                  <span className={styles.codeDesc}>{code.description}</span>
                  <i className="fi fi-rr-angle-right" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Job Site ── */}
        {step === 'job' && (
          <div className={styles.section}>
            <button className={styles.backBtn} onClick={() => setStep('code')}>
              <i className="fi fi-rr-arrow-left" />
              Back
            </button>

            <div className={styles.selectedBanner} style={{ '--code-color': chosenCode?.color }}>
              <span className={styles.selectedCodePill}>{chosenCode?.code}</span>
              <span className={styles.selectedDesc}>{chosenCode?.description}</span>
            </div>

            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Which job site?</h2>
            </div>

            <div className={styles.jobList}>
              {jobList.map(job => (
                <button
                  key={job.id}
                  className={`${styles.jobRow} ${chosenJob?.id === job.id ? styles.jobRowSelected : ''}`}
                  onClick={() => { setChosenJob(job); setStep('hours') }}
                >
                  <div className={styles.jobRowLeft}>
                    <div className={styles.jobIconWrap}>
                      <i className="fi fi-rr-map-marker" />
                    </div>
                    <span className={styles.jobName}>{job.name}</span>
                  </div>
                  {job.job_number && (
                    <span className={styles.jobNum}>#{job.job_number}</span>
                  )}
                </button>
              ))}
              <button className={styles.skipBtn} onClick={() => { setChosenJob(null); setStep('hours') }}>
                <i className="fi fi-rr-circle-xmark" />
                No specific job site
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Hours + Confirm ── */}
        {step === 'hours' && (
          <div className={styles.section}>
            <button className={styles.backBtn} onClick={() => setStep('job')}>
              <i className="fi fi-rr-arrow-left" />
              Back
            </button>

            <div className={styles.selectedBanner} style={{ '--code-color': chosenCode?.color }}>
              <span className={styles.selectedCodePill}>{chosenCode?.code}</span>
              <span className={styles.selectedDesc}>{chosenCode?.description}</span>
              {chosenJob && (
                <span className={styles.selectedJob}>
                  <i className="fi fi-rr-map-marker" />
                  {chosenJob.name}
                </span>
              )}
            </div>

            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Hours for each employee</h2>
            </div>

            <div className={styles.hoursRow}>
              {['4', '6', '8', '10', '12'].map(h => (
                <button
                  key={h}
                  className={`${styles.hoursBtn} ${hours === h ? styles.hoursBtnActive : ''}`}
                  onClick={() => setHours(h)}
                >
                  {h}h
                </button>
              ))}
            </div>

            <div className={styles.hoursCustom}>
              <label className={styles.customLabel}>
                <i className="fi fi-rr-pencil" />
                Custom hours
              </label>
              <input
                type="number"
                className={styles.hoursInput}
                value={hours}
                min="0.5"
                max="24"
                step="0.5"
                onChange={e => setHours(e.target.value)}
              />
            </div>

            {/* Summary card */}
            <div className={styles.confirmBox}>
              <div className={styles.confirmTitle}>
                <i className="fi fi-rr-document" />
                Assignment summary
              </div>
              <div className={styles.confirmRow}>
                <span>Employees</span>
                <strong>{selected.size} workers</strong>
              </div>
              <div className={styles.confirmRow}>
                <span>Classification</span>
                <strong>{chosenCode?.code} — {chosenCode?.description}</strong>
              </div>
              {chosenJob && (
                <div className={styles.confirmRow}>
                  <span>Job site</span>
                  <strong>{chosenJob.name}</strong>
                </div>
              )}
              <div className={styles.confirmRow}>
                <span>Hours each</span>
                <strong className={styles.confirmHours}>{hours}h</strong>
              </div>
              <div className={styles.confirmRow}>
                <span>Date</span>
                <strong>{today}</strong>
              </div>
            </div>

            {error && (
              <div className={styles.errorRow}>
                <i className="fi fi-rr-circle-xmark" />
                {error}
              </div>
            )}

            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  Saving…
                </>
              ) : (
                <>
                  <i className="fi fi-sr-check-circle" />
                  Assign {selected.size} employee{selected.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        )}

      </main>
    </div>
  )
}