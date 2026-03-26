// ── Base API client with offline queue ───────────────────────────────────────

const BASE_URL = '/api'
const OFFLINE_QUEUE_KEY = 'trackwc_offline_queue'

function getToken() {
  return localStorage.getItem('trackwc_token')
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  return res.json()
}

// Offline queue — stores entries locally when no connection
export const offlineQueue = {
  add(entry) {
    const queue = this.getAll()
    queue.push({ ...entry, _offlineId: Date.now(), _createdAt: new Date().toISOString() })
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
  },

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]')
    } catch {
      return []
    }
  },

  clear() {
    localStorage.removeItem(OFFLINE_QUEUE_KEY)
  },

  count() {
    return this.getAll().length
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  async login(email, password) {
    const data = await request('POST', '/auth/login/', { email, password })
    localStorage.setItem('trackwc_token', data.access_token)
    localStorage.setItem('trackwc_employee', JSON.stringify(data.employee))
    return data
  },

  async pinLogin(companyId, pin) {
    const data = await request('POST', '/auth/pin-login/', { company_id: companyId, pin })
    localStorage.setItem('trackwc_token', data.access_token)
    localStorage.setItem('trackwc_employee', JSON.stringify(data.employee))
    return data
  },

  logout() {
    localStorage.removeItem('trackwc_token')
    localStorage.removeItem('trackwc_employee')
  },

  getEmployee() {
    try {
      return JSON.parse(localStorage.getItem('trackwc_employee') || 'null')
    } catch {
      return null
    }
  },

  isLoggedIn() {
    return !!getToken()
  }
}

// ── Employees ─────────────────────────────────────────────────────────────────

export const employees = {
  list: () => request('GET', '/employees/'),
  create: (data) => request('POST', '/employees/', data),
  update: (id, data) => request('PUT', `/employees/${id}/`, data),
}

// ── WC Codes ──────────────────────────────────────────────────────────────────

export const wcCodes = {
  list: () => request('GET', '/wc-codes/'),
  create: (data) => request('POST', '/wc-codes/', data),
  update: (id, data) => request('PUT', `/wc-codes/${id}/`, data),
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export const jobs = {
  list: () => request('GET', '/jobs/'),
  create: (data) => request('POST', '/jobs/', data),
  update: (id, data) => request('PUT', `/jobs/${id}/`, data),
  delete: (id) => request('DELETE', `/jobs/${id}/`),
}

// ── Daily Entries ─────────────────────────────────────────────────────────────

export const entries = {
  async create(entryData) {
    if (!navigator.onLine) {
      offlineQueue.add(entryData)
      return { _offline: true, ...entryData }
    }
    return request('POST', '/entries/', entryData)
  },

  async bulkCreate(data) {
    return request('POST', '/entries/bulk/', data)
  },

  async syncOffline() {
    const queue = offlineQueue.getAll()
    if (!queue.length) return { synced: 0 }
    const cleaned = queue.map(({ _offlineId, _createdAt, ...entry }) => ({
      ...entry,
      synced_at: _createdAt
    }))
    await request('POST', '/entries/sync/', cleaned)
    offlineQueue.clear()
    return { synced: queue.length }
  },

  today: () => request('GET', '/entries/today/'),

  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null))
    ).toString()
    return request('GET', `/entries/${qs ? '?' + qs : ''}`)
  },

  delete: (id) => request('DELETE', `/entries/${id}/`),
}

// ── Reports ───────────────────────────────────────────────────────────────────

export const reports = {
  auditSummary: (startDate, endDate) =>
    request('GET', `/reports/audit-summary/?start_date=${startDate}&end_date=${endDate}`),

  downloadPDF: (startDate, endDate) => {
    const token = getToken()
    const url = `${BASE_URL}/reports/audit-pdf/?start_date=${startDate}&end_date=${endDate}&token=${token}`
    window.open(url, '_blank')
  }
}