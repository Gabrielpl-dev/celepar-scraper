import { useState, useEffect } from 'react'
import { api } from '../api'
import s from './BulaView.module.css'

export function BulaView({ params }) {
  const [docs, setDocs]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState(null)
  const [pdfUrl, setPdfUrl]   = useState(null)

  const ma = params?.ma

  useEffect(() => {
    if (!ma) { setDocs(null); setErro(null); return }
    setLoading(true)
    setDocs(null)
    setErro(null)
    setPdfUrl(null)
    api.agrofitDocs(ma)
      .then(data => {
        if (!data.ok) { setErro(data.error || 'Erro ao buscar documentos'); return }
        setDocs(data)
        const bula = data.documentos?.find(d => d.tipo === 'Bula')
        if (bula?.url) setPdfUrl('/api/agrofit-pdf?url=' + encodeURIComponent(bula.url))
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }, [ma])

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
        <h3 className={s.title}>Bula</h3>
        {docs?.nome && <p className={s.desc}>{docs.nome} · MA {docs.ma}</p>}
      </div>

      {loading && <p className={s.status}>buscando documentos...</p>}
      {erro    && <p className={s.erro}>{erro}</p>}

      {docs && !loading && (
        <div className={s.body}>
          {pdfUrl ? (
            <iframe className={s.iframe} src={pdfUrl} title="Bula" />
          ) : (
            <p className={s.status}>Bula não encontrada para este produto.</p>
          )}

          {docs.documentos?.length > 0 && (
            <div className={s.sidebar}>
              <div className={s.sideTitle}>Documentos</div>
              {docs.documentos.map((doc, i) => {
                const proxy = '/api/agrofit-pdf?url=' + encodeURIComponent(doc.url)
                return (
                  <div
                    key={i}
                    className={`${s.docItem} ${pdfUrl === proxy ? s.docItemActive : ''}`}
                    onClick={() => setPdfUrl(proxy)}
                  >
                    <span className={s.docTipo}>{doc.tipo}</span>
                    <span className={s.docDesc}>{doc.descricao}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
