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
  const [step, setStep] = useState('code')       // code | job | hours | confirm | done
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(!navigator.onLine)
  const [queueCount, setQueueCount] = useState(offlineQueue.count())

  useEffect(() => {
    wcCodes.list().then(data => {
      // Filter to only eligible codes for this employee
      const eligible = employee?.eligible_codes?.map(c => c.id) || []
      const filtered = eligible.length
        ? data.filter(c => eligible.includes(c.id))
        : data
      setCodes(filtered)
    })
    jobs.list().then(setJobList)

    const handleOnline = () => {
      setOffline(false)
      // Auto-sync when back online
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

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.logo}>TrackWC</span>
          <div className={styles.headerRight}>
            {offline && <span className={styles.offlineBadge}>● Offline</span>}
            {queueCount > 0 && (
              <span className={styles.queueBadge}>{queueCount} pending</span>
            )}
          </div>
        </div>
        <p className={styles.dateLabel}>{formatDate(today)}</p>
        <p className={styles.workerName}>
          {employee?.first_name} {employee?.last_name}
        </p>
      </header>

      <main className={styles.main}>

        {/* DONE STATE */}
        {step === 'done' && (
          <div className={styles.doneCard}>
            <div className={styles.doneIcon}>✓</div>
            <h2 className={styles.doneTitle}>Checked In!</h2>
            <div className={styles.doneSummary} style={{ borderColor: selectedCode?.color }}>
              <span className={styles.doneCode} style={{ color: selectedCode?.color }}>
                {selectedCode?.code}
              </span>
              <span className={styles.doneDesc}>{selectedCode?.description}</span>
              {selectedJob && <span className={styles.doneJob}>📍 {selectedJob.name}</span>}
              <span className={styles.doneHours}>{hours} hrs</span>
            </div>
            {offline && (
              <p className={styles.offlineNote}>
                Saved offline — will sync when you're back in range.
              </p>
            )}
            <button className={styles.btnSecondary} onClick={reset}>
              Change classification
            </button>
          </div>
        )}

        {/* STEP 1: Select WC Code */}
        {step === 'code' && (
          <div className={styles.step}>
            <h2 className={styles.stepTitle}>What are you doing today?</h2>
            <p className={styles.stepSubtitle}>Select your work classification</p>
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
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Select Job */}
        {step === 'job' && (
          <div className={styles.step}>
            <button className={styles.backBtn} onClick={() => setStep('code')}>
              ← Back
            </button>
            <div className={styles.selectedBanner} style={{ background: selectedCode?.color }}>
              <span className={styles.selectedCode}>{selectedCode?.code}</span>
              <span className={styles.selectedDesc}>{selectedCode?.description}</span>
            </div>
            <h2 className={styles.stepTitle}>Which job?</h2>
            <div className={styles.jobList}>
              {jobList.map(job => (
                <button
                  key={job.id}
                  className={`${styles.jobBtn} ${selectedJob?.id === job.id ? styles.jobBtnSelected : ''}`}
                  onClick={() => { setSelectedJob(job); setStep('hours') }}
                >
                  <span className={styles.jobName}>{job.name}</span>
                  {job.job_number && (
                    <span className={styles.jobNumber}>#{job.job_number}</span>
                  )}
                </button>
              ))}
              <button
                className={styles.jobBtnSkip}
                onClick={() => { setSelectedJob(null); setStep('hours') }}
              >
                Skip — no specific job
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Hours */}
        {step === 'hours' && (
          <div className={styles.step}>
            <button className={styles.backBtn} onClick={() => setStep('job')}>
              ← Back
            </button>
            <div className={styles.selectedBanner} style={{ background: selectedCode?.color }}>
              <span className={styles.selectedCode}>{selectedCode?.code}</span>
              <span className={styles.selectedDesc}>{selectedCode?.description}</span>
            </div>
            <h2 className={styles.stepTitle}>How many hours?</h2>
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
              <label className={styles.customLabel}>Custom hours</label>
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

            {error && <p className={styles.error}>{error}</p>}

            <button
              className={styles.btnPrimary}
              onClick={handleSubmit}
              disabled={loading || !hours}
            >
              {loading ? 'Saving...' : `Confirm — ${selectedCode?.code}, ${hours}h`}
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
