const express = require('express')
const router  = express.Router()

// Rota pública — sem JWT — o conteúdo é público no agrofit.agricultura.gov.br
router.get('/agrofit-pdf', async (req, res) => {
  const { url } = req.query
  if (!url || !url.includes('agrofit.agricultura.gov.br'))
    return res.status(400).json({ ok: false, error: 'URL inválida' })

  const cleanUrl = url.replace(/ /g, '%20')
  const headers  = {
    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer':         'https://agrofit.agricultura.gov.br/',
    'Accept':          'application/pdf,application/octet-stream,*/*',
    'Accept-Language': 'pt-BR,pt;q=0.9',
  }

  const sleep          = ms => new Promise(r => setTimeout(r, ms))
  const MAX_TENTATIVAS = 8
  const ESPERA_MS      = 3000

  for (let i = 1; i <= MAX_TENTATIVAS; i++) {
    try {
      const fetchRes = await fetch(cleanUrl, { headers })
      if (fetchRes.ok) {
        const ct = fetchRes.headers.get('content-type') || 'application/octet-stream'
        const cl = fetchRes.headers.get('content-length')
        res.set('Content-Type', ct)
        res.set('Content-Disposition', 'inline')
        if (cl) res.set('Content-Length', cl)
        res.send(Buffer.from(await fetchRes.arrayBuffer()))
        return
      }
      if (fetchRes.status !== 503)
        return res.status(fetchRes.status).json({ ok: false, error: `Agrofit ${fetchRes.status}` })
    } catch (err) {
      if (i === MAX_TENTATIVAS) return res.status(500).json({ ok: false, error: err.message })
    }
    if (i < MAX_TENTATIVAS) await sleep(ESPERA_MS)
  }

  res.status(503).json({ ok: false, error: 'Agrofit indisponível após várias tentativas' })
})

module.exports = router
