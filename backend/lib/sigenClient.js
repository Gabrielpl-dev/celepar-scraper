const BASE     = 'https://sigen.cidasc.sc.gov.br'
const MAIN_URL = `${BASE}/consultaagrotoxicocadastropublico/consultaagx`
const UA       = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

let _session = null

async function openSession() {
  const res     = await fetch(MAIN_URL, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
  const cookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') || '').split(/,(?=[^ ])/).map(s => s.trim())
  _session = cookies.map(c => c.split(';')[0].trim()).join('; ')
}

async function sigenPost(urlPath, body, retried = false) {
  if (!_session) await openSession()
  const res = await fetch(`${BASE}${urlPath}`, {
    method:  'POST',
    headers: {
      'User-Agent':   UA,
      Referer:        MAIN_URL,
      Accept:         'application/json, text/javascript, */*',
      ...(_session ? { Cookie: _session } : {}),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  })
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('json')) {
    if (retried) throw new Error(`SIGEN ${urlPath} retornou HTML (sessão inválida)`)
    _session = null
    return sigenPost(urlPath, body, true)
  }
  return res.json()
}

// Retorna { encontrado: boolean, nome?: string }
async function verificarMA(ma) {
  const data = await sigenPost(
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
  if (!data.success || !data.data?.length) return { encontrado: false }
  return { encontrado: true, nome: (data.data[0].nmMarcaComercial || '').trim() }
}

module.exports = { sigenPost, openSession, verificarMA, get session() { return _session }, set session(v) { _session = v } }
