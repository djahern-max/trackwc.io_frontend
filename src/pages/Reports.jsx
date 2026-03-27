import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { reports } from '../services/api'
import styles from './Reports.module.css'

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

function fmtDollar(val) {
  if (val == null || val === 0) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  }).format(val)
}

const QUICK_RANGES = [
  {
    label: 'This Month', icon: 'fi-rr-calendar', getDates: () => {
      const now = new Date()
      return [
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      ]
    }
  },
  {
    label: 'Last Month', icon: 'fi-rr-calendar', getDates: () => {
      const now = new Date()
      return [
        new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
        new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      ]
    }
  },
  {
    label: 'This Year', icon: 'fi-rr-calendar', getDates: () => {
      const y = new Date().getFullYear()
      return [`${y}-01-01`, `${y}-12-31`]
    }
  },
  { label: 'Policy Period', icon: 'fi-rr-shield-check', getDates: () => ['2024-05-04', '2025-05-04'] },
]

export default function Reports() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeRange, setActiveRange] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState('')

  function applyRange(label, getDates) {
    const [s, e] = getDates()
    setStartDate(s)
    setEndDate(e)
    setSummary(null)
    setActiveRange(label)
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
      setTimeout(() => setPdfLoading(false), 2000)
    }
  }

  const totalHours = summary?.code_summaries?.reduce((s, c) => s + c.total_hours, 0) ?? 0
  const hasPayroll = summary?.code_summaries?.some(c => c.estimated_payroll > 0)

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <button className={styles.backNav} onClick={() => navigate('/dashboard')}>
          <i className="fi fi-rr-arrow-left" />
          Dashboard
        </button>
        <div className={styles.headerCenter}>
          <div className={styles.logoText}>
            TrackWC<span className={styles.logoAccent}>.io</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <i className="fi fi-rr-chart-histogram" style={{ fontSize: '1rem', color: 'var(--text-3)' }} />
          <span className={styles.headerTitle}>Audit Report</span>
        </div>
      </header>

      <main className={styles.main}>

        {/* ── Date Range Selector ── */}
        <div className={styles.rangeCard}>
          <div className={styles.rangeCardHeader}>
            <div className={styles.rangeCardIcon}>
              <i className="fi fi-rr-calendar" />
            </div>
            <div>
              <div className={styles.rangeCardTitle}>Select Date Range</div>
              <div className={styles.rangeCardSub}>Choose a preset or enter custom dates</div>
            </div>
          </div>

          {/* Quick range pills */}
          <div className={styles.quickRanges}>
            {QUICK_RANGES.map(r => (
              <button
                key={r.label}
                className={`${styles.rangeBtn} ${activeRange === r.label ? styles.rangeBtnActive : ''}`}
                onClick={() => applyRange(r.label, r.getDates)}
              >
                <i className={`fi ${r.icon}`} />
                {r.label}
              </button>
            ))}
          </div>

          {/* Date inputs */}
          <div className={styles.dateRow}>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>Start Date</label>
              <input
                type="date"
                className={styles.dateInput}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setSummary(null); setActiveRange(null) }}
              />
            </div>
            <div className={styles.dateSep}>
              <i className="fi fi-rr-arrow-right" />
            </div>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>End Date</label>
              <input
                type="date"
                className={styles.dateInput}
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setSummary(null); setActiveRange(null) }}
              />
            </div>
          </div>

          <button
            className={styles.previewBtn}
            onClick={fetchSummary}
            disabled={!startDate || !endDate || loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Loading…
              </>
            ) : (
              <>
                <i className="fi fi-rr-search" />
                Preview Report
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className={styles.errorRow}>
            <i className="fi fi-rr-circle-xmark" />
            {error}
          </div>
        )}

        {/* ── Summary Preview ── */}
        {summary && (
          <>
            {/* Totals stat cards */}
            {hasPayroll && (
              <div className={styles.statsRow}>
                <div className={styles.statCard}>
                  <div className={styles.statCardIcon}>
                    <i className="fi fi-rr-clock" />
                  </div>
                  <div className={styles.statCardVal}>{totalHours.toFixed(1)}</div>
                  <div className={styles.statCardLabel}>Total Hours</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statCardIcon}>
                    <i className="fi fi-rr-dollar" />
                  </div>
                  <div className={styles.statCardVal}>
                    {fmtDollar(summary.total_estimated_payroll)}
                  </div>
                  <div className={styles.statCardLabel}>Est. Payroll</div>
                </div>
                <div className={`${styles.statCard} ${styles.statCardAccent}`}>
                  <div className={styles.statCardIcon}>
                    <i className="fi fi-rr-shield-check" />
                  </div>
                  <div className={styles.statCardVal}>
                    {fmtDollar(summary.total_estimated_premium)}
                  </div>
                  <div className={styles.statCardLabel}>Est. WC Premium</div>
                </div>
              </div>
            )}

            {/* No rate warning */}
            {!hasPayroll && (
              <div className={styles.warningRow}>
                <i className="fi fi-rr-triangle-warning" />
                No hourly rates set — payroll and premium estimates unavailable.
                Set rates in the employee management screen.
              </div>
            )}

            {/* Summary card */}
            <div className={styles.summaryCard}>

              {/* Card header */}
              <div className={styles.summaryHeader}>
                <div>
                  <p className={styles.summaryCompany}>{summary.company_name}</p>
                  {summary.policy_number && (
                    <p className={styles.summaryPolicy}>
                      <i className="fi fi-rr-document" />
                      Policy #{summary.policy_number}
                    </p>
                  )}
                </div>
                <div className={styles.summaryPeriod}>
                  <p className={styles.summaryPeriodLabel}>Report Period</p>
                  <p className={styles.summaryPeriodVal}>
                    {fmtDate(summary.period_start)} — {fmtDate(summary.period_end)}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Description</th>
                      <th className={styles.right}>Emp</th>
                      <th className={styles.right}>Hours</th>
                      {hasPayroll && <th className={styles.right}>Est. Payroll</th>}
                      {hasPayroll && <th className={styles.right}>Est. Premium</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.code_summaries.map((c, i) => (
                      <tr key={i}>
                        <td>
                          <span className={styles.tableCodePill}>{c.code}</span>
                        </td>
                        <td className={styles.tableDesc}>{c.description}</td>
                        <td className={styles.right}>{c.employee_count}</td>
                        <td className={`${styles.right} ${styles.tableMono}`}>
                          {c.total_hours.toFixed(1)}
                        </td>
                        {hasPayroll && (
                          <td className={`${styles.right} ${styles.tableMono}`}>
                            {fmtDollar(c.estimated_payroll)}
                          </td>
                        )}
                        {hasPayroll && (
                          <td className={`${styles.right} ${styles.tablePremium}`}>
                            {fmtDollar(c.estimated_premium)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td></td>
                      <td><strong>Total</strong></td>
                      <td></td>
                      <td className={`${styles.right} ${styles.tableMono}`}>
                        <strong>{totalHours.toFixed(1)}</strong>
                      </td>
                      {hasPayroll && (
                        <td className={`${styles.right} ${styles.tableMono}`}>
                          <strong>{fmtDollar(summary.total_estimated_payroll)}</strong>
                        </td>
                      )}
                      {hasPayroll && (
                        <td className={`${styles.right} ${styles.tablePremium}`}>
                          <strong>{fmtDollar(summary.total_estimated_premium)}</strong>
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className={styles.entryCount}>
                <i className="fi fi-rr-document" />
                {summary.total_entries} classification records in this period
              </div>
            </div>

            {/* PDF Download */}
            <div className={styles.pdfBlock}>
              <button
                className={styles.pdfBtn}
                onClick={downloadPDF}
                disabled={pdfLoading}
              >
                {pdfLoading ? (
                  <>
                    <span className={styles.spinner} />
                    Generating PDF…
                  </>
                ) : (
                  <>
                    <i className="fi fi-rr-download" />
                    Download AmTrust PDF
                  </>
                )}
              </button>
              <p className={styles.pdfNote}>
                Includes classification summary, per-employee payroll detail,
                and estimated premium by code — ready for your auditor.
              </p>
            </div>
          </>
        )}

      </main>
    </div>
  )
}