# Correção de carência (RECEITPADRAO.CARENCIA) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela nova onde, dado um produto (MA) selecionado, o usuário vê as culturas já cadastradas e corrige a carência (intervalo de segurança) de todas as receitas ativas daquela cultura+produto de uma vez, digitando o valor e apertando Enter.

**Architecture:** Rota HTTP fina (`routes/carencia.js`) → regra de negócio isolada (`lib/carenciaService.js`) → camada de conexão trocável (`lib/db`) que hoje fala com Firebird local (ambiente de teste, mesmo schema do Oracle de produção) e depois troca para Oracle sem mexer nas camadas de cima.

**Tech Stack:** Node.js/Express (backend existente), `node-firebird` (novo), `better-sqlite3` (log de auditoria, já usado), React (frontend existente).

## Global Constraints

- `DB_BACKEND` decide o client ativo (`firebird` por padrão agora; troca pra `oracle` fica fora deste plano — ver spec, seção "Dívida técnica").
- Firebird local de teste: host `127.0.0.1`, porta `3050`, arquivo `C:\Viasoft\Dados\SAFRAS.FDB`, usuário `SYSDBA`, senha `masterkey`.
- `RECEITPADRAO.CARENCIA` é texto livre (não validar como número).
- Todo UPDATE é restrito a `RECEITPADRAO.ATIVO = 'S'` — nunca toca receitas inativas.
- Toda escrita grava em `carencia_log` (sqlite, `backend/agrofit_ids.db`) — não bloqueia o fluxo, é só rastro.
- Sem modal de confirmação — Enter grava direto.
- Regra de negócio nunca no handler HTTP — sempre em `lib/carenciaService.js`.
- MA real disponível no Firebird local pra testar: `16712` ("CREDIT").

---

### Task 1: Client Firebird trocável (`lib/db`)

**Files:**
- Modify: `backend/package.json` (dependência `node-firebird`)
- Modify: `backend/lib/config.js`
- Create: `backend/lib/db/firebirdClient.js`
- Create: `backend/lib/db/index.js`
- Create: `backend/scripts/verify-firebird-client.js`

**Interfaces:**
- Produz: `query(sql, binds) => Promise<Array<Object>>` e `execute(sql, binds) => Promise<void>`, ambos aceitando SQL com binds nomeados (`:nome`). Usados por `lib/carenciaService.js` na Task 2.

- [ ] **Step 1: Instalar a dependência**

Run: `cd backend && npm install node-firebird`
Expected: `backend/package.json` ganha `"node-firebird": "^1.x.x"` em `dependencies` (versão exata decidida pelo npm).

- [ ] **Step 2: Adicionar config do Firebird local**

Modifique `backend/lib/config.js`, adicionando ao objeto exportado:

```js
  FIREBIRD_PATH:     process.env.FIREBIRD_PATH     || 'C:\\Viasoft\\Dados\\SAFRAS.FDB',
  FIREBIRD_HOST:     process.env.FIREBIRD_HOST     || '127.0.0.1',
  FIREBIRD_PORT:     Number(process.env.FIREBIRD_PORT) || 3050,
  FIREBIRD_USER:     process.env.FIREBIRD_USER     || 'SYSDBA',
  FIREBIRD_PASSWORD: process.env.FIREBIRD_PASSWORD || 'masterkey',
```

- [ ] **Step 3: Escrever o script de verificação (vai falhar — `firebirdClient.js` ainda não existe)**

Crie `backend/scripts/verify-firebird-client.js`:

```js
const assert = require('assert')
const { query, execute } = require('../lib/db/firebirdClient')

async function main() {
  const rows = await query('SELECT 1 AS TESTE FROM RDB$DATABASE', {})
  assert.strictEqual(rows[0].TESTE, 1, 'query simples deveria retornar TESTE=1')
  console.log('OK: query simples')

  const produtos = await query(
    `SELECT COUNT(*) AS QTD FROM RECEITPADRAO r
     JOIN AGROTOXICO a ON a.RECPADRAOID = r.RECPADRAOID
     WHERE a.REGISTROMA = :ma AND r.ATIVO = 'S'`,
    { ma: '16712' }
  )
  assert.ok(Number(produtos[0].QTD) > 0, 'MA 16712 deveria ter receitas ativas')
  console.log(`OK: bind nomeado — ${produtos[0].QTD} receitas ativas para MA 16712`)

  await execute(`UPDATE RDB$DATABASE SET RDB$DESCRIPTION = RDB$DESCRIPTION`, {})
  console.log('OK: execute não lança erro')

  console.log('TUDO OK')
}

main().catch(err => { console.error('FALHOU:', err); process.exit(1) })
```

