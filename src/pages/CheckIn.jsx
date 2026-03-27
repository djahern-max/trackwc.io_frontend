import { useState, useEffect } from 'react'
import { wcCodes, jobs, entries, offlineQueue, auth } from '../services/api'
import styles from './CheckIn.module.css'

const today = new Date().toISOString().split('T')[0]

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })
}

export default function CheckIn() {
  const employee = auth.getEmployee()
  const [codes, setCodes] = useState([])
  const [jobList, setJobList] = useState([])
  const [selectedCode, setSelectedCode] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [hours, setHours] = useState('8')
  const [step, setStep] = useState('code')   // code | job | hours | done
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(!navigator.onLine)
  const [queueCount, setQueueCount] = useState(offlineQueue.count())

  useEffect(() => {
    wcCodes.list().then(data => {
      const eligible = employee?.eligible_codes?.map(c => c.id) || []
      const filtered = eligible.length
        ? data.filter(c => eligible.includes(c.id))
        : data
      setCodes(filtered)
    })
    jobs.list().then(setJobList)

    const handleOnline = () => {
      setOffline(false)
      entries.syncOffline().then(({ synced }) => {
        if (synced > 0) setQueueCount(0)
      })
    }
    const handleOffline = () => setOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const payload = {
        employee_id: employee.id,
        wc_code_id: selectedCode.id,
        job_id: selectedJob?.id || null,
        entry_date: today,
        hours: parseFloat(hours),
      }
      const result = await entries.create(payload)
      if (result._offline) setQueueCount(q => q + 1)
      setStep('done')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setSelectedCode(null)
    setSelectedJob(null)
    setHours('8')
    setStep('code')
    setError('')
  }

  // Step indicator (1–3 for the active flow)
  const stepIndex = { code: 1, job: 2, hours: 3, done: 3 }[step]

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.workerInfo}>
            <div className={styles.avatar}>
              {employee?.first_name?.[0]}{employee?.last_name?.[0]}
            </div>
            <div>
              <div className={styles.workerName}>
                {employee?.first_name} {employee?.last_name}
              </div>
              <div className={styles.dateLabel}>{formatDate(today)}</div>
            </div>
          </div>
          <div className={styles.headerBadges}>
            {offline && (
              <span className={styles.offlineBadge}>
                <i className="fi fi-rr-wifi-slash" />
                Offline
              </span>
            )}
            {queueCount > 0 && (
              <span className={styles.queueBadge}>
                <i className="fi fi-rr-clock" />
                {queueCount} pending
              </span>
            )}
          </div>
        </div>

        {/* Step progress — only show during active flow */}
        {step !== 'done' && (
          <div className={styles.progress}>
            {['Classification', 'Job Site', 'Hours'].map((label, i) => (
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
      </header>

      {/* ── Main ── */}
      <main className={styles.main}>

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className={styles.doneCard}>
            <div className={styles.doneIconWrap}>
              <i className="fi fi-sr-check-circle" />
            </div>
            <h2 className={styles.doneTitle}>You're checked in!</h2>
            <p className={styles.doneSub}>Entry saved for today</p>

            <div className={styles.doneSummary} style={{ borderColor: selectedCode?.color }}>
              <div className={styles.doneSummaryRow}>
                <span className={styles.doneSummaryLabel}>Classification</span>
                <span
                  className={styles.doneCodePill}
                  style={{ background: selectedCode?.color }}
                >
                  {selectedCode?.code}
                </span>
              </div>
              <div className={styles.doneSummaryRow}>
                <span className={styles.doneSummaryLabel}>Description</span>
                <span className={styles.doneSummaryVal}>{selectedCode?.description}</span>
              </div>
              {selectedJob && (
                <div className={styles.doneSummaryRow}>
                  <span className={styles.doneSummaryLabel}>Job site</span>
                  <span className={styles.doneSummaryVal}>
                    <i className="fi fi-rr-map-marker" style={{ fontSize: '0.75rem', marginRight: 4 }} />
                    {selectedJob.name}
                  </span>
                </div>
              )}
              <div className={`${styles.doneSummaryRow} ${styles.doneSummaryHours}`}>
                <span className={styles.doneSummaryLabel}>Hours logged</span>
                <span className={styles.doneHoursVal}>{hours}h</span>
              </div>
            </div>

            {offline && (
              <div className={styles.offlineNote}>
                <i className="fi fi-rr-wifi-slash" />
                Saved offline — will sync when back in range
              </div>
            )}

            <button className={styles.changeBtn} onClick={reset}>
              <i className="fi fi-rr-pencil" />
              Change classification
            </button>
          </div>
        )}

        {/* ── STEP 1: WC Code ── */}
        {step === 'code' && (
          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>What are you doing today?</h2>
              <p className={styles.stepSubtitle}>Select your work classification</p>
            </div>
            <div className={styles.codeGrid}>
              {codes.map(code => (
                <button
                  key={code.id}
                  className={styles.codeBtn}
                  style={{ '--code-color': code.color }}
                  onClick={() => { setSelectedCode(code); setStep('job') }}
                >
                  <span className={styles.codeBadge}>{code.code}</span>
                  <span className={styles.codeLabel}>{code.description}</span>
                  <i className="fi fi-rr-angle-right" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Job Site ── */}
        {step === 'job' && (
          <div className={styles.step}>
            <button className={styles.backBtn} onClick={() => setStep('code')}>
              <i className="fi fi-rr-arrow-left" />
              Back
            </button>

            <div className={styles.selectedBanner} style={{ '--code-color': selectedCode?.color }}>
              <span className={styles.selectedCodePill}>{selectedCode?.code}</span>
              <span className={styles.selectedDesc}>{selectedCode?.description}</span>
            </div>

            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>Which job site?</h2>
            </div>

            <div className={styles.jobList}>
              {jobList.map(job => (
                <button
                  key={job.id}
                  className={`${styles.jobBtn} ${selectedJob?.id === job.id ? styles.jobBtnSelected : ''}`}
                  onClick={() => { setSelectedJob(job); setStep('hours') }}
                >
                  <div className={styles.jobBtnLeft}>
                    <div className={styles.jobIconWrap}>
                      <i className="fi fi-rr-map-marker" />
                    </div>
                    <span className={styles.jobName}>{job.name}</span>
                  </div>
                  {job.job_number && (
                    <span className={styles.jobNumber}>#{job.job_number}</span>
                  )}
                </button>
              ))}

              <button
                className={styles.skipBtn}
                onClick={() => { setSelectedJob(null); setStep('hours') }}
              >
                <i className="fi fi-rr-circle-xmark" />
                No specific job site
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Hours ── */}
        {step === 'hours' && (
          <div className={styles.step}>
            <button className={styles.backBtn} onClick={() => setStep('job')}>
              <i className="fi fi-rr-arrow-left" />
              Back
            </button>

            <div className={styles.selectedBanner} style={{ '--code-color': selectedCode?.color }}>
              <span className={styles.selectedCodePill}>{selectedCode?.code}</span>
              <span className={styles.selectedDesc}>{selectedCode?.description}</span>
              {selectedJob && (
                <span className={styles.selectedJob}>
                  <i className="fi fi-rr-map-marker" />
                  {selectedJob.name}
                </span>
              )}
            </div>

            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>How many hours?</h2>
            </div>

            <div className={styles.hoursGrid}>
              {['4', '6', '8', '10', '12'].map(h => (
                <button
                  key={h}
                  className={`${styles.hoursBtn} ${hours === h ? styles.hoursBtnSelected : ''}`}
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

            {error && (
              <div className={styles.errorRow}>
                <i className="fi fi-rr-circle-xmark" />
                {error}
              </div>
            )}

            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={loading || !hours}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  Saving…
                </>
              ) : (
                <>
                  <i className="fi fi-sr-check-circle" />
                  Confirm — {selectedCode?.code}, {hours}h
                </>
              )}
            </button>
          </div>
        )}

      </main>
    </div>
  )
}