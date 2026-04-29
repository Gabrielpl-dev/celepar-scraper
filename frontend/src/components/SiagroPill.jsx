import s from './SiagroPill.module.css'

export function SiagroPill({ code }) {
  return <span className={s.pill}>{code}</span>
}