- [ ] **Step 4: Rodar e confirmar que falha (módulo não existe)**

Run: `node backend/scripts/verify-firebird-client.js`
Expected: `Error: Cannot find module '../lib/db/firebirdClient'`

- [ ] **Step 5: Implementar `firebirdClient.js`**

Crie `backend/lib/db/firebirdClient.js`:

```js
const Firebird = require('node-firebird')
const { FIREBIRD_HOST, FIREBIRD_PORT, FIREBIRD_PATH, FIREBIRD_USER, FIREBIRD_PASSWORD } = require('../config')

function toPositional(sql, binds = {}) {
  const values = []
  const convertido = sql.replace(/:(\w+)/g, (_, nome) => {
    if (!(nome in binds)) throw new Error(`bind ausente: ${nome}`)
    values.push(binds[nome])
    return '?'
  })
  return { convertido, values }
}

function getOptions() {
  return {
    host: FIREBIRD_HOST,
    port: FIREBIRD_PORT,
    database: FIREBIRD_PATH,
    user: FIREBIRD_USER,
    password: FIREBIRD_PASSWORD,
    lowercase_keys: false,
  }
}

function withConnection(fn) {
  return new Promise((resolve, reject) => {
    Firebird.attach(getOptions(), (err, db) => {
      if (err) return reject(err)
      fn(db)
        .then(resultado => { db.detach(); resolve(resultado) })
        .catch(erro => { db.detach(); reject(erro) })
    })
  })
}

async function query(sql, binds = {}) {
  const { convertido, values } = toPositional(sql, binds)
  return withConnection(db => new Promise((resolve, reject) => {
    db.query(convertido, values, (err, rows) => err ? reject(err) : resolve(rows))
  }))
}

async function execute(sql, binds = {}) {
  const { convertido, values } = toPositional(sql, binds)
  return withConnection(db => new Promise((resolve, reject) => {
    db.query(convertido, values, err => err ? reject(err) : resolve())
  }))
}

module.exports = { query, execute }
```

- [ ] **Step 6: Criar o seletor de backend**

Crie `backend/lib/db/index.js`:

```js
function getClient() {
  return process.env.DB_BACKEND === 'oracle'
    ? require('./oracleClient')
    : require('./firebirdClient')
}

module.exports = { getClient }
```

- [ ] **Step 7: Rodar o script de verificação de novo**

Run: `node backend/scripts/verify-firebird-client.js`
Expected:
```
OK: query simples
OK: bind nomeado — 1336 receitas ativas para MA 16712
OK: execute não lança erro
TUDO OK
```
(o número exato de receitas pode variar se o banco de teste mudar — o importante é ser > 0 e não lançar erro)

