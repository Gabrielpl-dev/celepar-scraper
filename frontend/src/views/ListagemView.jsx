import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { StatusBar } from '../components/StatusBar'
import { ResultTable, tableStyles } from '../components/ResultTable'
import { SiagroPill } from '../components/SiagroPill'
import s from './opPage.module.css'

export function ListagemView({ params }) {
  const [status, setStatus]   = useState('idle')
  const [message, setMessage] = useState('')
  const [count, setCount]     = useState(null)
  const [took, setTook]       = useState(null)
  const [result, setResult]   = useState(null)

  const fetchData = useCallback(async () => {
    setStatus('loading')
    setMessage('consultando celepar...')
    setResult(null)
    const t0 = performance.now()
    try {
      const data = await api.listar(params)
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
    }
  }, [params.ma])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const tableRows = result?.rows.slice(0, 500).map(r => [
    r.cultura,
    <SiagroPill key={r.siagro} code={r.siagro} />,
    r.alvo,
    <span key="prods">
      {r.produtos.map((p, i) => {
        const color = p.cor === 'red' ? 'var(--red)' : p.cor === 'green' ? 'var(--green)' : 'var(--dim)'
        return (
          <span key={i} style={{ color }}>
            {i > 0 && ' · '}{p.nome}
          </span>
        )
      })}
    </span>,
  ]) ?? []

  const toolbar = result && (
    <span className={tableStyles.toolbarMeta}>
      primeiras 500 linhas · url:{' '}
      <a href={result.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-2)' }}>
        abrir original ↗
      </a>
    </span>
  )

  return (
    <section className={s.section}>
      <div className={s.opHeader}>
        <h3>Culturas</h3>
      </div>
      <p className={s.desc}>
        Todas as culturas registradas para o produto selecionado.
      </p>

      <StatusBar status={status} message={message} count={count} took={took} />

      {result && (
        <ResultTable
          headers={['Cultura', 'SIAGRO', 'Alvo', 'Produtos (cor)']}
          rows={tableRows}
          toolbar={toolbar}
          noScroll
          emptyNode={<div className={tableStyles.emptyState}>Nada retornado.</div>}
        />
      )}
    </section>
  )
}
