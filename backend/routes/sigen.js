const express     = require('express')
const router      = express.Router()
const sigenClient = require('../lib/sigenClient')

const BASE     = 'https://sigen.cidasc.sc.gov.br'
const MAIN_URL = `${BASE}/consultaagrotoxicocadastropublico/consultaagx`
const UA       = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

function makeHeaders(extra = {}) {
  return {
    'User-Agent': UA,
    Referer:      MAIN_URL,
    Accept:       'application/json, text/javascript, */*',
    ...(sigenClient.session ? { Cookie: sigenClient.session } : {}),
    ...extra,
  }
}

router.get('/sigen', async (req, res) => {
  try {
    const { ma } = req.query
    if (!ma) return res.status(400).json({ ok: false, error: 'ma (registro) é obrigatório' })
    if (!/^\d+$/.test(ma)) return res.status(400).json({ ok: false, error: 'MA deve conter apenas dígitos' })

    const searchData = await sigenClient.sigenPost(
      '/ConsultaAgrotoxicoCadastroPublico/CarregarConsultaAgrotoxico',
      {
        nrRegistro: ma, nmMarcaComercial: '',
        csTipoRegistro: '', idRegistroEmpresa: '', nrDocumento: '',
        cdClasses: '', csSituacao: '', csClassificacaoToxicologica: '',
        csNovaClassificacaoToxicologica: '', csClassificacaoAmbiental: '',
        cdFormulacao: '', cdFormaAcao: '', cdModalidade: '', cdIngredienteAtivo: '',
        cdNmComumEspecieVegetal: '', cdNmComumPraga: '', cdGrupoQuimico: '',
        flInflamavel: '', flCorrosivo: '', flMinorCrops: '', flOrganico: '',
      }
    )

    if (!searchData.success || !searchData.data?.length) {
      return res.json({ ok: true, ma, nome: null, documentos: [], aviso: 'Nenhum produto encontrado no SIGEN' })
    }

    const produto        = searchData.data[0]
    const id             = produto.idAgrotoxicoCadastro
    const nomeConfirmado = (produto.nmMarcaComercial || '').trim()

    const detailData = await sigenClient.sigenPost(
      '/ConsultaAgrotoxicoCadastroPublico/CarregarAgrotoxicoCadastro',
      { idAgrotoxicoCadastro: String(id) }
    )

    if (!detailData.success) throw new Error('SIGEN retornou erro no detalhe')
    const d = detailData.data

    const documentos = []
    if (d.cdRepositorioArquivoFichaEmergencia > 0) {
      documentos.push({
        tipo:        'Ficha de Emergência',
        nomeArquivo: `${nomeConfirmado} - Ficha de Emergência`,
        url:         `/api/sigen-pdf?id=${d.cdRepositorioArquivoFichaEmergencia}`,
        fonte:       'SIGEN',
      })
    }
    if (d.cdRepositorioArquivoBula > 0) {
      documentos.push({
        tipo:        'Bula',
        nomeArquivo: `${nomeConfirmado} - Bula`,
        url:         `/api/sigen-pdf?id=${d.cdRepositorioArquivoBula}`,
        fonte:       'SIGEN',
      })
    }

    res.json({ ok: true, ma, nome: nomeConfirmado, id: String(id), documentos })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.get('/sigen-pdf', async (req, res) => {
  const { id } = req.query
  if (!id || !/^\d+$/.test(id)) return res.status(400).json({ ok: false, error: 'id inválido' })

  const sleep          = ms => new Promise(r => setTimeout(r, ms))
  const MAX_TENTATIVAS = 5
  const ESPERA_MS      = 3000

  for (let i = 1; i <= MAX_TENTATIVAS; i++) {
    try {
      if (!sigenClient.session) await sigenClient.openSession()
      const fetchRes = await fetch(`${BASE}/Common/RepositorioArquivo/Download`, {
        method:  'POST',
        headers: makeHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
        body:    `idRepositorioArquivo=${id}`,
      })

      if (fetchRes.ok) {
        const ct = fetchRes.headers.get('content-type') || 'application/pdf'
        const cl = fetchRes.headers.get('content-length')
        res.set('Content-Type', ct)
        res.set('Content-Disposition', 'inline')
        if (cl) res.set('Content-Length', cl)
        res.send(Buffer.from(await fetchRes.arrayBuffer()))
        return
      }

      if (fetchRes.status === 500) sigenClient.session = null
      else if (fetchRes.status !== 503)
        return res.status(fetchRes.status).json({ ok: false, error: `SIGEN ${fetchRes.status}` })
    } catch (err) {
      if (i === MAX_TENTATIVAS) return res.status(500).json({ ok: false, error: err.message })
    }
    if (i < MAX_TENTATIVAS) await sleep(ESPERA_MS)
  }

  res.status(503).json({ ok: false, error: 'SIGEN indisponível após várias tentativas' })
})

module.exports = router
