import { useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'
import './global.css'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { ExtrairView } from './views/ExtrairView'
import { SiagroView } from './views/SiagroView'
import { CompararView } from './views/CompararView'
import { VerificarView } from './views/VerificarView'
import { ListagemView } from './views/ListagemView'
import { ParamsView } from './views/ParamsView'
import { BulaView } from './views/BulaView'
import { AuthView } from './views/AuthView'
import s from './App.module.css'

const VIEWS = {
  bula:      BulaView,
  culturas:  ListagemView,
  extrair:   ExtrairView,
  siagro:    SiagroView,
  comparar:  CompararView,
  verificar: VerificarView,
  params:    ParamsView,
}

export default function App() {
  const [theme, setTheme]             = useState(() => localStorage.getItem('theme') || 'light')
  const [activeView, setActiveView]   = useState('culturas')
  const [activeService, setActiveService] = useState('revisao')
  const [params, setParams]           = useState({ Cod: '', ma: '', nome: '' })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [token, setToken]             = useState(() => {
    const tok = localStorage.getItem('token')
    if (!tok) return null
    try {
      const { exp } = jwtDecode(tok)
      if (exp && Date.now() / 1000 > exp) { localStorage.removeItem('token'); return null }
      return tok
    } catch { localStorage.removeItem('token'); return null }
  })
  const [username, setUsername]       = useState(() => {
    const tok = localStorage.getItem('token')
    if (!tok) return null
    try { return jwtDecode(tok).username } catch { return null }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  function handleAuth(tok, user) {
    setToken(tok)
    setUsername(user)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setToken(null)
    setUsername(null)
  }

  if (!token) return <AuthView onAuth={handleAuth} />

  const View = VIEWS[activeView] ?? null

  return (
    <div className={s.app}>
      <Header
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        paramsActive={activeView === 'params'}
        produtoNome={params.nome}
        onParams={() => { setActiveView('params'); setActiveService(null) }}
        username={username}
        onLogout={handleLogout}
      />
      <div className={`${s.wrap} ${sidebarOpen ? '' : s.wrapCollapsed}`}>
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          activeService={activeService}
          setActiveService={setActiveService}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(v => !v)}
          params={params}
        />
        <main className={s.main}>
          {View && <View params={params} setParams={setParams} />}
        </main>
      </div>
    </div>
  )
}
