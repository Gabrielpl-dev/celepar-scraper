import { useState, useRef, useEffect } from 'react'
import { rodarExtracao, buscarImagemPagina } from './extracaoApi'
import s from './ExtracaoApp.module.css'

const LABELS = {
  nomeComercial: 'Nome comercial',
  registroMA: 'Registro MA',
  fabricante: 'Fabricante',
  formulacao: 'Formulação',
  concentracao: 'Concentração',
  ingredienteInerte: 'Ingrediente inerte',
  classeDefensivo: 'Classe do defensivo',
  grupoQuimico: 'Grupo químico',
  grupoMecanismoAcao: 'Grupo mecanismo de ação',
  classificacaoToxicologica: 'Classificação toxicológica',
  principioAtivo: 'Princípio ativo',
}

function seloConfianca(confianca) {
  if (confianca == null) return { texto: '…', classe: 'seloAguardando' }
  if (confianca === 0) return { texto: '✗ erro', classe: 'seloErro' }
  if (confianca >= 80) return { texto: `${confianca}%`, classe: 'seloAlta' }
  if (confianca >= 40) return { texto: `${confianca}%`, classe: 'seloRevisar' }
  return { texto: `${confianca}%`, classe: 'seloErro' }
}

export default function ExtracaoApp() {
  const [arquivo, setArquivo]     = useState(null)
  const [pdfNome, setPdfNome]     = useState(null)
  const [status, setStatus]       = useState('idle') // idle | rodando | concluido | erro
  const [erro, setErro]           = useState('')
  const [campos, setCampos]       = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const inputRef = useRef(null)

  function handleArquivo(e) {
    setArquivo(e.target.files[0] ?? null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!arquivo) return

    setStatus('rodando')
    setErro('')
    setCampos([])
    setSelecionado(null)

    try {
      await rodarExtracao(arquivo, evento => {
        if (evento.tipo === 'inicio') {
          setPdfNome(evento.pdfNome)
          setCampos(evento.campos.map(nome => ({ campo: nome, confianca: null })))
        } else if (evento.tipo === 'campo') {
          setPdfNome(evento.pdfNome)
          setCampos(atual => atual.map(c => c.campo === evento.campo ? evento : c))
        } else if (evento.tipo === 'fim') {
          setStatus('concluido')
        } else if (evento.tipo === 'erro') {
          setStatus('erro')
          setErro(evento.mensagem)
        }
      })
    } catch (err) {
      setStatus('erro')
      setErro(err.message)
    }
  }

  return (
    <div className={s.root}>
      <header className={s.header}>
        <span className={s.title}>Extração</span>
        {status === 'rodando' && <span className={s.badge}>processando</span>}
      </header>

      <main className={s.main}>
        <form className={s.uploadForm} onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={handleArquivo}
            disabled={status === 'rodando'}
          />
          <button type="submit" disabled={!arquivo || status === 'rodando'}>
            {status === 'rodando' ? 'extraindo…' : 'extrair'}
          </button>
        </form>

        {erro && <div className={s.erro}>{erro}</div>}

        {campos.length > 0 && (
          <div className={s.layout}>
            <table className={s.tabela}>
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campos.map(c => {
                  const selo = seloConfianca(c.confianca)
                  const clicavel = c.confianca != null
                  return (
                    <tr
                      key={c.campo}
                      className={clicavel ? s.linhaClicavel : ''}
                      onClick={() => clicavel && setSelecionado(c)}
                    >
                      <td>{LABELS[c.campo] ?? c.campo}</td>
                      <td>{c.valor ?? '—'}</td>
                      <td><span className={s[selo.classe]}>{selo.texto}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {selecionado && (
              <PainelOrigem
                pdfNome={pdfNome}
                campo={selecionado}
                onFechar={() => setSelecionado(null)}
              />
            )}
          </div>
        )}

        {campos.length === 0 && status === 'idle' && (
          <span className={s.empty}>envie um PDF de bula pra começar</span>
        )}
      </main>
    </div>
  )
}

function PainelOrigem({ pdfNome, campo, onFechar }) {
  const [imgUrl, setImgUrl] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    let urlAtual = null
    setCarregando(true)
    const pagina = campo.paginas?.[0] ?? 1
    buscarImagemPagina(pdfNome, pagina)
      .then(url => { if (!cancelado) { urlAtual = url; setImgUrl(url) } })
      .catch(() => {})
      .finally(() => { if (!cancelado) setCarregando(false) })
    return () => { cancelado = true; if (urlAtual) URL.revokeObjectURL(urlAtual) }
  }, [pdfNome, campo])

  const divergiu = campo.cerebras !== campo.lmstudio
    && !campo.cerebras?.startsWith('ERRO')
    && !campo.lmstudio?.startsWith('ERRO')

  const selo = seloConfianca(campo.confianca)

  return (
    <aside className={s.painel}>
      <div className={s.painelHeader}>
        <strong>{LABELS[campo.campo] ?? campo.campo}</strong>
        <button className={s.fechar} onClick={onFechar}>×</button>
      </div>

      <div className={s.painelSelo}>
        <span className={s[selo.classe]}>{selo.texto} de confiança</span>
      </div>

      {divergiu && (
        <div className={s.divergencia}>
          <div><span className={s.divergenciaLabel}>Cerebras:</span> {campo.cerebras}</div>
          <div><span className={s.divergenciaLabel}>LM Studio:</span> {campo.lmstudio}</div>
        </div>
      )}

      <div className={s.painelImagem}>
        {carregando && <span className={s.empty}>carregando página…</span>}
        {imgUrl && <img src={imgUrl} alt={`página ${campo.paginas?.[0]}`} />}
      </div>
    </aside>
  )
}
