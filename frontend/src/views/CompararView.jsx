import { useState } from 'react'
import { api, downloadCSV, csvEsc } from '../api'
import { StatusBar } from '../components/StatusBar'
import { SiagroPill } from '../components/SiagroPill'
import { tableStyles } from '../components/ResultTable'
import s from './CompararView.module.css'
import formS from './ExtrairView.module.css'

export function CompararView({ params }) {
  const [c1, setC1]           = useState('')
  const [c2, setC2]           = useState('')
  const [status, setStatus]   = useState('idle')
  const [message, setMessage] = useState('')
  const [count, setCount]     = useState(null)
  const [took, setTook]       = useState(null)
  const [result, setResult]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!c1.trim() || !c2.trim()) return
    setStatus('loading')
    setMessage('consultando celepar...')
    setResult(null)
    const t0 = performance.now()
    try {
      const data = await api.comparar(c1, c2, params)
      const ms = Math.round(performance.now() - t0)
      if (!data.ok) throw new Error(data.error)
      setResult(data)
      setStatus('ok')
      setMessage(`${c1}: ${data.total1} · ${c2}: ${data.total2} · diff:`)
      setCount(data.exclusivos1.length + data.exclusivos2.length)
      setTook(ms)
    } catch (err) {
      setStatus('err')
      setMessage('erro: ' + err.message)
    }
  }

  function handleExport() {
    const d = result
    const lines = ['Categoria,SIAGRO,Cultura,Alvo']
    d.exclusivos1.forEach(r => lines.push(['Exclusivo_1', r.siagro, d.cultura1, r.alvo].map(csvEsc).join(',')))
    d.exclusivos2.forEach(r => lines.push(['Exclusivo_2', r.siagro, d.cultura2, r.alvo].map(csvEsc).join(',')))
    d.comuns.forEach(r =>
      lines.push(['Comum', r.siagro, `${d.cultura1} | ${d.cultura2}`, `${r.alvo1} | ${r.alvo2}`].map(csvEsc).join(',')))
    downloadCSV('comparar.csv', lines)
  }

  function renderList(items, fmt) {
    if (!items.length) return <div className={s.cmpEmpty}>(nenhum)</div>
    return items.map(fmt)
  }

  return (
    <section>
      <div className={formS.opHeader}>
        <h3>Comparar duas culturas</h3>
        <span className={formS.tag}>script 03</span>
      </div>
      <p className={formS.desc}>
        Compara o conjunto de SIAGRO entre duas culturas. Mostra exclusivos de cada uma e os comuns às duas.
      </p>

      <form className={formS.formRow} onSubmit={handleSubmit}>
        <div className={formS.field}>
          <label htmlFor="cmpC1">Cultura 1</label>
          <input id="cmpC1" type="text" value={c1} placeholder="ex: Abacaxi" onChange={e => setC1(e.target.value)} />
        </div>
        <div className={formS.field}>
          <label htmlFor="cmpC2">Cultura 2</label>
          <input id="cmpC2" type="text" value={c2} placeholder="ex: Banana" onChange={e => setC2(e.target.value)} />
        </div>
        <button type="submit" className={formS.runBtn} disabled={status === 'loading'}>
          executar
        </button>
      </form>

      <StatusBar status={status} message={message} count={count} took={took} />

      {result && (
        <>
          <div className={s.cmpGrid}>
            <div className={`${s.cmpBox} ${s.exclusivo1}`}>
              <h4>Exclusivos · {result.cultura1} <span className={s.boxCount}>{result.exclusivos1.length}</span></h4>
              <div className={s.cmpList}>
                {renderList(result.exclusivos1, r => (
                  <div key={r.siagro} className={s.cmpItem}>
                    <SiagroPill code={r.siagro} /> {r.alvo}
                  </div>
                ))}
              </div>
            </div>

            <div className={`${s.cmpBox} ${s.exclusivo2}`}>
              <h4>Exclusivos · {result.cultura2} <span className={s.boxCount}>{result.exclusivos2.length}</span></h4>
              <div className={s.cmpList}>
                {renderList(result.exclusivos2, r => (
                  <div key={r.siagro} className={s.cmpItem}>
                    <SiagroPill code={r.siagro} /> {r.alvo}
                  </div>
                ))}
              </div>
            </div>

            <div className={`${s.cmpBox} ${s.comum}`}>
              <h4>Comuns às duas <span className={s.boxCount}>{result.comuns.length}</span></h4>
              <div className={s.cmpList}>
                {renderList(result.comuns, r => (
                  <div key={r.siagro} className={s.cmpItem}>
                    <SiagroPill code={r.siagro} />
                    <div className={s.alvoLine}>{result.cultura1}: {r.alvo1}</div>
                    <div className={s.alvoLine}>{result.cultura2}: {r.alvo2}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={s.exportRow}>
            <button className={tableStyles.ghostBtn} onClick={handleExport}>↓ exportar csv unificado</button>
          </div>
        </>
      )}
    </section>
  )
}
