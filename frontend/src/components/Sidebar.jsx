import { useState, useRef } from 'react'
import { api } from '../api'
import s from './Sidebar.module.css'

const OPS = [
  { id: 'extrair',   num: '01', label: 'Extrair por cultura' },
  { id: 'siagro',    num: '02', label: 'Buscar por SIAGRO' },
  { id: 'comparar',  num: '03', label: 'Comparar culturas' },
  { id: 'verificar', num: '04', label: 'Verificar produto' },
  { id: 'raw',       num: '--', label: 'Listagem bruta' },
]

export function Sidebar({ activeView, setActiveView, params, setParams, open, onHoverStart, onHoverEnd }) {
  const [searchTerm, setSearchTerm]       = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]         = useState(false)
  const debounceRef = useRef(null)

  function handleSearchChange(e) {
    const val = e.target.value
    setSearchTerm(val)
    setSearchResults([])
    clearTimeout(debounceRef.current)
    if (!val.trim()) return
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await api.verificar(val, {})
        setSearchResults(data.ok ? data.rows.slice(0, 8) : [])
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  function handleSelect(row) {
    setParams(p => ({ ...p, Cod: row.cod }))
    setSearchTerm(row.nome)
    setSearchResults([])
  }

  return (
    <aside className={s.aside} onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}>
      <div className={`${s.content} ${open ? '' : s.contentHidden}`}>
      <h2 className={s.sectionTitle}>Operações</h2>
      <div className={s.ops}>
        {OPS.map(op => (
          <button
            key={op.id}
            className={`${s.op} ${activeView === op.id ? s.opActive : ''}`}
            onClick={() => setActiveView(op.id)}
          >
            <span className={s.num}>{op.num}</span>
            {op.label}
          </button>
        ))}
      </div>

      <div className={s.params}>
        <h2 className={s.sectionTitle}>Parâmetros do Produto</h2>

        <div className={s.field}>
          <label htmlFor="paramSearch">Produto</label>
          <div className={s.searchWrap}>
            <input
              id="paramSearch"
              type="text"
              value={searchTerm}
              placeholder="ex: BELURE"
              onChange={handleSearchChange}
            />
            {searching && <div className={s.searchHint}>buscando...</div>}
            {searchResults.length > 0 && (
              <ul className={s.dropdown}>
                {searchResults.map(r => (
                  <li key={r.cod} className={s.dropdownItem} onClick={() => handleSelect(r)}>
                    <span className={s.dropdownNome}>{r.nome}</span>
                    <span className={s.dropdownCod}>{r.cod}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={s.field}>
          <label htmlFor="paramCod">Cod</label>
          <input
            id="paramCod"
            type="text"
            value={params.Cod}
            placeholder="ex: 2968"
            onChange={e => setParams(p => ({ ...p, Cod: e.target.value }))}
          />
        </div>
      </div>
      </div>
    </aside>
  )
}