- [ ] **Step 8: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/lib/config.js backend/lib/db/firebirdClient.js backend/lib/db/index.js backend/scripts/verify-firebird-client.js
git commit -m "feat: client Firebird trocável para testes locais de carência"
```

---

### Task 2: `lib/carenciaService.js` — regra de negócio + log de auditoria

**Files:**
- Modify: `backend/db.js`
- Create: `backend/lib/carenciaService.js`
- Create: `backend/scripts/verify-carencia-service.js`

**Interfaces:**
- Consome: `getClient()` de `backend/lib/db/index.js` (Task 1) — `query(sql, binds)`, `execute(sql, binds)`.
- Produz: `listarCulturas(ma) => Promise<Array<{culturaid, nome, carencia, divergente}>>` e `atualizarCarencia({ma, culturaid, valor, usuario}) => Promise<void>`. Usados por `routes/carencia.js` na Task 3.

- [ ] **Step 1: Adicionar a tabela de log em `backend/db.js`**

No final de `backend/db.js`, antes de `module.exports = db`, adicione:

```js
db.exec(`
  CREATE TABLE IF NOT EXISTS carencia_log (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    ma             TEXT NOT NULL,
    culturaid      INTEGER NOT NULL,
    valor_anterior TEXT,
    valor_novo     TEXT NOT NULL,
    usuario        TEXT,
    criado_em      TEXT DEFAULT (datetime('now','localtime'))
  )
`)
```

- [ ] **Step 2: Escrever o script de verificação (vai falhar — `carenciaService.js` ainda não existe)**

Crie `backend/scripts/verify-carencia-service.js`:

```js
const assert = require('assert')
const Database = require('better-sqlite3')
const path = require('path')
const carenciaService = require('../lib/carenciaService')

const MA = '16712'

async function main() {
  const antes = await carenciaService.listarCulturas(MA)
  assert.ok(antes.length > 0, 'deveria listar ao menos uma cultura para MA 16712')
  console.log(`OK: ${antes.length} culturas listadas`)

  const alvo = antes[0]
  const valorOriginal = alvo.divergente ? '' : (alvo.carencia ?? '')
  const valorTeste = 'TESTE-VERIFY-' + Date.now()

  await carenciaService.atualizarCarencia({ ma: MA, culturaid: alvo.culturaid, valor: valorTeste, usuario: 'verify-script' })
  const depois = await carenciaService.listarCulturas(MA)
  const atualizado = depois.find(c => c.culturaid === alvo.culturaid)
  assert.strictEqual(atualizado.carencia, valorTeste, 'carencia deveria refletir o novo valor gravado')
  assert.strictEqual(atualizado.divergente, false, 'não deveria estar divergente após gravar valor único')
  console.log(`OK: carência de "${alvo.nome}" atualizada para "${valorTeste}"`)

  const db = new Database(path.join(__dirname, '..', 'agrofit_ids.db'))
  const log = db.prepare('SELECT * FROM carencia_log WHERE ma = ? AND culturaid = ? ORDER BY id DESC LIMIT 1').get(MA, alvo.culturaid)
  assert.ok(log, 'deveria existir uma linha em carencia_log')
  assert.strictEqual(log.valor_novo, valorTeste, 'log deveria registrar o valor novo')
  console.log('OK: log de auditoria gravado —', log)

  // restaura o valor original pra não sujar o banco de teste
  await carenciaService.atualizarCarencia({ ma: MA, culturaid: alvo.culturaid, valor: valorOriginal, usuario: 'verify-script' })
  console.log(`OK: valor original restaurado ("${valorOriginal}")`)

  console.log('TUDO OK')
}

main().catch(err => { console.error('FALHOU:', err); process.exit(1) })
```

- [ ] **Step 3: Rodar e confirmar que falha (módulo não existe)**

Run: `node backend/scripts/verify-carencia-service.js`
Expected: `Error: Cannot find module '../lib/carenciaService'`

- [ ] **Step 4: Implementar `carenciaService.js`**

Crie `backend/lib/carenciaService.js`:

```js
const db = require('../db')
const { getClient } = require('./db')

const inserirLog = db.prepare(`
  INSERT INTO carencia_log (ma, culturaid, valor_anterior, valor_novo, usuario)
  VALUES (@ma, @culturaid, @valor_anterior, @valor_novo, @usuario)
`)

