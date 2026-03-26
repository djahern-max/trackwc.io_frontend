import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { reports } from '../services/api'
import styles from './Reports.module.css'

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

const QUICK_RANGES = [
  { label: 'This Month',  getDates: () => {
    const now = new Date()
    return [
      new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    ]
  }},
  { label: 'Last Month', getDates: () => {
    const now = new Date()
    return [
      new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
      new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
    ]
  }},
  { label: 'This Year', getDates: () => {
    const y = new Date().getFullYear()
    return [`${y}-01-01`, `${y}-12-31`]
  }},
  { label: 'Policy Period', getDates: () => ['2024-05-04', '2025-05-04'] },
]

export default function Reports() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState('')

  function applyRange(getDates) {
    const [s, e] = getDates()
    setStartDate(s)
    setEndDate(e)
    setSummary(null)
  }

  async function fetchSummary() {
    if (!startDate || !endDate) return
    setLoading(true)
    setError('')
    try {
      const data = await reports.auditSummary(startDate, endDate)
      setSummary(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function downloadPDF() {
    setPdfLoading(true)
    try {
      reports.downloadPDF(startDate, endDate)
    } finally {
      setTimeout(() => setPdfLoading(false), 1500)
    }
  }

  const totalHours = summary?.code_summaries?.reduce((acc, c) => acc + c.total_hours, 0) || 0

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <span className={styles.logo}>TrackWC</span>
        </div>
        <h1 className={styles.title}>Audit Report</h1>
        <p className={styles.subtitle}>AmTrust Workers' Comp Format</p>
      </header>

      <main className={styles.main}>
        {/* Quick ranges */}
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Quick Select</h3>
          <div className={styles.quickRanges}>
            {QUICK_RANGES.map(r => (
              <button
                key={r.label}
                className={`${styles.rangeBtn} ${
                  startDate === r.getDates()[0] ? styles.rangeBtnActive : ''
                }`}
                onClick={() => applyRange(r.getDates)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date inputs */}
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Custom Date Range</h3>
          <div className={styles.dateRow}>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>From</label>
              <input
                type="date"
                className={styles.dateInput}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setSummary(null) }}
              />
            </div>
            <span className={styles.dateSep}>→</span>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>To</label>
              <input
                type="date"
                className={styles.dateInput}
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setSummary(null) }}
              />
            </div>
          </div>
          <button
            className={styles.previewBtn}
            onClick={fetchSummary}
            disabled={!startDate || !endDate || loading}
          >
            {loading ? 'Loading...' : 'Preview Report'}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {/* Summary preview */}
        {summary && (
          <>
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <div>
                  <p className={styles.summaryCompany}>{summary.company_name}</p>
                  {summary.policy_number && (
                    <p className={styles.summaryPolicy}>Policy #{summary.policy_number}</p>
                  )}
                </div>
                <div className={styles.summaryPeriod}>
                  <p className={styles.summaryPeriodLabel}>Period</p>
                  <p className={styles.summaryPeriodVal}>
                    {fmtDate(summary.period_start)} — {fmtDate(summary.period_end)}
                  </p>
                </div>
              </div>

              <div className={styles.codeTable}>
                <div className={styles.codeTableHead}>
                  <span>Code</span>
                  <span>Description</span>
                  <span className={styles.right}>Emp</span>
                  <span className={styles.right}>Hours</span>
                </div>
                {summary.code_summaries.map((c, i) => (
                  <div key={i} className={styles.codeTableRow}>
                    <span className={styles.tableCode}>{c.code}</span>
                    <span className={styles.tableDesc}>{c.description}</span>
                    <span className={styles.right}>{c.employee_count}</span>
                    <span className={`${styles.right} ${styles.tableHours}`}>
                      {c.total_hours.toFixed(1)}
                    </span>
                  </div>
                ))}
                <div className={styles.codeTableFoot}>
                  <span></span>
                  <span>Total</span>
                  <span className={styles.right}></span>
                  <span className={`${styles.right} ${styles.tableHours}`}>
                    {totalHours.toFixed(1)}
                  </span>
                </div>
              </div>

              <p className={styles.entryCount}>
                {summary.total_entries} classification records in this period
              </p>
            </div>

            <button
              className={styles.pdfBtn}
              onClick={downloadPDF}
              disabled={pdfLoading}
            >
              {pdfLoading ? 'Generating...' : '⬇ Download AmTrust PDF'}
            </button>

            <p className={styles.pdfNote}>
              PDF matches AmTrust audit format with classification summary and employee payroll detail.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
