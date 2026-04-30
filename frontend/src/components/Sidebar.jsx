import { useState, useRef, useEffect } from 'react'
import { api } from '../api'
import s from './Sidebar.module.css'

const OPS = [
  { id: 'culturas',  num: '01', label: 'Culturas' },
  { id: 'extrair',   num: '02', label: 'Extrair por cultura' },
  { id: 'siagro',    num: '03', label: 'Buscar por SIAGRO' },
  { id: 'comparar',  num: '04', label: 'Comparar culturas' },
  { id: 'verificar', num: '05', label: 'Verificar produto' },
]

export function Sidebar({ activeView, setActiveView, params, setParams, open, onToggle }) {
  const [searchTerm, setSearchTerm]        = useState('')
  const [searchResults, setSearchResults]  = useState([])
  const [searching, setSearching]          = useState(false)
  const [highlightedIndex, setHighlighted] = useState(-1)
  const [dropdownPos, setDropdownPos]      = useState(null)
  const debounceRef = useRef(null)
  const searchRef   = useRef(null)

  function calcDropdownPos() {
    if (!searchRef.current) return null
    const r          = searchRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom - 8
    const showAbove  = spaceBelow < 120
    return {
      left:      r.left,
      width:     r.width,
      maxHeight: showAbove ? Math.min(220, r.top - 8) : Math.min(220, spaceBelow),
      ...(showAbove ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    }
  }

  useEffect(() => {
    if (searchResults.length > 0) setDropdownPos(calcDropdownPos())
    else setDropdownPos(null)
  }, [searchResults])

  function closeDropdown() {
    setSearchResults([])
    setHighlighted(-1)
    setDropdownPos(null)
  }

  function handleSearchChange(e) {
    const val = e.target.value
    setSearchTerm(val)
    closeDropdown()
    clearTimeout(debounceRef.current)
    if (!val.trim()) return
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await api.verificar(val, {})
        setSearchResults(data.ok ? data.rows.slice(0, 8) : [])
        setHighlighted(-1)
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  function handleSelect(row) {
    setParams(p => ({ ...p, Cod: row.cod }))
    setSearchTerm(row.nome)
    closeDropdown()
    setActiveView('culturas')
  }

  function handleSearchKeyDown(e) {
    if (searchResults.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(i => Math.min(i + 1, searchResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(searchResults[highlightedIndex >= 0 ? highlightedIndex : 0])
    } else if (e.key === 'Escape') {
      closeDropdown()
    }
  }

  return (
    <aside className={s.aside}>
      <button className={s.collapseIcon} onClick={onToggle} title={open ? 'Fechar sidebar' : 'Abrir sidebar'}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <line x1="6" y1="1" x2="6" y2="17" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
      </button>
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
            <input
              ref={searchRef}
              id="paramSearch"
              type="text"
              value={searchTerm}
              placeholder="ex: BELURE"
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onBlur={() => setTimeout(closeDropdown, 150)}
              autoComplete="off"
            />
            {searching && <div className={s.searchHint}>buscando...</div>}
          </div>

          <div className={s.field}>
            <label htmlFor="paramCod">Cod</label>
            <input
              id="paramCod"
              type="text"
              value={params.Cod}
              placeholder="ex: 2968"
              onChange={e => setParams(p => ({ ...p, Cod: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && params.Cod.trim()) setActiveView('culturas') }}
            />
          </div>
        </div>
      </div>

      {dropdownPos && (
        <ul className={s.dropdown} style={{ position: 'fixed', zIndex: 200, ...dropdownPos }}>
          {searchResults.map((r, i) => (
            <li
              key={r.cod}
              className={`${s.dropdownItem} ${i === highlightedIndex ? s.dropdownItemHighlighted : ''}`}
              onMouseDown={() => handleSelect(r)}
            >
              <span className={s.dropdownNome}>{r.nome}</span>
              <span className={s.dropdownCod}>{r.cod}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
