import s from './StatusBadge.module.css'

export function StatusBadge({ cor, situacao }) {
  const cls = cor === 'green' ? s.green : cor === 'red' ? s.red : s.dim
  return <span className={cls}>{situacao}</span>
}