async function listarCulturas(ma) {
  const client = getClient()
  const rows = await client.query(`
    SELECT DISTINCT c.CULTURAID, c.NOME, r.CARENCIA
    FROM RECEITPADRAO r
    JOIN CULTURA c ON c.CULTURAID = r.CULTURAID
    JOIN AGROTOXICO a ON a.RECPADRAOID = r.RECPADRAOID
    WHERE a.REGISTROMA = :ma AND r.ATIVO = 'S'
  `, { ma })

  const porCultura = new Map()
  for (const row of rows) {
    const existente = porCultura.get(row.CULTURAID)
    if (!existente) porCultura.set(row.CULTURAID, { culturaid: row.CULTURAID, nome: row.NOME, valores: new Set([row.CARENCIA]) })
    else existente.valores.add(row.CARENCIA)
  }

  return [...porCultura.values()]
    .map(c => ({
      culturaid:  c.culturaid,
      nome:       c.nome,
      carencia:   c.valores.size === 1 ? [...c.valores][0] : null,
      divergente: c.valores.size > 1,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

async function atualizarCarencia({ ma, culturaid, valor, usuario }) {
  const client = getClient()

  const antes = await client.query(`
    SELECT DISTINCT r.CARENCIA
    FROM RECEITPADRAO r
    JOIN AGROTOXICO a ON a.RECPADRAOID = r.RECPADRAOID
    WHERE a.REGISTROMA = :ma AND r.CULTURAID = :culturaid AND r.ATIVO = 'S'
  `, { ma, culturaid })

  await client.execute(`
    UPDATE RECEITPADRAO SET CARENCIA = :valor
    WHERE CULTURAID = :culturaid AND ATIVO = 'S'
      AND RECPADRAOID IN (
        SELECT r.RECPADRAOID FROM RECEITPADRAO r
        JOIN AGROTOXICO a ON a.RECPADRAOID = r.RECPADRAOID
        WHERE a.REGISTROMA = :ma
      )
  `, { valor, culturaid, ma })

  inserirLog.run({
    ma,
    culturaid,
    valor_anterior: antes.map(r => r.CARENCIA).join(', ') || null,
    valor_novo: valor,
    usuario: usuario ?? null,
  })
}

module.exports = { listarCulturas, atualizarCarencia }
```

- [ ] **Step 5: Rodar o script de verificação de novo**

Run: `node backend/scripts/verify-carencia-service.js`
Expected:
```
OK: N culturas listadas
OK: carência de "<nome da cultura>" atualizada para "TESTE-VERIFY-<timestamp>"
OK: log de auditoria gravado — { id: ..., ma: '16712', culturaid: ..., valor_anterior: ..., valor_novo: 'TESTE-VERIFY-...', usuario: 'verify-script', criado_em: '...' }
OK: valor original restaurado ("...")
TUDO OK
```

- [ ] **Step 6: Commit**

```bash
git add backend/db.js backend/lib/carenciaService.js backend/scripts/verify-carencia-service.js
git commit -m "feat: regra de negócio e log de auditoria da correção de carência"
```

---

### Task 3: Rota HTTP (`routes/carencia.js`)

**Files:**
- Create: `backend/routes/carencia.js`
- Modify: `backend/server.js`
- Modify: `backend/.env` (adiciona `JWT_SECRET` local, necessário pra testar autenticação — hoje só existe em produção via NSSM)
- Create: `backend/scripts/verify-carencia-route.js`

**Interfaces:**
- Consome: `carenciaService.listarCulturas(ma)`, `carenciaService.atualizarCarencia(...)` (Task 2).
- Produz: `GET /api/carencia/culturas?ma=X` → `{ ok, culturas }`; `PUT /api/carencia` (`requireAdmin`) body `{ma, culturaid, valor}` → `{ ok }`. Usados pelo frontend na Task 4.

- [ ] **Step 1: Adicionar `JWT_SECRET` local**

`backend/.env` não tem `JWT_SECRET` (só existe em produção via NSSM). Adicione uma linha ao final do arquivo:

```
JWT_SECRET=dev-local-carencia-test-secret-nao-usar-em-producao
```

- [ ] **Step 2: Escrever o script de verificação (vai falhar — rota ainda não existe)**

Crie `backend/scripts/verify-carencia-route.js`:

```js
const { spawn } = require('child_process')
const path = require('path')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const PORT = 3999
const MA = '16712'
const token = jwt.sign({ username: 'VERIFY_SCRIPT', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' })

const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: String(PORT) },
})

function aguardarServidor() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout esperando servidor subir')), 10000)
    server.stdout.on('data', chunk => {
      process.stdout.write(chunk)
      if (chunk.toString().includes('rodando em')) { clearTimeout(timeout); resolve() }
    })
    server.stderr.on('data', chunk => process.stderr.write(chunk))
  })
}

