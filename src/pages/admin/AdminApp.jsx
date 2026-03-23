import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import AdminDashboard from './AdminDashboard'
import AdminConsole from './AdminConsole'
import AIAgentsPage from './AIAgentsPage'

export default function AdminApp() {
  const [user, setUser] = useState(() => localStorage.getItem('bw_superadmin') || null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) navigate('/')
  }, [user, navigate])

  function handleLogout() {
    localStorage.removeItem('bw_superadmin')
    // Clear all client sessions
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bw_client_')) localStorage.removeItem(key)
    })
    setUser(null)
  }

  if (!user) return null

  return (
    <AdminLayout user={user} onLogout={handleLogout}>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="consola" element={<AdminConsole />} />
        <Route path="ai-agents" element={<AIAgentsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  )
}
