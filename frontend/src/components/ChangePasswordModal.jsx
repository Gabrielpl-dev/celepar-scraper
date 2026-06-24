import { useState } from 'react'
import s from './ChangePasswordModal.module.css'

export function ChangePasswordModal({ token, onClose }) {
  const [current, setCurrent]     = useState('')
  const [next, setNext]           = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (next !== confirm) return setError('Nova senha não confere')
    if (next.length < 6)  return setError('Nova senha deve ter ao menos 6 caracteres')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json()
      if (!data.ok) return setError(data.error)
      setSuccess(true)
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <button className={s.close} onClick={onClose}>✕</button>
        <h2 className={s.title}>Alterar senha</h2>

        {success ? (
          <p className={s.successMsg}>Senha alterada com sucesso.</p>
        ) : (
          <form className={s.form} onSubmit={handleSubmit}>
            <div className={s.field}>
              <label>Senha atual</label>
              <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoFocus />
            </div>
            <div className={s.field}>
              <label>Nova senha</label>
              <input type="password" value={next} onChange={e => setNext(e.target.value)} required />
            </div>
            <div className={s.field}>
              <label>Confirmar nova senha</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            {error && <p className={s.error}>{error}</p>}
            <button className={s.btn} type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
