import { useState } from 'react'
import { api, downloadCSV, csvEsc } from '../api'
import { StatusBar } from '../components/StatusBar'
import { ResultTable, tableStyles } from '../components/ResultTable'
import { SiagroPill } from '../components/SiagroPill'
import s from './ExtrairView.module.css'

export function ExtrairView({ params }) {
  const [cultura, setCultura] = useState('')
  const [status, setStatus]   = useState('idle')
  const [message, setMessage] = useState('')
  const [count, setCount]     = useState(null)
  const [took, setTook]       = useState(null)
  const [result, setResult]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    setMessage('consultando celepar e banco...')
    setResult(null)
    const t0 = performance.now()
    try {
      const data = await api.cccb(cultura, params)
      const ms = Math.round(performance.now() - t0)
      if (!data.ok) throw new Error(data.error)
      setResult(data)
      setStatus('ok')
      setMessage('sucesso —')
      setCount(data.corretos.length)
      setTook(ms)
    } catch (err) {
      setStatus('err')
      setMessage('erro: ' + err.message)
    }
  }

  function handleExport() {
    const csv = [
      'Cultura,Alvo SB,Alvo Siagro,Diagnóstico',
      ...result.corretos.map(r => [r.cultura, r.alvo_sb, r.alvo_siagro, r.diagnostico].map(csvEsc).join(',')),
    ]
    downloadCSV('cccb_corretos.csv', csv)
  }

  const corretoRows = result?.corretos.map(r => [
    r.cultura,
    <SiagroPill key="sb"  code={r.alvo_sb} />,
    <SiagroPill key="cel" code={r.alvo_siagro} />,
    r.diagnostico,
  ]) ?? []

  const toolbar = result && (
    <>
      <button className={tableStyles.ghostBtn} onClick={handleExport}>↓ exportar csv</button>
      <span className={tableStyles.toolbarMeta}>cultura: <b>{cultura}</b></span>
    </>
  )

  const emptyNode = result && (
    <div className={tableStyles.emptyState}>
      Nenhum registro correto para <code>{cultura}</code>.
    </div>
  )

  return (
    <section className={s.section}>
      <div className={s.opHeader}>
        <h3>Comparar Cultura Celepar com o Banco</h3>
        <span className={s.tag}>CCCB</span>
      </div>
      <p className={s.desc}>
        Cruza os diagnósticos cadastrados no banco (ATIVO = Sim) com os registros do Celepar para a cultura informada. Exibe os que têm código SIAGRO coincidente.
      </p>

      <form className={s.formRow} onSubmit={handleSubmit}>
        <div className={s.field}>
          <label htmlFor="extCultura">Cultura</label>
          <input
            id="extCultura"
            type="text"
            value={cultura}
            placeholder="ex: Abacaxi"
            onChange={e => setCultura(e.target.value)}
          />
        </div>
        <button type="submit" className={s.runBtn} disabled={status === 'loading'}>
          executar
        </button>
      </form>

      <StatusBar status={status} message={message} count={count} took={took} />

      {result && (
        <ResultTable
          headers={['Cultura', 'Alvo SB', 'Alvo Siagro', 'Diagnóstico']}
          rows={corretoRows}
          toolbar={toolbar}
          emptyNode={emptyNode}
        />
      )}
    </section>
  )
}
