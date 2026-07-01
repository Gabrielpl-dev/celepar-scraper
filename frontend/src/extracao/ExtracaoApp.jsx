import s from './ExtracaoApp.module.css'

export default function ExtracaoApp() {
  return (
    <div className={s.root}>
      <header className={s.header}>
        <span className={s.title}>Extração</span>
        <span className={s.badge}>em construção</span>
      </header>
      <main className={s.main}>
        <span className={s.empty}>em breve</span>
      </main>
    </div>
  )
}
