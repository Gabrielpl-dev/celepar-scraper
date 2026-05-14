import { useState, useEffect } from 'react'
import './global.css'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { ExtrairView } from './views/ExtrairView'
import { SiagroView } from './views/SiagroView'
import { CompararView } from './views/CompararView'
import { VerificarView } from './views/VerificarView'
import { ListagemView } from './views/ListagemView'
import s from './App.module.css'

const VIEWS = {
  culturas:  ListagemView,
  extrair:   ExtrairView,
  siagro:    SiagroView,
  comparar:  CompararView,
  verificar: VerificarView,
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [activeView, setActiveView] = useState('culturas')
  const [params, setParams] = useState({ Cod: '' })
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  const View = VIEWS[activeView] ?? null

  return (
    <div className={s.app}>
      <Header theme={theme} onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />
      <div className={`${s.wrap} ${sidebarOpen ? '' : s.wrapCollapsed}`}>
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          params={params}
          setParams={setParams}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(v => !v)}
        />
        <main className={s.main}>
          {View && <View params={params} />}
        </main>
      </div>
    </div>
  )
}
