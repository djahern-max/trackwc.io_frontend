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
  const [step, setStep] = useState('crew')       // crew | code | job | hours | confirm | done
  const [chosenCode, setChosenCode] = useState(null)
  const [chosenJob, setChosenJob] = useState(null)
  const [hours, setHours] = useState('8')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    Promise.all([employees.list(), wcCodes.list(), jobs.list()])
      .then(([emps, codes, js]) => {
        // Only show workers (not foremen/admins)
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

  function selectAll() {
    setSelected(new Set(empList.map(e => e.id)))
  }

  function clearAll() {
    setSelected(new Set())
  }

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

  const selectedEmployees = empList.filter(e => selected.has(e.id))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.backNav} onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <span className={styles.logo}>TrackWC</span>
        </div>
        <h1 className={styles.title}>Crew Assignment</h1>
        <p className={styles.date}>{formatDate(today)}</p>
      </header>

      {/* Step indicator */}
      <div className={styles.steps}>
        {['Crew', 'Code', 'Job', 'Hours'].map((label, i) => {
          const stepOrder = ['crew', 'code', 'job', 'hours', 'confirm', 'done']
          const currentIdx = stepOrder.indexOf(step)
          const isActive = i === Math.min(currentIdx, 3)
          const isDone = i < currentIdx && currentIdx < 5
          return (
            <div key={label} className={`${styles.stepPip} ${isActive ? styles.stepActive : ''} ${isDone ? styles.stepDone : ''}`}>
              <span className={styles.stepNum}>{isDone ? '✓' : i + 1}</span>
              <span className={styles.stepLabel}>{label}</span>
            </div>
          )
        })}
      </div>

      <main className={styles.main}>

        {/* DONE */}
        {step === 'done' && (
          <div className={styles.doneBlock}>
            <div className={styles.doneIcon}>✓</div>
            <h2 className={styles.doneTitle}>{results.length} employees assigned</h2>
            <div className={styles.doneSummary}>
              <div className={styles.doneLine}>
                <span className={styles.doneCodeBadge} style={{ background: chosenCode?.color }}>
                  {chosenCode?.code}
                </span>
                <span className={styles.doneCodeDesc}>{chosenCode?.description}</span>
              </div>
              {chosenJob && <p className={styles.doneJob}>📍 {chosenJob.name}</p>}
              <p className={styles.doneHours}>{hours} hours each</p>
            </div>
            <div className={styles.doneNames}>
              {selectedEmployees.map(e => (
                <span key={e.id} className={styles.namePill}>
                  {e.first_name} {e.last_name}
                </span>
              ))}
            </div>
            <button className={styles.btnPrimary} onClick={reset}>
              Assign another crew
            </button>
            <button className={styles.btnSecondary} onClick={() => navigate('/dashboard')}>
              View Dashboard
            </button>
          </div>
        )}

        {/* STEP 1: Select Crew */}
        {step === 'crew' && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Who's on the crew today?</h2>
              <div className={styles.selectActions}>
                <button className={styles.linkBtn} onClick={selectAll}>All</button>
                <span className={styles.divider}>·</span>
                <button className={styles.linkBtn} onClick={clearAll}>None</button>
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
                      {isSelected && <span>✓</span>}
                    </div>
                    <div className={styles.empInfo}>
                      <span className={styles.empName}>{emp.first_name} {emp.last_name}</span>
                      {emp.default_wc_code_id && (
                        <span className={styles.empDefault}>
                          Default: {emp.eligible_codes?.[0]?.code || '—'}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className={styles.stickyBar}>
              <div className={styles.selectedCount}>
                {selected.size > 0
                  ? `${selected.size} employee${selected.size !== 1 ? 's' : ''} selected`
                  : 'Select employees above'}
              </div>
              <button
                className={styles.btnPrimary}
                disabled={selected.size === 0}
                onClick={() => setStep('code')}
              >
                Next: Choose Code →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: WC Code */}
        {step === 'code' && (
          <div className={styles.section}>
            <button className={styles.backBtn} onClick={() => setStep('crew')}>← Back</button>
            <div className={styles.crewPills}>
              {selectedEmployees.slice(0, 5).map(e => (
                <span key={e.id} className={styles.namePill}>{e.first_name}</span>
              ))}
              {selectedEmployees.length > 5 && (
                <span className={styles.namePillMore}>+{selectedEmployees.length - 5}</span>
              )}
            </div>
            <h2 className={styles.sectionTitle}>What classification today?</h2>
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
                  <span className={styles.codeArrow}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Job */}
        {step === 'job' && (
          <div className={styles.section}>
            <button className={styles.backBtn} onClick={() => setStep('code')}>← Back</button>
            <div className={styles.codeBanner} style={{ background: chosenCode?.color }}>
              <span className={styles.bannerCode}>{chosenCode?.code}</span>
              <span className={styles.bannerDesc}>{chosenCode?.description}</span>
            </div>
            <h2 className={styles.sectionTitle}>Which job?</h2>
            <div className={styles.jobList}>
              {jobList.map(job => (
                <button
                  key={job.id}
                  className={`${styles.jobRow} ${chosenJob?.id === job.id ? styles.jobRowSelected : ''}`}
                  onClick={() => { setChosenJob(job); setStep('hours') }}
                >
                  <span className={styles.jobName}>{job.name}</span>
                  {job.job_number && <span className={styles.jobNum}>#{job.job_number}</span>}
                </button>
              ))}
              <button className={styles.skipRow} onClick={() => { setChosenJob(null); setStep('hours') }}>
                No specific job
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Hours + Confirm */}
        {step === 'hours' && (
          <div className={styles.section}>
            <button className={styles.backBtn} onClick={() => setStep('job')}>← Back</button>
            <div className={styles.codeBanner} style={{ background: chosenCode?.color }}>
              <span className={styles.bannerCode}>{chosenCode?.code}</span>
              <span className={styles.bannerDesc}>{chosenCode?.description}</span>
            </div>

            <h2 className={styles.sectionTitle}>Hours for each employee</h2>
            <div className={styles.hoursRow}>
              {['4','6','8','10','12'].map(h => (
                <button
                  key={h}
                  className={`${styles.hoursBtn} ${hours === h ? styles.hoursBtnActive : ''}`}
                  onClick={() => setHours(h)}
                >
                  {h}h
                </button>
              ))}
            </div>
            <input
              type="number"
              className={styles.hoursInput}
              value={hours}
              min="0.5" max="24" step="0.5"
              onChange={e => setHours(e.target.value)}
            />

            {/* Summary */}
            <div className={styles.confirmBox}>
              <h3 className={styles.confirmTitle}>Summary</h3>
              <div className={styles.confirmRow}>
                <span>Employees</span>
                <strong>{selected.size}</strong>
              </div>
              <div className={styles.confirmRow}>
                <span>Code</span>
                <strong>{chosenCode?.code} — {chosenCode?.description}</strong>
              </div>
              {chosenJob && (
                <div className={styles.confirmRow}>
                  <span>Job</span>
                  <strong>{chosenJob.name}</strong>
                </div>
              )}
              <div className={styles.confirmRow}>
                <span>Hours each</span>
                <strong>{hours}h</strong>
              </div>
              <div className={styles.confirmRow}>
                <span>Date</span>
                <strong>{today}</strong>
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              className={styles.btnPrimary}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Saving...' : `Assign ${selected.size} employees`}
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
