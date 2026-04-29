import { useState } from 'react'
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
  extrair:  ExtrairView,
  siagro:   SiagroView,
  comparar: CompararView,
  verificar: VerificarView,
  raw:      ListagemView,
}

export default function App() {
  const [activeView, setActiveView] = useState('extrair')
  const [params, setParams] = useState({ Cod: '2968', descIngrediente: '' })

  const View = VIEWS[activeView]

  return (
    <div className={s.app}>
      <Header />
      <div className={s.wrap}>
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          params={params}
          setParams={setParams}
        />
        <main className={s.main}>
          <View params={params} />
        </main>
      </div>
      <footer className={s.footer}>
        <span>backend node + cheerio · sem browser, sem CORS</span>
        <span>
          fonte:{' '}
          <a href="https://celepar07web.pr.gov.br/agrotoxicos/" target="_blank" rel="noreferrer">
            celepar07web.pr.gov.br
          </a>
        </span>
      </footer>
    </div>
  )
}
