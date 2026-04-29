import { useState } from 'react'
import { api, downloadCSV, csvEsc } from '../api'
import { StatusBar } from '../components/StatusBar'
import { ResultTable, tableStyles } from '../components/ResultTable'
import { SiagroPill } from '../components/SiagroPill'
import s from './ExtrairView.module.css'

export function ExtrairView({ params }) {
  const [cultura, setCultura] = useState('Abacaxi')
  const [status, setStatus]   = useState('idle')
  const [message, setMessage] = useState('')
  const [count, setCount]     = useState(null)
  const [took, setTook]       = useState(null)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    setMessage('consultando celepar...')
    setResult(null)
    const t0 = performance.now()
    try {
      const data = await api.extrairCultura(cultura, params)
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
    const csv = ['Cultura,SIAGRO,Alvo', ...rows.map(r => [r.cultura, r.siagro, r.alvo].map(csvEsc).join(','))]
    downloadCSV('extrair_cultura.csv', csv)
  }

  const tableRows = result?.rows.map(r => [
    r.cultura,
    <SiagroPill key={r.siagro} code={r.siagro} />,
    r.alvo,
    <input type="checkbox" key="cb" />,
  ]) ?? []

  const toolbar = result && (
    <>
      <button className={tableStyles.ghostBtn} onClick={handleExport}>↓ exportar csv</button>
      <span className={tableStyles.toolbarMeta}>cultura: <b>{result.cultura}</b></span>
    </>
  )

  const emptyNode = result && (
    <div className={tableStyles.emptyState}>
      Nenhum registro para <code>{cultura}</code>.
    </div>
  )

  return (
    <section className={s.section}>
      <div className={s.opHeader}>
        <h3>Extrair SIAGRO por cultura</h3>
        <span className={s.tag}>script 01</span>
      </div>
      <p className={s.desc}>
        Pesquisa todas as linhas cuja coluna "Cultura" bate exatamente com o nome informado (case e acento insensitivos). Retorna SIAGRO e Alvo de cada uma.
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

      {(result || error) && (
        <ResultTable
          headers={['Cultura', 'SIAGRO', 'Alvo', '✓']}
          rows={tableRows}
          toolbar={toolbar}
          emptyNode={emptyNode}
        />
      )}
    </section>
  )
}
