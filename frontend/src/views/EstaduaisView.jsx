import { useState } from 'react'
import { api } from '../api'
import { StatusBar } from '../components/StatusBar'
import { ResultTable } from '../components/ResultTable'
import tableStyles from '../components/ResultTable.module.css'
import { StatusBadge } from '../components/StatusBadge'
import s from './opPage.module.css'

const NOME_UF = {
  SC: 'Santa Catarina', PR: 'Paraná', RO: 'Rondônia',
  GO: 'Goiás', RN: 'Rio Grande do Norte', ES: 'Espírito Santo',
}

function classificar(r) {
  if (!r) return { texto: 'indisponível', cor: null }
  if (r.erro) return { texto: 'erro: ' + r.erro, cor: 'red' }
  if (r.encontrado === false) return { texto: 'não encontrado', cor: null }
  if (r.encontrado == null) return { texto: 'indisponível', cor: null }
  const situ = (r.situacao || '').toLowerCase()
  if (situ.includes('não') || situ.includes('nao')) return { texto: r.situacao, cor: 'red' }
  return { texto: r.situacao || 'liberado', cor: 'green' }
}

export function EstaduaisView() {
  const [nome, setNome]       = useState('')
  const [status, setStatus]   = useState('idle')
  const [message, setMessage] = useState('')
  const [took, setTook]       = useState(null)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nome.trim()) return
    setStatus('loading')
    setMessage('consultando estados...')
    setResult(null)
    setError(null)
    const t0 = performance.now()
    try {
      const data = await api.verificarEstaduais(nome.trim())
      const ms = Math.round(performance.now() - t0)
      if (!data.ok) throw new Error(data.error)
      setResult(data)
      setStatus('ok')
      setMessage(data.aviso || (data.ma ? `MA ${data.ma} —` : 'sucesso —'))
      setTook(ms)
    } catch (err) {
      setStatus('err')
      setMessage('erro: ' + err.message)
      setError(err.message)
    }
  }

  const ufs = result?.resultados ? Object.keys(result.resultados) : []
  const tableRows = ufs.map(uf => {
    const { texto, cor } = classificar(result.resultados[uf])
    const r = result.resultados[uf]
    return [
      <b key="uf">{uf}</b>,
      <span key="nomeuf" style={{ color: 'var(--dim)' }}>{NOME_UF[uf] || uf}</span>,
      <StatusBadge key="badge" cor={cor} situacao={texto} />,
      <span key="det" style={{ color: 'var(--dim)' }}>{r?.titular || r?.classe || ''}</span>,
    ]
  })

  const toolbar = result?.ma && (
    <span className={tableStyles.toolbarMeta}>MA: <b>{result.ma}</b></span>
  )

  const emptyNode = result && (
    <div className={tableStyles.emptyState}>
      {result.aviso || `Nenhum estado consultado para "${nome}".`}
    </div>
  )

  return (
    <section className={s.section}>
      <div className={s.opHeader}>
        <h3>Verificar nos estados</h3>
        <span className={s.tag}>UF</span>
      </div>
      <p className={s.desc}>
        Resolve o MA do produto via Agrofit e consulta se está liberado em cada sistema
        estadual já integrado (PR, SC, RO, GO, RN, ES).
      </p>

      <form className={s.formRow} onSubmit={handleSubmit}>
        <div className={s.field}>
          <label htmlFor="estNome">Produto</label>
          <input
            id="estNome"
            type="text"
            value={nome}
            placeholder="ex: LAMBDA CIALOTRIN CCAB 250 CS"
            onChange={e => setNome(e.target.value)}
          />
        </div>
        <button type="submit" className={s.runBtn} disabled={status === 'loading'}>
          executar
        </button>
      </form>

      <StatusBar status={status} message={message} took={took} />

      {(result || error) && (
        <ResultTable
          headers={['UF', 'Estado', 'Situação', 'Detalhe']}
          rows={tableRows}
          toolbar={toolbar}
          emptyNode={emptyNode}
        />
      )}
    </section>
  )
}
