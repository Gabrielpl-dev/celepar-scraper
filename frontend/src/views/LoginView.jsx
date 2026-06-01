import { useState } from 'react'
import s from './AuthView.module.css'

export function LoginView({ onAuth, onSwitchToRegister }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await r.json()
      if (data.ok) {
        localStorage.setItem('token', data.token)
        onAuth(data.token, data.username)
      } else {
        setError(data.error || 'erro ao entrar')
      }
    } catch {
      setError('erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.formWrapper}>
      <div className={s.brand}>AgroCheck</div>
      <h1 className={s.heading}>Faça seu<br />login.</h1>
      <form className={s.form} onSubmit={handleSubmit}>
        <div className={s.field}>
          <label htmlFor="au-username">Usuário</label>
          <input
            id="au-username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className={s.field}>
          <label htmlFor="au-password">Senha</label>
          <input
            id="au-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <p className={s.error}>{error}</p>
        <button className={s.btn} type="submit" disabled={loading || !username || !password}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <p className={s.switch}>
          Ainda não tem conta?{' '}
          <button type="button" className={s.link} onClick={onSwitchToRegister}>Cadastrar</button>
        </p>
      </form>
    </div>
  )
}
