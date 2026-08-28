**ARQUIVO TEMPORÁRIO** — apagar ao concluir o roadmap (perguntar ao Gabriel antes).

# Status: scraper "existe/não existe" pros 13 sistemas estaduais de agrotóxico

Objetivo: pra cada sistema em `frontend/src/views/LinksView.jsx` (exceto AGROFIT, ADAPAR-PR
e SIGEN-SC, que já têm scraping), implementar uma função `verificarMA(ma)` ou
`verificarNome(nome)` que responde só `{ encontrado: boolean, nome?: string }` — sem
extrair mais nada por enquanto (igual `sigenClient.verificarMA`).

## Roadmap

- [x] Triagem rápida dos 13 links (curl/browser): classificar cada um em
      **viável** (busca pública real) / **arquivo estático** (XML/PDF fixo, dá pra baixar e
      grepar) / **bloqueado** (exige login, CAPTCHA, ou não achei forma de consultar)
- [x] Implementar `lib/` client por sistema viável, seguindo o padrão de `sigenClient.js`
- [x] Adicionar rota/endpoint unificado — `GET /api/estaduais?ma=` ou `?nome=`
      (resolve MA via Agrofit quando só o nome é dado), consulta SC+PR+RO+GO+RN+ES
- [x] Testar cada um contra um MA real conhecido (positivo e negativo)
- [x] Frontend: nova view "Verificar nos estados" (`EstaduaisView.jsx`) — testada com
      "LAMBDA CIALOTRIN CCAB 250 CS" (MA 01323): liberado em PR/GO/ES, não encontrado em
      SC/RO/RN
- [ ] Documentar em `docs/estaduais.md` (falta — hoje só está no STATUS.md e nos
      comentários do `lib/estaduais.js`)
- [ ] RS/SP/MS ainda pendentes — decisão em aberto sobre adicionar Playwright

## Sistemas (da LinksView.jsx)

| Label | UF | Tipo | Status |
|---|---|---|---|
| SIAFRO | RO | XML estático completo | ✅ implementado (`lib/estaduais.js verificarRO`) |
| SIDAGO | GO | HTML estático completo (tabela server-side) | ✅ implementado (`verificarGO`) |
| IDIARN | RN | PDF estático (relatório texto, heurística por regex) | ✅ implementado (`verificarRN`) |
| IDAF | ES | jQuery + PHP, endpoint DataTables JSON sem sessão (`controller_list_tbl_BD2.php?mapa=`) | ✅ implementado (`verificarES`) — precisou de Agent TLS dedicado, ver observações |
| SIG@ | RS | JSF/RichFaces 3.3.1 com AJAX (AJAX4JSF) | 🐢 achado o fluxo (`tipoConsulta=PRODUTO` + `nroIntProdutoAgrotoxnome=<nome>` em `SDA-ConsultaPublica-Upload-Pesquisar.jsf`), mas POST direto via curl falha — RichFaces exige o handshake AJAX exato (`A4J.AJAX.Submit`, params tipo `j_id32=j_id32`) que muda a cada carga de página. Precisa de browser headless de verdade (Playwright/Puppeteer), não dá pra fazer com cliente stateless |
| CREA (rótulo errado, é GEDAVE) | SP | ICEfaces (`iceInpTxt`/`iceSubmit`) | não aprofundado, mas é outro framework Java com AJAX stateful — mesmo problema do RS, provavelmente também precisa de headless browser |
| IAGRO | MS | Angular SPA, API REST real (`api.ms.gov.br/api-esaniagro/v1/Agrotoxico?mapaIbama=`) | 🚫 API exige token gerado por RSA no cliente (achei `jsencrypt.js` no bundle) guardado em `sessionStorage` — parei aqui de propósito, a ferramenta de browser marcou o valor como sensível e recusou exibir, e não tentei ler o algoritmo no bundle minificado pra replicar. Precisaria de browser headless real (ou engenharia reversa do bundle Angular) |
| SISDEV | MT | formulário com Google reCAPTCHA | 🚫 bloqueado (captcha) — avisar Gabriel |
| ADAPEC | TO | `intranet.adapec.to.gov.br` não resolve DNS | 🚫 bloqueado (rede interna, não público) |
| SIAGRO | PR | login via SSO gov.br (identidadedigital.pr.gov.br) | 🚫 bloqueado (exige credencial) — PR já coberto via ADAPAR/Celepar mesmo assim |
| IMA | MG | link de download quebrado (perde os query params no redirect) | 🚫 link morto, achar URL atual |

Rota unificada: `GET /api/estaduais?ma=` — hoje RO/GO/RN/ES (as 4 implementadas), roda
em paralelo, falha de uma UF não derruba as outras.

## Observações conforme avanço

- RN (IDIARN): o PDF não tem colunas delimitadas de forma confiável no texto extraído
  (`pdf-parse`) — a extração usa heurística (MA seguido da classe toxicológica romana
  I-IV) só pra confirmar existência, não extrai nome do produto.
- RO (SIAFRO): alguns registros têm `NR_REGISTRO_MAPA` não-numérico (tipo "B46 + P53",
  parecem registros pendentes/compostos) — `normMa()` ignora esses de propósito, nunca
  batem com uma consulta por MA (que é sempre só dígitos).
- Testado com MA 6715 (existe nos 3) e MA 12525/Mateno Pós (existe só no GO) — bate com
  o esperado.
- ES (`app.idaf.es.gov.br`): manda só o certificado folha na conexão TLS, sem a
  intermediária Let's Encrypt (`openssl s_client -showcerts` confirma) — Node recusa
  validar por padrão (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`), embora curl/navegador tolerem.
  Solução: `https.Agent({ rejectUnauthorized: false })` dedicado só pra esse host, não
  afeta as outras fontes que usam `fetch` normal. Resposta também vem com BOM UTF-8 antes
  do JSON — removido antes do `JSON.parse`. Testado com MA 6715 e MA 12525, ambos batem.
