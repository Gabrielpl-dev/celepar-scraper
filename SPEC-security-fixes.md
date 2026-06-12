# Security Fixes Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to execute task-by-task. Steps use `- [ ]` syntax for tracking.

**Goal:** Fix all security vulnerabilities identified in the June 2026 audit, ordered Medium → High → Critical.

**Architecture:** Surgical changes to backend routes and one frontend adjustment. No new npm dependencies. Each task is independent and commits cleanly.

**Tech Stack:** Node.js/Express, better-sqlite3, jsonwebtoken, bcrypt, cors (all already installed).

**Deploy context:**
- This project runs on a remote server (`<IP_SERVIDOR>`). The local machine is edit-only — do NOT try to run the server locally.
- After each `git push`, the remote operator must: `git pull` then `<NSSM_EXE> restart CeleparApp`
- Any frontend change requires `cd frontend && npm run build` before committing — artifacts go to `backend/public/` and must be committed too.

**No test framework is configured.** Do not write tests. Implement and commit directly.

**Multiple tasks touch `backend/routes/auth.js`.** Always re-read the file at the start of each task that modifies it — it will have changed from the previous task.

---

## File Map

| File | Tasks |
|------|-------|
| `backend/server.js` | 1 |
| `backend/routes/agrofit.js` | 2, 3b, 5 |
| `backend/routes/auth.js` | 3a, 6a, 7, 8 |
| `backend/routes/banco.js` | 3c |
| `backend/routes/agrofit-public.js` | 4 |
| `frontend/src/views/AuthView.jsx` | 6b |
| `frontend/src/views/LoginView.jsx` | 6b |

---

## Task 1: Restrict CORS (M3)

**Problem:** `app.use(cors())` in `server.js:9` allows any origin. In production, frontend and backend share the same origin, so CORS is only needed for local dev (Vite on port 5173).

- [ ] **Read `backend/server.js`**

- [ ] **Replace line 9**

Find:
```javascript
app.use(cors());
```
Replace with:
```javascript
if (process.env.ALLOWED_ORIGIN) {
  app.use('/api', cors({ origin: process.env.ALLOWED_ORIGIN }))
}
```

- [ ] **Commit**
```bash
git add backend/server.js
git commit -m "fix: restrict CORS to ALLOWED_ORIGIN env var only"
git push
```

---

## Task 2: Remove OAuth token from status response (M1)

**Problem:** `GET /api/agrofit-status` returns `tokenBody` which contains the live Embrapa OAuth `access_token`. Any authenticated user can harvest it.

- [ ] **Read `backend/routes/agrofit.js`**

- [ ] **Fix the `let` declaration** — remove `tokenBody`:

Find:
```javascript
  let tokenStatus = null, tokenBody = null, tokenOk = false, tokenErr = null
```
Replace with:
```javascript
  let tokenStatus = null, tokenOk = false, tokenErr = null
```

- [ ] **Fix the token assignment** — stop storing in outer variable:

Find:
```javascript
      tokenBody   = await r.json().catch(() => null)
      tokenOk     = r.ok && !!tokenBody?.access_token
```
Replace with:
```javascript
      const body  = await r.json().catch(() => null)
      tokenOk     = r.ok && !!body?.access_token
```

- [ ] **Fix the response** — remove `tokenBody`:

Find:
```javascript
  res.json({ ok: true, vars, tokenStatus, tokenBody, tokenOk, tokenErr })
```
Replace with:
```javascript
  res.json({ ok: true, vars, tokenStatus, tokenOk, tokenErr })
```

- [ ] **Commit**
```bash
git add backend/routes/agrofit.js
git commit -m "fix: remove live OAuth token from agrofit-status response"
git push
```

---

## Task 3: Sanitize error messages (M2)

**Problem:** `catch` blocks return `error: err.message` to clients, leaking Oracle error codes, schema names, and internal paths.

**Rule for every fix:** add `console.error('[label]', err)` before the response, then return `'Erro interno do servidor'` instead of `err.message`.

### 3a — `backend/routes/auth.js`

- [ ] **Read `backend/routes/auth.js`**

- [ ] **Fix login catch**

Find:
```javascript
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/auth/register',
```
Replace with:
```javascript
  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
})

router.post('/auth/register',
```

- [ ] **Fix register catch**

Find:
```javascript
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Promover usuário
```
Replace with:
```javascript
  } catch (err) {
    console.error('[auth/register]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
})

// Promover usuário
```

- [ ] **Fix promote catch**

Find:
```javascript
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
```
Replace with:
```javascript
  } catch (err) {
    console.error('[auth/promote]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
})

module.exports = router
```

### 3b — `backend/routes/agrofit.js`

