import React from 'react'
import s from './Sidebar.module.css'
import { api } from '../api'

const SERVICOS = [
  { id: 'cadastro', num: '01', label: 'Cadastro' },
  { id: 'revisao',  num: '02', label: 'Revisão'  },
]

const OPS = {
  cadastro: [
    { id: 'bula', num: '01', label: 'Bula' },
  ],
  revisao: [
    { id: 'culturas',  num: '01', label: 'Culturas' },
    { id: 'extrair',   num: '02', label: 'CCCB', title: 'Comparar Cultura Celepar com o Banco' },
    { id: 'siagro',    num: '03', label: 'Buscar por SIAGRO' },
    { id: 'comparar',  num: '04', label: 'Comparar culturas' },
    { id: 'verificar', num: '05', label: 'Verificar produto' },
  ],
}

async function openBulaTab(ma) {
  if (!ma) return
  const data = await api.agrofitDocs(ma)
  const doc = data.documentos?.find(d => d.tipo === 'Bula') ?? data.documentos?.[0]
  if (doc?.url) window.open('/api/agrofit-pdf?url=' + encodeURIComponent(doc.url), '_blank')
}

export function Sidebar({ activeView, setActiveView, activeService, setActiveService, open, onToggle, params }) {
  const ops = OPS[activeService] ?? []

  return (
    <aside className={s.aside}>
      <button className={s.collapseIcon} onClick={onToggle} title={open ? 'Fechar sidebar' : 'Abrir sidebar'}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <line x1="6" y1="1" x2="6" y2="17" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
      </button>
      <div className={`${s.content} ${open ? '' : s.contentHidden}`}>

        <h2 className={s.sectionTitle}>Serviços</h2>
        <div className={s.ops}>
          {SERVICOS.map(sv => (
            <button
              key={sv.id}
              className={`${s.op} ${activeService === sv.id ? s.opActive : ''}`}
              onClick={() => setActiveService(sv.id)}
            >
              <span className={s.num}>{sv.num}</span>
              {sv.label}
            </button>
          ))}
        </div>

        <h2 className={s.sectionTitle}>Operações</h2>
        <div className={s.ops}>
          {ops.map(op => (
            <button
              key={op.id}
              className={`${s.op} ${activeView === op.id ? s.opActive : ''}`}
              onClick={() => setActiveView(op.id)}
              title={op.title}
            >
              <span className={s.num}>{op.num}</span>
              <span className={s.opLabel}>{op.label}</span>
              {op.id === 'bula' && (
                <span
                  className={s.newTabBtn}
                  role="button"
                  title="Abrir em nova aba"
                  onClick={e => { e.stopPropagation(); openBulaTab(params?.ma) }}
                >
                  ↗
                </span>
              )}
            </button>
          ))}
        </div>

      </div>
    </aside>
  )
}
