import { useState } from 'react'
import { LoginView } from './LoginView'
import { RegisterView } from './RegisterView'
import s from './AuthView.module.css'

export function AuthView({ onAuth }) {
  const [mode, setMode] = useState('login')

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logo}>Celepar Scraper</div>
        <p className={s.subtitle}>{mode === 'login' ? 'Entrar na conta' : 'Criar conta'}</p>
        {mode === 'login'
          ? <LoginView onAuth={onAuth} onSwitchToRegister={() => setMode('register')} />
          : <RegisterView onAuth={onAuth} onSwitchToLogin={() => setMode('login')} />
        }
      </div>
    </div>
  )
}