async function main() {
  await aguardarServidor()
  const base = `http://127.0.0.1:${PORT}/api`
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const listaResp = await fetch(`${base}/carencia/culturas?ma=${MA}`, { headers })
  const lista = await listaResp.json()
  if (lista.ok !== true) throw new Error('GET /carencia/culturas: ok não é true — ' + JSON.stringify(lista))
  if (!Array.isArray(lista.culturas) || lista.culturas.length === 0) throw new Error('esperava ao menos uma cultura')
  console.log(`OK: ${lista.culturas.length} culturas retornadas via HTTP`)

  const alvo = lista.culturas[0]
  const valorOriginal = alvo.divergente ? '' : (alvo.carencia ?? '')
  const valorTeste = 'TESTE-VERIFY-' + Date.now()

  const putResp = await fetch(`${base}/carencia`, {
    method: 'PUT', headers,
    body: JSON.stringify({ ma: MA, culturaid: alvo.culturaid, valor: valorTeste }),
  })
  const put = await putResp.json()
  if (put.ok !== true) throw new Error('PUT /carencia: ok não é true — ' + JSON.stringify(put))
  console.log(`OK: PUT aplicado em "${alvo.nome}"`)

  const confResp = await fetch(`${base}/carencia/culturas?ma=${MA}`, { headers })
  const conf = await confResp.json()
  const atualizado = conf.culturas.find(c => c.culturaid === alvo.culturaid)
  if (atualizado.carencia !== valorTeste) throw new Error('valor não persistiu — esperado ' + valorTeste + ', veio ' + atualizado.carencia)
  console.log('OK: valor confirmado após releitura via HTTP —', atualizado.carencia)

  await fetch(`${base}/carencia`, {
    method: 'PUT', headers,
    body: JSON.stringify({ ma: MA, culturaid: alvo.culturaid, valor: valorOriginal }),
  })
  console.log('OK: valor original restaurado')

  console.log('TUDO OK')
  server.kill()
  process.exit(0)
}

main().catch(err => { console.error('FALHOU:', err); server.kill(); process.exit(1) })
```

- [ ] **Step 3: Rodar e confirmar que falha (rota 404)**

Run: `node backend/scripts/verify-carencia-route.js`
Expected: erro lançado por `GET /carencia/culturas: ok não é true` (a rota ainda não existe, Express responde 404 sem `ok`)

- [ ] **Step 4: Implementar a rota**

Crie `backend/routes/carencia.js`:

```js
const router = require('express').Router()
const requireAdmin = require('../middleware/requireAdmin')
const carenciaService = require('../lib/carenciaService')

