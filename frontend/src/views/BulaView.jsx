import { useState, useEffect } from 'react'
import { api } from '../api'
import s from './BulaView.module.css'

export function BulaView({ params }) {
  const [docs, setDocs]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState(null)
  const [pdfUrl, setPdfUrl]   = useState(null)
  const [selected, setSelected] = useState('')

  const ma = params?.ma

  useEffect(() => {
    if (!ma) { setDocs(null); setErro(null); setPdfUrl(null); setSelected(''); return }
    setLoading(true)
    setDocs(null)
    setErro(null)
    setPdfUrl(null)
    setSelected('')
    api.agrofitDocs(ma)
      .then(data => {
        if (!data.ok) { setErro(data.error || 'Erro ao buscar documentos'); return }
        setDocs(data)
        const bula = data.documentos?.find(d => d.tipo === 'Bula')
        const first = bula || data.documentos?.[0]
        if (first?.url) {
          const proxy = '/api/agrofit-pdf?url=' + encodeURIComponent(first.url)
          setPdfUrl(proxy)
          setSelected(first.url)
        }
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }, [ma])

  function handleSelect(e) {
    const url = e.target.value
    setSelected(url)
    setPdfUrl('/api/agrofit-pdf?url=' + encodeURIComponent(url))
  }

  if (!ma) return (
    <section className={s.section}>
      <div className={s.header}>
        <h3 className={s.title}>Bula</h3>
        <p className={s.desc}>Configure o produto em <strong>Parâmetros</strong> primeiro.</p>
      </div>
    </section>
  )

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div className={s.titleRow}>
          <h3 className={s.title}>Bula</h3>
          {docs?.documentos?.length > 0 && (
            <select className={s.select} value={selected} onChange={handleSelect}>
              {docs.documentos.map((doc, i) => (
                <option key={i} value={doc.url}>
                  {doc.tipo}{doc.descricao ? ` — ${doc.descricao}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        {docs?.nome && <p className={s.desc}>{docs.nome} · MA {docs.ma}</p>}
      </div>

      {loading && <p className={s.status}>buscando documentos...</p>}
      {erro    && <p className={s.erro}>{erro}</p>}

      {docs && !loading && (
        pdfUrl
          ? <iframe className={s.iframe} src={pdfUrl} title="Bula" />
          : <p className={s.status}>Bula não encontrada para este produto.</p>
      )}
    </section>
  )
}