- [ ] **Re-read `backend/routes/agrofit.js`** (was modified in Task 2)

There are exactly two `error: err.message` instances in 500 responses. Replace both:

**Instance 1** — at the end of the scraping/lookup handler (around the `buscarDocumentos` area before `/agrofit-status`):

Find:
```javascript
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/agrofit-status',
```
Replace with:
```javascript
  } catch (err) {
    console.error('[agrofit/scrape]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

router.get('/agrofit-status',
```

**Instance 2** — in the `/agrofit-docs` handler:

Find:
```javascript
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.get('/agrofit-ids',
```
Replace with:
```javascript
  } catch (err) {
    console.error('[agrofit-docs]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
})

router.get('/agrofit-ids',
```

### 3c — `backend/routes/banco.js`

- [ ] **Read `backend/routes/banco.js`**

- [ ] **Find all instances** by running:
```bash
grep -n "error: err.message" backend/routes/banco.js
```

- [ ] **Replace every instance** found. For each one, add a `console.error` line above the `res.status(500)` and change `err.message` to `'Erro interno do servidor'`. Use a label that matches the surrounding route context. Example pattern:

```javascript
// Before:
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }

// After:
  } catch (err) {
    console.error('[banco/LABEL]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
```

Labels to use based on surrounding route:
- Oracle SQL console route → `[banco/sql]`
- `/buscar-produto` → `[banco/buscar-produto]`
- `/verificar-produto` → `[banco/verificar-produto]`
- `/cccb` → `[banco/cccb]`
- Any other → `[banco/route]`

- [ ] **Commit all three files**
```bash
git add backend/routes/auth.js backend/routes/agrofit.js backend/routes/banco.js
git commit -m "fix: sanitize 500 error messages, log internally instead of leaking to client"
git push
```

---

## Task 4: Fix SSRF in PDF proxy (H1)

**Problem:** `GET /api/agrofit-pdf` is a **public endpoint (no JWT)**. It checks `url.includes('agrofit.agricultura.gov.br')` — bypassed trivially with `https://attacker.com/?x=agrofit.agricultura.gov.br`. The server becomes an open proxy.

- [ ] **Read `backend/routes/agrofit-public.js`**

- [ ] **Replace the validation block**

Find:
```javascript
  const { url } = req.query
  if (!url || !url.includes('agrofit.agricultura.gov.br'))
    return res.status(400).json({ ok: false, error: 'URL inválida' })

  const cleanUrl = url.replace(/ /g, '%20')
```
Replace with:
```javascript
  const { url } = req.query
  let parsedUrl
  try { parsedUrl = new URL(url) } catch {
    return res.status(400).json({ ok: false, error: 'URL inválida' })
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'agrofit.agricultura.gov.br')
    return res.status(400).json({ ok: false, error: 'URL inválida' })

  const cleanUrl = url.replace(/ /g, '%20')
```

- [ ] **Commit**
```bash
git add backend/routes/agrofit-public.js
git commit -m "fix: replace SSRF substring check with strict URL hostname validation in agrofit-pdf"
git push
```

---

## Task 5: Add requireAdmin to mapping mutations (H3)

**Problem:** `DELETE /api/agrofit-ids/:ma` and `POST /api/agrofit-ids` let any authenticated viewer delete or overwrite MA→ID mappings. `requireAdmin` is not currently imported in `agrofit.js`.

**Do NOT protect** `POST /api/agrofit-ids/link-cod` — it is called automatically by regular users during normal product selection.

- [ ] **Re-read `backend/routes/agrofit.js`** (was modified in Tasks 2 and 3b)

- [ ] **Add requireAdmin import** at the top of the file, after the existing requires:

Find:
```javascript
const agrofitApi = require('../lib/agrofitApi');
```
Replace with:
```javascript
const agrofitApi   = require('../lib/agrofitApi');
const requireAdmin = require('../middleware/requireAdmin');
```

- [ ] **Protect `POST /agrofit-ids`**

Find:
```javascript
router.post('/agrofit-ids', (req, res) => {
```
Replace with:
```javascript
router.post('/agrofit-ids', requireAdmin, (req, res) => {
```

- [ ] **Protect `DELETE /agrofit-ids/:ma`**

Find:
```javascript
router.delete('/agrofit-ids/:ma', (req, res) => {
```
Replace with:
```javascript
router.delete('/agrofit-ids/:ma', requireAdmin, (req, res) => {
```

- [ ] **Commit**
```bash
git add backend/routes/agrofit.js
git commit -m "fix: require admin role for agrofit-ids upsert and delete mutations"
git push
```

---

## Task 6: Gate self-registration (H2)

