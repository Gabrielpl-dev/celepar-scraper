import s from './StatusBar.module.css'

export function StatusBar({ status, message, count, took }) {
  if (status === 'idle') return null

  if (status === 'loading') {
    return (
      <div className={`${s.status} ${s.loading}`}>
        <span className={s.spinner} />
        {message}
      </div>
    )
  }

  return (
    <div className={`${s.status} ${s[status]}`}>
      {message}
      {count != null && <span className={s.count}>{count}</span>}
      {count != null && ' resultado(s)'}
      {took != null && <span className={s.time}>{took}ms</span>}
    </div>
  )
}
