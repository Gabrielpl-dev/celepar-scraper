import { useState } from 'react'
import s from './AuthView.module.css'

export function RegisterView({ onAuth, onSwitchToLogin }) {
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('as senhas não coincidem'); return }
    if (password.length < 6)  { setError('senha muito curta (mín. 6 caracteres)'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await r.json()
      if (data.ok) {
        localStorage.setItem('token', data.token)
        onAuth(data.token, data.username)
      } else {
        setError(data.error || 'erro ao cadastrar')
      }
    } catch {
      setError('erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      <div className={s.field}>
        <label htmlFor="reg-username">Usuário</label>
        <input
          id="reg-username"
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
        />
      </div>
      <div className={s.field}>
        <label htmlFor="reg-password">Senha</label>
        <input
          id="reg-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className={s.field}>
        <label htmlFor="reg-confirm">Confirmar senha</label>
        <input
          id="reg-confirm"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <p className={s.error}>{error}</p>
      <button className={s.btn} type="submit" disabled={loading || !username || !password || !confirm}>
        {loading ? 'Cadastrando...' : 'Cadastrar'}
      </button>
      <p className={s.switch}>
        Já tem conta?{' '}
        <button type="button" className={s.link} onClick={onSwitchToLogin}>Entrar</button>
      </p>
    </form>
  )
}