**Problem:** `POST /api/auth/register` is public — anyone creates a `viewer` account and immediately accesses Oracle, Celepar, SIGEN. `AuthView` shows a register form to unauthenticated users.

**New flow:** Only admins create accounts. `GPL_SCRAPER` is the bootstrap admin.

### 6a — Backend

- [ ] **Re-read `backend/routes/auth.js`** (was modified in Task 3a)

- [ ] **Gate the register route**

Find:
```javascript
router.post('/auth/register', async (req, res) => {
```
Replace with:
```javascript
router.post('/auth/register', requireAuth, requireAdmin, async (req, res) => {
```

(`requireAuth` and `requireAdmin` are already imported at the top of this file.)

### 6b — Frontend

- [ ] **Read `frontend/src/views/AuthView.jsx`**

- [ ] **Replace the full file** (remove register mode):

```jsx
import { LoginView } from './LoginView'
import s from './AuthView.module.css'

export function AuthView({ onAuth }) {
  return (
    <div className={s.page}>
      <div className={s.imagePanel} />
      <div className={s.formPanel}>
        <LoginView onAuth={onAuth} />
      </div>
    </div>
  )
}
```

- [ ] **Read `frontend/src/views/LoginView.jsx`**

- [ ] **Remove the register link** — replace the full file:

```jsx
import { useState } from 'react'
import s from './AuthView.module.css'

export function LoginView({ onAuth }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await r.json()
      if (data.ok) {
        localStorage.setItem('token', data.token)
        onAuth(data.token, data.username)
      } else {
        setError(data.error || 'erro ao entrar')
      }
    } catch {
      setError('erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.formWrapper}>
      <div className={s.brand}>AgroCheck</div>
      <h1 className={s.heading}>Faça seu<br />login.</h1>
      <form className={s.form} onSubmit={handleSubmit}>
        <div className={s.field}>
          <label htmlFor="au-username">Usuário</label>
          <input
            id="au-username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className={s.field}>
          <label htmlFor="au-password">Senha</label>
          <input
            id="au-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <p className={s.error}>{error}</p>
        <button className={s.btn} type="submit" disabled={loading || !username || !password}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Build frontend**
```bash
cd frontend && npm run build
```
Expected: `✓ built in ~Xms` with no errors.

- [ ] **Commit**
```bash
git add backend/routes/auth.js frontend/src/views/AuthView.jsx frontend/src/views/LoginView.jsx backend/public/
git commit -m "fix: gate registration to admin-only, remove public register form"
git push
```

---

## Task 7: Decouple admin password from Oracle password (C1)

**Problem:** `GPL_SCRAPER` authenticates via `process.env.ORACLE_PASSWORD`, meaning the Oracle DB password is also the web admin password.

**⚠️ STOP — manual server step required BEFORE committing this task:**
Add `GPL_SCRAPER_PASSWORD=<chosen-password>` to NSSM `AppEnvironmentExtra` for the `CeleparApp` service on the remote server. If you push before this is set, the admin login will return 500 and no one can log in as admin.

Only continue to the code steps after confirming this env var is set on the server.

- [ ] **Re-read `backend/routes/auth.js`** (was modified in Tasks 3a and 6a)

- [ ] **Replace the password check**

Find:
```javascript
    if (username.toUpperCase() === GPL_USER) {
      if (password !== process.env.ORACLE_PASSWORD)
        return res.status(401).json({ ok: false, error: 'credenciais inválidas' })
```
Replace with:
```javascript
    if (username.toUpperCase() === GPL_USER) {
      const adminPwd = process.env.GPL_SCRAPER_PASSWORD
      if (!adminPwd) {
        console.error('[auth/login] GPL_SCRAPER_PASSWORD não configurado')
        return res.status(500).json({ ok: false, error: 'Erro de configuração do servidor' })
      }
      if (password !== adminPwd)
        return res.status(401).json({ ok: false, error: 'credenciais inválidas' })
```

- [ ] **Commit and push** (only after confirming the env var is set on the server)
```bash
git add backend/routes/auth.js
git commit -m "fix: decouple GPL_SCRAPER admin password from ORACLE_PASSWORD env var"
git push
```

---

## Task 8: Shorten token lifetime (C2)

**Problem:** JWTs are valid for 30 days with no revocation. A leaked token stays valid for a month.

- [ ] **Re-read `backend/routes/auth.js`** (was modified in Tasks 3a, 6a, and 7)

- [ ] **Change expiry**

Find:
```javascript
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' })
```
Replace with:
```javascript
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' })
```

- [ ] **Commit**
```bash
git add backend/routes/auth.js
git commit -m "fix: reduce JWT lifetime from 30d to 8h"
git push
```
