import { useState, useRef, useEffect } from 'react'
import s from './Header.module.css'
import { NAV_GROUPS } from '../navItems'
import { api } from '../api'

async function openBulaTab(ma) {
  if (!ma) return
  const data = await api.agrofitDocs(ma)
  const doc = data.documentos?.find(d => d.tipo === 'Bula') ?? data.documentos?.[0]
  if (doc?.url) window.open('/api/agrofit-pdf?url=' + encodeURIComponent(doc.url), '_blank')
}

function NavDropdown({ group, activeView, setActiveView, favorites, toggleFavorite, params, open, onOpen, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  const isGroupActive = group.items.some(it => it.id === activeView)

  return (
    <div className={s.dropdown} ref={ref}>
      <button
        className={`${s.paramsBtn} ${isGroupActive ? s.paramsBtnActive : ''}`}
        onClick={() => (open ? onClose() : onOpen())}
      >
        {group.label} <span className={s.caret}>▾</span>
      </button>
      {open && (
        <div className={s.dropdownPanel}>
          {group.items.map(item => {
            const isFavorite = favorites.includes(item.id)
            return (
              <div key={item.id} className={`${s.dropdownItem} ${activeView === item.id ? s.dropdownItemActive : ''}`}>
                <button
                  className={s.dropdownItemBtn}
                  title={item.title}
                  onClick={() => { setActiveView(item.id); onClose() }}
                >
                  {item.label}
                </button>
                {item.id === 'bula' && (
                  <span
                    className={s.newTabBtn}
                    role="button"
                    title="Abrir em nova aba"
                    onClick={e => { e.stopPropagation(); openBulaTab(params?.ma) }}
                  >
                    ↗
                  </span>
                )}
                <button
                  className={`${s.starBtn} ${isFavorite ? s.starBtnActive : ''}`}
                  title={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
                  onClick={() => toggleFavorite(item.id)}
                >
                  {isFavorite ? '★' : '☆'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Header({
  theme, onToggleTheme,
  onParams, paramsActive,
  onLinks, linksActive,
  produtoNome, username, onLogout, onChangePassword,
  activeView, setActiveView, favorites, toggleFavorite, params,
}) {
  const [openGroup, setOpenGroup] = useState(null)

  return (
    <header className={s.header}>
      <div className={s.left}>
        <button className={`${s.paramsBtn} ${paramsActive ? s.paramsBtnActive : ''}`} onClick={onParams}>
          Parâmetros
        </button>
        {NAV_GROUPS.map(group => (
          <NavDropdown
            key={group.id}
            group={group}
            activeView={activeView}
            setActiveView={setActiveView}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            params={params}
            open={openGroup === group.id}
            onOpen={() => setOpenGroup(group.id)}
            onClose={() => setOpenGroup(null)}
          />
        ))}
        <button className={`${s.paramsBtn} ${linksActive ? s.paramsBtnActive : ''}`} onClick={onLinks}>
          Links
        </button>
        {produtoNome && (
          <span className={s.produtoLabel}>produto: <strong>{produtoNome}</strong></span>
        )}
      </div>
      <h1 className={s.title}></h1>
      <div className={s.right}>
        {username && (
          <div className={s.userInfo}>
            <span>{username}</span>
            <button className={s.logoutBtn} onClick={onChangePassword} title="Alterar senha">Senha</button>
            <button className={s.logoutBtn} onClick={onLogout} title="Sair">Sair</button>
          </div>
        )}
        <button className={s.themeBtn} onClick={onToggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  )
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}
