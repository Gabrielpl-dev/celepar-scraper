import s from './Header.module.css'

export function Header() {
  return (
    <header className={s.header}>
      <h1 className={s.title}>
        celepar scraper
      </h1>
      <div className={s.meta}>v0.1 · agrotóxicos pr</div>
    </header>
  )
}
