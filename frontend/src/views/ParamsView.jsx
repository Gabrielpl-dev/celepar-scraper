import { useState, useRef, useEffect } from 'react'
import { api } from '../api'
import s from './ParamsView.module.css'

const SOURCES = [
  { id: 'banco',   label: 'Banco'   },
  { id: 'adapar',  label: 'Adapar'  },
  { id: 'agrofit', label: 'Agrofit' },
  { id: 'sigen',   label: 'Sigen'   },
]

export function ParamsView({ params, setParams }) {
  const [searchTerm, setSearchTerm]        = useState('')
  const [searchResults, setSearchResults]  = useState([])
  const [searching, setSearching]          = useState(false)
  const [highlightedIndex, setHighlighted] = useState(-1)
  const [sources, setSources]              = useState(null)
  const [checking, setChecking]            = useState(false)
  const debounceRef = useRef(null)
  const inputRef    = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { if (params.nome) setSearchTerm(params.nome) }, [])

  function handleSearchChange(e) {
    const val = e.target.value
    setSearchTerm(val)
    setSearchResults([])
    clearTimeout(debounceRef.current)
    if (!val.trim()) return
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await api.buscarProduto(val)
        setSearchResults(data.ok ? data.rows.slice(0, 10) : [])
        setHighlighted(-1)
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  async function checkSources(nome, ma) {
    setChecking(true)
    setSources(null)
    try {
      const data = await api.verificarProduto(nome, ma)
      if (data.ok) setSources(data)
    } finally {
      setChecking(false)
    }
  }

  function handleSelect(row) {
    setParams(p => ({ ...p, nome: row.nome, ma: row.ma || '' }))
    setSearchTerm(row.nome)
    setSearchResults([])
    checkSources(row.nome, row.ma)
  }

  async function handleMaBlur() {
    const ma = params.ma?.trim()
    if (!ma || !/^\d+$/.test(ma)) return
    if (params.nome) { checkSources(params.nome, ma); return }
    try {
      const data = await api.agrofitDocs(ma)
      if (data?.ok && data.nome) {
        setParams(p => ({ ...p, nome: data.nome }))
        setSearchTerm(data.nome)
        checkSources(data.nome, ma)
      }
    } catch (_) {}
  }

  function handleKeyDown(e) {
    if (!searchResults.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setHighlighted(i => Math.min(i + 1, searchResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setHighlighted(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault(); handleSelect(searchResults[highlightedIndex >= 0 ? highlightedIndex : 0])
    } else if (e.key === 'Escape') {
      setSearchResults([])
    }
  }

  function dotClass(val) {
    if (val === true)  return s.dotOn
    if (val === false) return s.dotOff
    return s.dotIdle
  }

  return (
    <section className={s.section}>
      <div className={s.header}>
        <h3 className={s.title}>Parâmetros</h3>
        <p className={s.desc}>Defina o produto e código base usados pelas operações.</p>
      </div>

      <div className={s.body}>
        <div className={s.form}>
          <div className={s.field}>
            <label htmlFor="paramProduto">Produto</label>
            <div className={s.searchWrap}>
              <input
                ref={inputRef}
                id="paramProduto"
                type="text"
                value={searchTerm}
                placeholder="ex: BELURE"
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setSearchResults([]), 150)}
                autoComplete="off"
              />
              {searching && <span className={s.hint}>buscando...</span>}
              {searchResults.length > 0 && (
                <ul className={s.dropdown}>
                  {searchResults.map((r, i) => (
                    <li
                      key={r.ma || i}
                      className={`${s.dropdownItem} ${i === highlightedIndex ? s.dropdownItemHL : ''}`}
                      onMouseDown={() => handleSelect(r)}
                    >
                      <span className={s.dropNome}>{r.nome}</span>
                      {r.ma && <span className={s.dropMa}>MA {r.ma}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className={s.field}>
            <label htmlFor="paramMa">Registro MA</label>
            <input
              id="paramMa"
              type="text"
              inputMode="numeric"
              value={params.ma ?? ''}
              placeholder="ex: 00513"
              onChange={e => setParams(p => ({ ...p, ma: e.target.value.replace(/\D/g, '') }))}
              onBlur={handleMaBlur}
            />
          </div>
        </div>

        <div className={s.sourcesPanel}>
          <div className={s.sourcesTitle}>Fontes</div>
          {SOURCES.map(src => (
            <div key={src.id} className={s.sourceRow}>
              <span className={`${s.dot} ${checking ? s.dotChecking : dotClass(sources?.[src.id])}`} />
              <span className={s.sourceLabel}>{src.label}</span>
              {src.id === 'agrofit' && sources?.agrofitInfo?.ma && (
                <span className={s.sourceMa}>MA {sources.agrofitInfo.ma}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
