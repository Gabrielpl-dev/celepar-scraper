import { useState } from 'react'
import { LoginView } from './LoginView'
import { RegisterView } from './RegisterView'
import s from './AuthView.module.css'

export function AuthView({ onAuth }) {
  const [mode, setMode] = useState('login')

  return (
    <div className={s.page}>
      <div className={s.formPanel}>
        {mode === 'login'
          ? <LoginView onAuth={onAuth} onSwitchToRegister={() => setMode('register')} />
          : <RegisterView onAuth={onAuth} onSwitchToLogin={() => setMode('login')} />
        }
      </div>
      <div className={s.imagePanel} />
    </div>
  )
}
