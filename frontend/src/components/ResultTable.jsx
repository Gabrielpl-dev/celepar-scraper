import { useState } from 'react'
import s from './ResultTable.module.css'

export function ResultTable({ headers, rows, toolbar, emptyNode, noScroll, collapsible, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  if (!rows || rows.length === 0) {
    return (
      <div className={s.results}>
        {emptyNode || <div className={s.emptyState}>Nenhum resultado.</div>}
      </div>
    )
  }

  return (
    <div className={s.results}>
      {toolbar && (
        <div
          className={s.toolbar}
          onClick={collapsible ? () => setOpen(o => !o) : undefined}
          style={collapsible ? { cursor: 'pointer', userSelect: 'none' } : {}}
        >
          {collapsible && <span className={s.chevron}>{open ? '▾' : '▸'}</span>}
          {toolbar}
        </div>
      )}
      {open && (
        <div className={s.tableWrap} style={noScroll ? { maxHeight: 'none', overflowY: 'visible' } : {}}>
          <table>
            <thead>
              <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((cells, i) => (
                <tr key={i}>
                  {cells.map((cell, j) => <td key={j}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export { s as tableStyles }
