import { LoginView } from './LoginView'
import s from './AuthView.module.css'

export function AuthView({ onAuth }) {
  return (
    <div className={s.page}>
      <div className={s.imagePanel} />
      <div className={s.formPanel}>
        <LoginView onAuth={onAuth} />
      </div>
    </div>
  )
}
