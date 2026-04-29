import { useState } from 'react'
import { api, downloadCSV, csvEsc } from '../api'
import { StatusBar } from '../components/StatusBar'
import { ResultTable, tableStyles } from '../components/ResultTable'
import { SiagroPill } from '../components/SiagroPill'
import s from './ExtrairView.module.css'

export function SiagroView({ params }) {
  const [siagro, setSiagro] = useState('566')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [count, setCount]   = useState(null)
  const [took, setTook]     = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!siagro.trim()) return
    setStatus('loading')
    setMessage('consultando celepar...')
    setResult(null)
    const t0 = performance.now()
    try {
      const data = await api.buscarSiagro(siagro, params)
      const ms = Math.round(performance.now() - t0)
      if (!data.ok) throw new Error(data.error)
      setResult(data)
      setStatus('ok')
      setMessage('sucesso —')
      setCount(data.total)
      setTook(ms)
    } catch (err) {
      setStatus('err')
      setMessage('erro: ' + err.message)
      setError(err.message)
    }
  }

  function handleExport() {
    const rows = result.rows
    const csv = ['SIAGRO,Cultura,Alvo', ...rows.map(r => [r.siagro, r.cultura, r.alvo].map(csvEsc).join(','))]
    downloadCSV('busca_siagro.csv', csv)
  }

  const tableRows = result?.rows.map(r => [
    r.cultura,
    <SiagroPill key={r.siagro} code={r.siagro} />,
    r.alvo,
  ]) ?? []

  const toolbar = result && (
    <>
      <button className={tableStyles.ghostBtn} onClick={handleExport}>↓ exportar csv</button>
      <span className={tableStyles.toolbarMeta}>siagro: <b>{result.siagro}</b></span>
    </>
  )

  const emptyNode = result && (
    <div className={tableStyles.emptyState}>
      SIAGRO <code>{siagro}</code> não encontrado.
    </div>
  )

  return (
    <section className={s.section}>
      <div className={s.opHeader}>
        <h3>Buscar por SIAGRO</h3>
        <span className={s.tag}>script 02</span>
      </div>
      <p className={s.desc}>
        Dado um código SIAGRO, descobre em quais culturas ele aparece (deduplicando por nome de cultura).
      </p>

      <form className={s.formRow} onSubmit={handleSubmit}>
        <div className={s.field}>
          <label htmlFor="siagroAlvo">SIAGRO</label>
          <input
            id="siagroAlvo"
            type="number"
            value={siagro}
            placeholder="ex: 566"
            onChange={e => setSiagro(e.target.value)}
          />
        </div>
        <button type="submit" className={s.runBtn} disabled={status === 'loading'}>
          executar
        </button>
      </form>

      <StatusBar status={status} message={message} count={count} took={took} />

      {(result || error) && (
        <ResultTable
          headers={['Cultura', 'SIAGRO', 'Alvo']}
          rows={tableRows}
          toolbar={toolbar}
          emptyNode={emptyNode}
        />
      )}
    </section>
  )
}
