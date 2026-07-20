import { useState, useEffect } from 'react'
import { api, downloadCSV, csvEsc } from '../api'
import { StatusBar } from '../components/StatusBar'
import { ResultTable, tableStyles } from '../components/ResultTable'
import { SiagroPill } from '../components/SiagroPill'
import s from './ExtrairView.module.css'

function testeCccbUrl(params) {
  const q = new URLSearchParams()
  if (params?.nome) q.set('nome', params.nome)
  if (params?.Cod)  q.set('Cod', params.Cod)
  if (params?.ma)   q.set('ma', params.ma)
  const qs = q.toString()
  return qs ? `/teste-cccb?${qs}` : '/teste-cccb'
}

export function ExtrairView({ params }) {
  const [culturas, setCulturas]     = useState([])
  const [inputNome, setInputNome]   = useState('')
  const [culturaid, setCultureid]   = useState(null)
  const [status, setStatus]         = useState('idle')
  const [message, setMessage]       = useState('')
  const [took, setTook]             = useState(null)
  const [result, setResult]         = useState(null)
  const [buildMsg, setBuildMsg]     = useState('')
  const [syncMsg, setSyncMsg]       = useState('')

  useEffect(() => {
    api.cccbCulturas().then(data => { if (data.ok) setCulturas(data.culturas) })
  }, [])

  function handleInputChange(e) {
    const v = e.target.value
    setInputNome(v)
    const found = culturas.find(c => c.nome === v)
    setCultureid(found?.culturaid ?? null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    setMessage('consultando celepar e banco...')
    setResult(null)
    const t0 = performance.now()
    try {
      const data = await api.cccb(culturaid, params)
      const ms   = Math.round(performance.now() - t0)
      if (!data.ok) throw new Error(data.error)
      setResult(data)
      setStatus('ok')
      setMessage(`banco: ${data.oracle.length} | celepar: ${data.celepar.length} | corretos: ${data.corretos.length} | errados: ${data.errados.length} —`)
      setTook(ms)
    } catch (err) {
      setStatus('err')
      setMessage('erro: ' + err.message)
    }
  }

  async function handleSyncCulturas() {
    setSyncMsg('sincronizando...')
    try {
      const data = await api.sincronizarCulturas()
      if (!data.ok) { setSyncMsg('erro: ' + data.error); return }
      setSyncMsg(`${data.total} culturas sincronizadas`)
      api.cccbCulturas().then(d => { if (d.ok) setCulturas(d.culturas) })
    } catch (err) {
      setSyncMsg('erro: ' + err.message)
    }
  }

  async function handleBuildMapping() {
    setBuildMsg('gerando...')
    try {
      const data = await api.cccbBuildMapping(params)
      if (!data.ok) { setBuildMsg('erro: ' + data.error); return }
      const semMatch = data.unmatched.length ? data.unmatched.join(', ') : 'nenhuma'
      setBuildMsg(`${data.matched}/${data.total} culturas mapeadas. Sem match: ${semMatch}`)
    } catch (err) {
      setBuildMsg('erro: ' + err.message)
    }
  }

  function handleExport() {
    const csv = [
      'Cultura,Alvo SB,Alvo Siagro,Diagnóstico',
      ...result.corretos.map(r => [r.cultura, r.alvo_sb, r.alvo_siagro, r.diagnostico].map(csvEsc).join(',')),
    ]
    downloadCSV('cccb_corretos.csv', csv)
  }

  const oracleRows  = result?.oracle.map(r => [
    r.cultura,
    <SiagroPill key="alv" code={r.siagroalv} />,
    r.diagnostico,
  ]) ?? []

  const celeparRows = result?.celepar.map(r => [
    r.cultura,
    <SiagroPill key="alv" code={r.siagro} />,
    r.alvo,
  ]) ?? []

  const erradoRows = result?.errados.map(r => [
    r.cultura,
    <SiagroPill key="sb" code={r.alvo_sb} />,
    r.diagnosticoid,
    r.diagnostico,
  ]) ?? []

  const corretoRows = result?.corretos.map(r => [
    r.cultura,
    <SiagroPill key="sb"  code={r.alvo_sb} />,
    <SiagroPill key="cel" code={r.alvo_siagro} />,
    r.diagnostico,
  ]) ?? []

  const exportToolbar = result && (
    <>
      <button className={tableStyles.ghostBtn} onClick={handleExport}>↓ exportar csv</button>
      <span className={tableStyles.toolbarMeta}>{inputNome || 'todas as culturas'}</span>
    </>
  )

  return (
    <section className={s.section}>
      <div className={s.opHeader}>
        <h3>Comparar Cultura Celepar com o Banco</h3>
        <span className={s.tag}>CCCB</span>
        <button
          className={s.newTabBtn}
          title="Abrir em nova aba"
          onClick={() => window.open(testeCccbUrl(params), '_blank')}
        >
          ↗
        </button>
      </div>
      <p className={s.desc}>
        Cruza os diagnósticos do banco (ATIVO = Sim) com o Celepar. Deixe o campo vazio para todas as culturas.
      </p>

      <form className={s.formRow} onSubmit={handleSubmit}>
        <div className={s.field}>
          <label htmlFor="extCultura">Cultura</label>
          <input
            id="extCultura"
            type="text"
            list="culturas-list"
            value={inputNome}
            placeholder="todas as culturas"
            onChange={handleInputChange}
          />
          <datalist id="culturas-list">
            {culturas.map(c => <option key={c.culturaid} value={c.nome} />)}
          </datalist>
        </div>
        <button type="submit" className={s.runBtn} disabled={status === 'loading'}>
          executar
        </button>
      </form>

      <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className={tableStyles.ghostBtn} onClick={handleSyncCulturas}>
          ↻ sincronizar culturas
        </button>
        {syncMsg && <span className={tableStyles.toolbarMeta}>{syncMsg}</span>}
        <button type="button" className={tableStyles.ghostBtn} onClick={handleBuildMapping}>
          ⚙ gerar mapeamento
        </button>
        {buildMsg && <span className={tableStyles.toolbarMeta}>{buildMsg}</span>}
      </div>

      <StatusBar status={status} message={message} count={null} took={took} />

      {result && oracleRows.length > 0 && (
        <ResultTable
          collapsible
          defaultOpen={false}
          headers={['Cultura', 'Alvo SB', 'Diagnóstico']}
          rows={oracleRows}
          toolbar={<span className={tableStyles.toolbarMeta}>Banco — {oracleRows.length} registro(s)</span>}
        />
      )}

      {result && celeparRows.length > 0 && (
        <ResultTable
          collapsible
          defaultOpen={false}
          headers={['Cultura', 'Alvo Siagro', 'Alvo']}
          rows={celeparRows}
          toolbar={<span className={tableStyles.toolbarMeta}>Celepar — {celeparRows.length} registro(s)</span>}
        />
      )}

      {result && erradoRows.length > 0 && (
        <ResultTable
          collapsible
          defaultOpen={false}
          headers={['Cultura', 'Alvo SB', 'DIAGNOSTICOID', 'Diagnóstico']}
          rows={erradoRows}
          toolbar={<span className={tableStyles.toolbarMeta}>Errados — {erradoRows.length} registro(s)</span>}
        />
      )}

      {result && (
        <ResultTable
          collapsible
          defaultOpen={true}
          headers={['Cultura', 'Alvo SB', 'Alvo Siagro', 'Diagnóstico']}
          rows={corretoRows}
          toolbar={exportToolbar}
          emptyNode={
            <div className={tableStyles.emptyState}>
              Nenhum cruzamento encontrado para <code>{inputNome || 'todas as culturas'}</code>.
            </div>
          }
        />
      )}
    </section>
  )
}
