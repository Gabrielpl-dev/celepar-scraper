import { useState } from 'react'
import { api } from '../api'
import { StatusBar } from '../components/StatusBar'
import { ResultTable, tableStyles } from '../components/ResultTable'
import { StatusBadge } from '../components/StatusBadge'
import s from './ExtrairView.module.css'

export function VerificarView({ params }) {
  const [termo, setTermo]     = useState('')
  const [status, setStatus]   = useState('idle')
  const [message, setMessage] = useState('')
  const [count, setCount]     = useState(null)
  const [took, setTook]       = useState(null)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!termo.trim()) return
    setStatus('loading')
    setMessage('consultando celepar...')
    setResult(null)
    const t0 = performance.now()
    try {
      const data = await api.verificar(termo, params)
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

  const tableRows = result?.rows.map(r => [
    r.nome,
    <StatusBadge key="badge" cor={r.cor} situacao={r.situacao} />,
    <span key="class" style={{ color: 'var(--dim)' }}>{r.classificacao}</span>,
    <span key="emp" style={{ color: 'var(--dim)' }}>{r.empresa}</span>,
  ]) ?? []

  const toolbar = result && (
    <span className={tableStyles.toolbarMeta}>termo: <b>{result.termo}</b></span>
  )

  const emptyNode = result && (
    <div className={tableStyles.emptyState}>
      Nenhum produto com <code>{termo}</code> encontrado.
    </div>
  )

  return (
    <section className={s.section}>
      <div className={s.opHeader}>
        <h3>Verificar produto</h3>
        <span className={s.tag}>05</span>
      </div>
      <p className={s.desc}>
        Procura linhas que contenham um termo (ex: nome de produto). Devolve o status pela cor do &lt;font&gt;:{' '}
        <span style={{ color: 'var(--red)', fontWeight: 700 }}>vermelho = tóxico</span>
        {' · '}
        <span style={{ color: 'var(--green)', fontWeight: 700 }}>verde = seguro</span>.
      </p>

      <form className={s.formRow} onSubmit={handleSubmit}>
        <div className={s.field}>
          <label htmlFor="verTermo">Termo</label>
          <input
            id="verTermo"
            type="text"
            value={termo}
            placeholder="ex: BELURE"
            onChange={e => setTermo(e.target.value)}
          />
        </div>
        <button type="submit" className={s.runBtn} disabled={status === 'loading'}>
          executar
        </button>
      </form>

      <StatusBar status={status} message={message} count={count} took={took} />

      {(result || error) && (
        <ResultTable
          headers={['Produto', 'Situação', 'Classificação Tox', 'Empresa']}
          rows={tableRows}
          toolbar={toolbar}
          emptyNode={emptyNode}
        />
      )}
    </section>
  )
}
