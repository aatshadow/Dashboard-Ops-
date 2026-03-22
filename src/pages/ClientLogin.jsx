import { useState } from 'react'

export default function ClientLogin({ clientConfig, onLogin, authenticateUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Completa todos los campos')
      return
    }
    setLoading(true)
    const user = await authenticateUser(email, password)
    if (user) {
      onLogin(user.email)
    } else {
      setError('Credenciales incorrectas')
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-glow" />
      <div className="login-card">
        {clientConfig?.logoUrl && (
          <img src={clientConfig.logoUrl} alt={clientConfig.name} className="login-logo" />
        )}
        <h1 className="login-title">{clientConfig?.name || 'Dashboard'}</h1>
        <p className="login-subtitle">Accede al panel de control</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>
          <div className="input-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
