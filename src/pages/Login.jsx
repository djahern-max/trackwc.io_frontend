import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/api'
import styles from './Login.module.css'

const COMPANY_ID = 1

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('pin')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePinLogin() {
    if (pin.length !== 4) return
    setLoading(true)
    setError('')
    try {
      const data = await auth.pinLogin(COMPANY_ID, pin)
      redirectByRole(data.employee.role)
    } catch (e) {
      setError('Invalid PIN. Try again.')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await auth.login(email, password)
      redirectByRole(data.employee.role)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function redirectByRole(role) {
    if (role === 'admin') navigate('/dashboard')
    else if (role === 'foreman') navigate('/foreman')
    else navigate('/checkin')
  }

  function appendPin(digit) {
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    if (next.length === 4) {
      setTimeout(() => {
        setLoading(true)
        auth.pinLogin(COMPANY_ID, next)
          .then(data => redirectByRole(data.employee.role))
          .catch(() => { setError('Invalid PIN. Try again.'); setPin('') })
          .finally(() => setLoading(false))
      }, 200)
    }
  }

  function deletePin() {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  return (
    <div className={styles.page}>

      {/* Background decoration */}
      <div className={styles.bgAccent} />

      <div className={styles.card}>

        {/* Logo */}
        <div className={styles.logoBlock}>
          <div className={styles.logoText}>
            TrackWC<span className={styles.logoAccent}>.io</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${mode === 'pin' ? styles.toggleActive : ''}`}
            onClick={() => { setMode('pin'); setError('') }}
          >
            <i className="fi fi-rr-user" />
            PIN Login
          </button>
          <button
            className={`${styles.toggleBtn} ${mode === 'email' ? styles.toggleActive : ''}`}
            onClick={() => { setMode('email'); setError('') }}
          >
            <i className="fi fi-rr-envelope" />
            Email Login
          </button>
        </div>

        {/* PIN Mode */}
        {mode === 'pin' && (
          <div className={styles.pinSection}>
            <p className={styles.pinLabel}>Enter your 4-digit PIN</p>

            <div className={styles.pinDots}>
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`${styles.pinDot} ${pin.length > i ? styles.pinDotFilled : ''} ${error ? styles.pinDotError : ''}`}
                />
              ))}
            </div>

            {error && (
              <div className={styles.errorRow}>
                <i className="fi fi-rr-circle-xmark" />
                {error}
              </div>
            )}

            <div className={styles.numpad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) => (
                key === '' ? (
                  <div key={i} />
                ) : key === 'del' ? (
                  <button
                    key={i}
                    className={styles.numKeyDel}
                    onClick={deletePin}
                    disabled={loading || pin.length === 0}
                    aria-label="Delete"
                  >
                    <i className="fi fi-rr-delete" />
                  </button>
                ) : (
                  <button
                    key={i}
                    className={styles.numKey}
                    onClick={() => appendPin(key)}
                    disabled={loading}
                  >
                    {loading && pin.length === 4 ? (
                      <span className={styles.numKeyLoading} />
                    ) : key}
                  </button>
                )
              ))}
            </div>
          </div>
        )}

        {/* Email Mode */}
        {mode === 'email' && (
          <div className={styles.emailForm} onSubmit={handleEmailLogin}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Email address</label>
              <div className={styles.inputWrap}>
                <i className="fi fi-rr-envelope" />
                <input
                  type="email"
                  className={styles.input}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Password</label>
              <div className={styles.inputWrap}>
                <i className="fi fi-rr-lock" />
                <input
                  type="password"
                  className={styles.input}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className={styles.errorRow}>
                <i className="fi fi-rr-circle-xmark" />
                {error}
              </div>
            )}

            <button
              className={styles.loginBtn}
              disabled={loading}
              onClick={handleEmailLogin}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <i className="fi fi-rr-arrow-right" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer */}
        <p className={styles.footer}>
          Workers' Comp Tracking · Powered by TrackHQ
        </p>

      </div>
    </div>
  )
}