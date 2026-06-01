import { useState } from 'react'
import { LoginView } from './LoginView'
import { RegisterView } from './RegisterView'
import s from './AuthView.module.css'

export function AuthView({ onAuth }) {
  const [mode,   setMode]   = useState('login')    // qual conteúdo está montado
  const [bgMode, setBgMode] = useState('login')    // qual bg está ativo (muda primeiro)
  const [phase,  setPhase]  = useState('idle')     // idle | exit | enter
  const [dir,    setDir]    = useState('forward')  // forward | backward

  function transition(to) {
    if (phase !== 'idle') return
    const d = to === 'register' ? 'forward' : 'backward'
    setDir(d)
    setBgMode(to)      // bg começa a transicionar agora
    setPhase('exit')
    setTimeout(() => {
      setMode(to)
      setPhase('enter')
      setTimeout(() => setPhase('idle'), 480)
    }, 420)
  }

  const cls = [
    s.page,
    s['bg-' + bgMode],
    phase !== 'idle' ? s['phase-' + phase] : '',
    s['dir-' + dir],
  ].filter(Boolean).join(' ')

  return (
    <div className={cls}>
      <div className={s.left}>
        <div className={s.leftDark} />
        <div className={s.leftImage} />
        <div className={s.leftGrad} />
        <div className={s.leftContent}>
          {mode === 'login' && (
            <LoginView onAuth={onAuth} onSwitchToRegister={() => transition('register')} />
          )}
        </div>
      </div>

      <div className={s.right}>
        <div className={s.rightDark} />
        <div className={s.rightImage} />
        <div className={s.rightGrad} />
        <div className={s.rightContent}>
          {mode === 'register' && (
            <RegisterView onAuth={onAuth} onSwitchToLogin={() => transition('login')} />
          )}
        </div>
      </div>
    </div>
  )
}
