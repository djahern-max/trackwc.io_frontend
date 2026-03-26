import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/api'
import styles from './Login.module.css'

// Company ID would normally come from subdomain or config
const COMPANY_ID = 1

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('pin')       // 'pin' | 'email'
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
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoBlock}>
          <span className={styles.logoMark}>WC</span>
          <div>
            <div className={styles.logoText}>TrackWC</div>
            <div className={styles.logoSub}>Workers' Comp Tracker</div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${mode === 'pin' ? styles.toggleActive : ''}`}
            onClick={() => { setMode('pin'); setError('') }}
          >
            PIN Login
          </button>
          <button
            className={`${styles.toggleBtn} ${mode === 'email' ? styles.toggleActive : ''}`}
            onClick={() => { setMode('email'); setError('') }}
          >
            Email Login
          </button>
        </div>

        {/* PIN Mode */}
        {mode === 'pin' && (
          <div className={styles.pinSection}>
            <p className={styles.pinLabel}>Enter your 4-digit PIN</p>

            {/* PIN Dots */}
            <div className={styles.pinDots}>
              {[0,1,2,3].map(i => (
                <div
                  key={i}
                  className={`${styles.pinDot} ${pin.length > i ? styles.pinDotFilled : ''} ${error ? styles.pinDotError : ''}`}
                />
              ))}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            {/* Numpad */}
            <div className={styles.numpad}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
                <button
                  key={i}
                  className={`${styles.numKey} ${key === '' ? styles.numKeyEmpty : ''}`}
                  onClick={() => key === '⌫' ? deletePin() : key !== '' ? appendPin(key) : null}
                  disabled={loading || key === ''}
                >
                  {loading && pin.length === 4 && key === '0' ? '...' : key}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Email Mode */}
        {mode === 'email' && (
          <form className={styles.emailForm} onSubmit={handleEmailLogin}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Email</label>
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
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Password</label>
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
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.loginBtn} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
