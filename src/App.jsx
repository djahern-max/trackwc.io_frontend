import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { auth } from './services/api'
import Login from './pages/Login'
import CheckIn from './pages/CheckIn'
import Foreman from './pages/Foreman'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import './styles/global.css'

function RequireAuth({ children, roles }) {
  const employee = auth.getEmployee()
  if (!auth.isLoggedIn() || !employee) return <Navigate to="/login" replace />
  if (roles && !roles.includes(employee.role)) {
    if (employee.role === 'admin') return <Navigate to="/dashboard" replace />
    if (employee.role === 'foreman') return <Navigate to="/foreman" replace />
    return <Navigate to="/checkin" replace />
  }
  return children
}

function RootRedirect() {
  const employee = auth.getEmployee()
  if (!auth.isLoggedIn() || !employee) return <Navigate to="/login" replace />
  if (employee.role === 'admin') return <Navigate to="/dashboard" replace />
  if (employee.role === 'foreman') return <Navigate to="/foreman" replace />
  return <Navigate to="/checkin" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/checkin" element={
          <RequireAuth roles={['worker','foreman','admin']}><CheckIn /></RequireAuth>
        } />
        <Route path="/foreman" element={
          <RequireAuth roles={['foreman','admin']}><Foreman /></RequireAuth>
        } />
        <Route path="/dashboard" element={
          <RequireAuth roles={['admin']}><Dashboard /></RequireAuth>
        } />
        <Route path="/reports" element={
          <RequireAuth roles={['admin']}><Reports /></RequireAuth>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