router.get('/carencia/culturas', async (req, res) => {
  const { ma } = req.query
  if (!ma?.trim()) return res.status(400).json({ ok: false, error: 'ma é obrigatório' })
  try {
    const culturas = await carenciaService.listarCulturas(ma.trim())
    res.json({ ok: true, culturas })
  } catch (err) {
    console.error('[carencia/culturas]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
})

router.put('/carencia', requireAdmin, async (req, res) => {
  const { ma, culturaid, valor } = req.body
  if (!ma?.toString().trim() || culturaid == null || valor == null)
    return res.status(400).json({ ok: false, error: 'ma, culturaid e valor são obrigatórios' })
  try {
    await carenciaService.atualizarCarencia({
      ma: ma.toString().trim(),
      culturaid: Number(culturaid),
      valor: valor.toString(),
      usuario: req.user?.username ?? null,
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('[carencia/atualizar]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
})

module.exports = router
```

- [ ] **Step 5: Montar a rota em `server.js`**

Em `backend/server.js`, logo após a linha `app.use('/api', require('./routes/extracao'));` (linha 38), adicione:

```js
app.use('/api', require('./routes/carencia'));
```

- [ ] **Step 6: Rodar o script de verificação de novo**

Run: `node backend/scripts/verify-carencia-route.js`
Expected:
```
OK: N culturas retornadas via HTTP
OK: PUT aplicado em "<nome>"
OK: valor confirmado após releitura via HTTP — TESTE-VERIFY-...
OK: valor original restaurado
TUDO OK
```

- [ ] **Step 7: Commit**

```bash
git add backend/routes/carencia.js backend/server.js backend/scripts/verify-carencia-route.js backend/.env
git commit -m "feat: rota HTTP de correção de carência"
```

Nota: `backend/.env` está no `.gitignore` (confirmado — `git check-ignore` retorna o arquivo), então o `git add` acima não vai adicionar nada dele; a edição do `JWT_SECRET` fica só local.

---

### Task 4: Frontend — `CarenciaView`

**Files:**
- Modify: `frontend/src/api.js`
- Create: `frontend/src/views/CarenciaView.jsx`
- Create: `frontend/src/views/CarenciaView.module.css`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`

**Interfaces:**
- Consome: `GET /api/carencia/culturas?ma=`, `PUT /api/carencia` (Task 3).

- [ ] **Step 1: Adicionar funções de API**

Em `frontend/src/api.js`, dentro do objeto `api` (depois da linha `buscarDiagnostico: ...`), adicione:

```js
  carenciaCulturas:  (ma) => call('carencia/culturas?ma=' + encodeURIComponent(ma), null, 'GET'),
  carenciaAtualizar: (ma, culturaid, valor) => call('carencia', { ma, culturaid, valor }, 'PUT'),
```

- [ ] **Step 2: Criar o CSS da view**

Crie `frontend/src/views/CarenciaView.module.css`:

```css
.section { }

.opHeader {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 8px;
}

.opHeader h3 {
  font-family: var(--display);
  font-weight: 700;
  font-size: 24px;
  letter-spacing: -.01em;
}

.tag {
  font-size: 10px;
  color: var(--accent);
  border: 1px solid var(--accent);
  padding: 2px 6px;
  border-radius: 2px;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.desc {
  color: var(--dim);
  margin-bottom: 24px;
  max-width: 720px;
  font-size: 12px;
}

.valor {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
}

.valor:hover {
  background: var(--panel);
}

.input {
  font-family: var(--mono);
  font-size: 13px;
  padding: 4px 8px;
  border: 1px solid var(--accent);
  border-radius: 3px;
  background: var(--bg);
  color: inherit;
  width: 160px;
}
```

- [ ] **Step 3: Criar a view**

Crie `frontend/src/views/CarenciaView.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { api } from '../api'
import { ResultTable, tableStyles } from '../components/ResultTable'
import { StatusBar } from '../components/StatusBar'
import s from './CarenciaView.module.css'

export function CarenciaView({ params }) {
  const ma = params?.ma
  const [culturas, setCulturas]     = useState([])
  const [status, setStatus]         = useState('idle')
  const [message, setMessage]       = useState('')
  const [editingId, setEditingId]   = useState(null)
  const [editValue, setEditValue]   = useState('')
  const [savingId, setSavingId]     = useState(null)

  useEffect(() => {
    if (!ma) { setCulturas([]); setStatus('idle'); return }
    setStatus('loading')
    setMessage('carregando culturas...')
    api.carenciaCulturas(ma).then(data => {
      if (!data.ok) { setStatus('err'); setMessage('erro: ' + data.error); return }
      setCulturas(data.culturas)
      setStatus('ok')
      setMessage(`${data.culturas.length} cultura(s)`)
    }).catch(err => { setStatus('err'); setMessage('erro: ' + err.message) })
  }, [ma])

  function abrirEdicao(cultura) {
    setEditingId(cultura.culturaid)
    setEditValue(cultura.divergente ? '' : (cultura.carencia ?? ''))
  }

  async function salvar(cultura) {
    setSavingId(cultura.culturaid)
    try {
      const data = await api.carenciaAtualizar(ma, cultura.culturaid, editValue)
      if (!data.ok) { setMessage('erro: ' + data.error); return }
      setCulturas(atual => atual.map(c =>
        c.culturaid === cultura.culturaid ? { ...c, carencia: editValue, divergente: false } : c
      ))
      setEditingId(null)
    } catch (err) {
      setMessage('erro: ' + err.message)
    } finally {
      setSavingId(null)
    }
  }

  function handleKeyDown(e, cultura) {
    if (e.key === 'Enter') salvar(cultura)
    if (e.key === 'Escape') setEditingId(null)
  }

  if (!ma) return (
    <section className={s.section}>
      <div className={s.opHeader}>
        <h3>Carência</h3>
        <span className={s.tag}>RECEITPADRAO</span>
      </div>
      <p className={s.desc}>Configure o produto em <strong>Parâmetros</strong> primeiro.</p>
    </section>
  )

  const rows = culturas.map(c => [
    c.nome,
    editingId === c.culturaid
      ? (
        <input
          key="input"
          autoFocus
          className={s.input}
          value={editValue}
          disabled={savingId === c.culturaid}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={e => handleKeyDown(e, c)}
          onBlur={() => setEditingId(null)}
        />
      )
      : (
        <span key="valor" className={s.valor} onClick={() => abrirEdicao(c)}>
          {c.divergente ? 'valores distintos' : (c.carencia?.trim() || '—')}
        </span>
      ),
  ])

  return (
    <section className={s.section}>
      <div className={s.opHeader}>
        <h3>Carência</h3>
        <span className={s.tag}>RECEITPADRAO</span>
      </div>
      <p className={s.desc}>
        Clique numa cultura pra corrigir a carência. Enter grava em todas as receitas ativas dessa cultura pro produto atual.
      </p>

      <StatusBar status={status} message={message} count={null} took={null} />

      <ResultTable
        headers={['Cultura', 'Carência']}
        rows={rows}
        toolbar={<span className={tableStyles.toolbarMeta}>{params?.nome || ma}</span>}
        emptyNode={<div className={tableStyles.emptyState}>Nenhuma cultura cadastrada para esse produto.</div>}
      />
    </section>
  )
}
```

- [ ] **Step 4: Registrar a view em `App.jsx`**

Em `frontend/src/App.jsx`, adicione o import (perto da linha 12, junto dos outros views):

```js
import { CarenciaView } from './views/CarenciaView'
```

E no objeto `VIEWS` (linha 18-27), adicione:

```js
  carencia:  CarenciaView,
```

- [ ] **Step 5: Adicionar item na Sidebar**

Em `frontend/src/components/Sidebar.jsx`, no array `OPS.revisao` (linhas 15-21), adicione um item após `verificar`:

```js
    { id: 'carencia', num: '06', label: 'Carência', title: 'Corrigir intervalo de segurança por cultura' },
```

- [ ] **Step 6: Buildar o frontend**

Run: `cd frontend && npm run build`
Expected: build conclui sem erros, gera novos assets em `backend/public/`.

- [ ] **Step 7: Verificação manual**

Suba o backend local (`cd backend && npm run dev` ou `node server.js`), abra a aplicação no navegador, faça login, vá em **Parâmetros** e configure `ma = 16712`, clique em **Carência** na sidebar. Confirme:
- A lista de culturas aparece.
- Clicar numa cultura abre um input com o valor atual.
- Digitar um valor novo e apertar Enter grava e atualiza a célula (confira no Firebird via `isql` ou repetindo a consulta que o valor mudou em todas as linhas ativas daquela cultura+MA).
- Apertar Escape ou clicar fora cancela sem gravar.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/api.js frontend/src/views/CarenciaView.jsx frontend/src/views/CarenciaView.module.css frontend/src/App.jsx frontend/src/components/Sidebar.jsx backend/public
git commit -m "feat: tela de correção de carência por cultura"
```

---

## Fora deste plano (ver spec)

- Implementar `lib/db/oracleClient.js` e trocar `DB_BACKEND` para produção — depende de extrair a conexão Oracle já usada em `routes/banco.js` para um helper compartilhado, e de criar o usuário Oracle de escrita (`ORACLE_WRITE_USER`/`ORACLE_WRITE_PASSWORD`) no servidor. Registrado como dívida técnica na spec.
