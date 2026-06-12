# Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all security vulnerabilities identified in the June 2026 audit, ordered Medium → High → Critical.

**Architecture:** Surgical changes to backend routes and one frontend adjustment. No new npm dependencies. Each task is independent and commits cleanly.

**Tech Stack:** Node.js/Express, better-sqlite3, jsonwebtoken, bcrypt, cors (already installed).

**Deploy note:** This project runs on a remote server (`<IP_SERVIDOR>`). Local machine is edit-only. After pushing:
1. On server: `git pull` then `<NSSM_EXE> restart CeleparApp`
2. For Task 7 (C1): also add `GPL_SCRAPER_PASSWORD` to NSSM `AppEnvironmentExtra` on the server **before** deploying that task.
3. Frontend changes require `cd frontend && npm run build` before committing — build artifacts land in `backend/public/` and must be committed.

**No test framework is configured.** Skip all TDD steps. Implement directly.

---

## File Map

| File | Task(s) |
|------|---------|
| `backend/server.js` | Task 1 (CORS) |
| `backend/routes/agrofit.js` | Task 2 (tokenBody), Task 3 (errors), Task 5 (requireAdmin) |
| `backend/routes/auth.js` | Task 3 (errors), Task 6 (registration), Task 7 (admin pwd), Task 8 (token TTL) |
| `backend/routes/banco.js` | Task 3 (errors) |
| `backend/routes/agrofit-public.js` | Task 4 (SSRF) |
| `frontend/src/views/AuthView.jsx` | Task 6 (remove register UI) |

---

## Task 1: Restrict CORS (M3)

**Problem:** `app.use(cors())` in `server.js:9` allows any origin to call the API. In production the frontend is served by the same Express process (same origin), so CORS is only needed for local dev (Vite on port 5173).

**File:** `backend/server.js`

- [ ] **Read `backend/server.js`**

- [ ] **Replace the open CORS middleware**

Replace line 9:
```javascript
app.use(cors());
```
With:
```javascript
if (process.env.ALLOWED_ORIGIN) {
  app.use('/api', cors({ origin: process.env.ALLOWED_ORIGIN }))
}
```

The full top of the file should look like:
```javascript
require('dotenv').config()
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

if (process.env.ALLOWED_ORIGIN) {
  app.use('/api', cors({ origin: process.env.ALLOWED_ORIGIN }))
}
app.use(express.json());
```

In production `ALLOWED_ORIGIN` is not set → no CORS headers (correct, same origin). In dev, set `ALLOWED_ORIGIN=http://localhost:5173` in the local `.env`.

- [ ] **Commit**
```bash
git add backend/server.js
git commit -m "fix: restrict CORS to ALLOWED_ORIGIN env var only"
git push
```

---

## Task 2: Remove OAuth token from status response (M1)

**Problem:** `GET /api/agrofit-status` at `backend/routes/agrofit.js:116` returns `tokenBody` which contains the live Embrapa OAuth `access_token`. Any authenticated user can harvest it.

**File:** `backend/routes/agrofit.js`

- [ ] **Read `backend/routes/agrofit.js`**

- [ ] **Remove `tokenBody` from the response (line ~116)**

Find:
```javascript
  res.json({ ok: true, vars, tokenStatus, tokenBody, tokenOk, tokenErr })
```
Replace with:
```javascript
  res.json({ ok: true, vars, tokenStatus, tokenOk, tokenErr })
```

Also remove the `tokenBody` variable assignment a few lines above (line ~109) to keep the code clean:
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
And remove `tokenBody` from the `let` declaration on the line that has `let tokenStatus = null, tokenBody = null, tokenOk = false, tokenErr = null`:
```javascript
  let tokenStatus = null, tokenOk = false, tokenErr = null
```

- [ ] **Commit**
```bash
git add backend/routes/agrofit.js
git commit -m "fix: remove live OAuth token from agrofit-status response"
git push
```

---

## Task 3: Sanitize error messages (M2)

**Problem:** Many `catch` blocks return `error: err.message` directly to clients, leaking Oracle error codes (`ORA-XXXXX`), schema/column names, and internal paths.

**Rule:** Replace `error: err.message` in every 500 response with `error: 'Erro interno do servidor'`. Add `console.error('[route-name]', err)` before the response.

### 3a — `backend/routes/auth.js`

- [ ] **Read `backend/routes/auth.js`**

- [ ] **Fix login catch (line ~38)**

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

- [ ] **Fix register catch (line ~61)**

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

- [ ] **Fix promote catch (line ~77)**

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

- [ ] **Read `backend/routes/agrofit.js`** (already read in Task 2 — re-read if needed)

- [ ] **Fix all `error: err.message` in 500 responses**

There are two instances. Find each one that looks like:
```javascript
    res.status(500).json({ ok: false, error: err.message })
```
For each, add a `console.error` and change the message. Example for the agrofit-docs handler (line ~143):
```javascript
  } catch (err) {
    console.error('[agrofit-docs]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
```
Apply the same pattern to any other 500 handler in this file.

### 3c — `backend/routes/banco.js`

- [ ] **Read the 500 error handlers in `backend/routes/banco.js`**

Search for all occurrences of `error: err.message` in `res.status(500)` responses. The audit identified them at approximately lines 74, 98, 272, 317, 463 but the file may have drifted — grep for the pattern.

- [ ] **Replace every instance** following the same rule: add `console.error('[banco/<route>]', err)` and return `error: 'Erro interno do servidor'`. Pick a label that matches the route context (e.g. `[banco/sql]`, `[banco/cccb]`).

- [ ] **Commit all three files together**
```bash
git add backend/routes/auth.js backend/routes/agrofit.js backend/routes/banco.js
git commit -m "fix: sanitize 500 error messages, log internally instead of leaking to client"
git push
```

---

## Task 4: Fix SSRF in PDF proxy (H1)

**Problem:** `GET /api/agrofit-pdf` is a **public endpoint (no JWT)**. It validates the target URL with `url.includes('agrofit.agricultura.gov.br')` — a substring check trivially bypassed with `https://attacker.com/?x=agrofit.agricultura.gov.br`. This turns the server into an open proxy accessible without authentication.

**File:** `backend/routes/agrofit-public.js`

- [ ] **Read `backend/routes/agrofit-public.js`**

- [ ] **Replace substring check with strict hostname validation**

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

**Problem:** `DELETE /api/agrofit-ids/:ma` at `agrofit.js:167` lets any authenticated viewer wipe MA→ID mappings permanently. `POST /api/agrofit-ids` (upsert) at line 152 has the same issue.

Note: `POST /api/agrofit-ids/link-cod` at line 159 is intentionally called by regular users during normal product selection — **do NOT add requireAdmin to link-cod**.

**File:** `backend/routes/agrofit.js`

- [ ] **Read `backend/routes/agrofit.js`** (already read — re-read if needed)

- [ ] **Add `requireAdmin` import check**

Check the top of the file. `requireAdmin` may not be imported yet. If missing, add it:
```javascript
const requireAdmin = require('../middleware/requireAdmin')
```
(It is already imported in `auth.js` and `banco.js` following the same pattern.)

- [ ] **Protect `POST /agrofit-ids`** (upsert, line ~152)

Find:
```javascript
router.post('/agrofit-ids', (req, res) => {
```
Replace with:
```javascript
router.post('/agrofit-ids', requireAdmin, (req, res) => {
```

- [ ] **Protect `DELETE /agrofit-ids/:ma`** (line ~167)

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

## Task 6: Gate self-registration (H2) — backend + frontend

**Problem:** `POST /api/auth/register` is public. Anyone can create a `viewer` account and immediately access Oracle data, Celepar, SIGEN, and SIGEN scrapers. `AuthView.jsx` shows a register form to unauthenticated users.

**New flow:** Only admins can create new user accounts. The `GPL_SCRAPER` hardcoded admin account is used to bootstrap new users.

### 6a — Backend

**File:** `backend/routes/auth.js`

- [ ] **Read `backend/routes/auth.js`** (already read)

- [ ] **Add `requireAuth` + `requireAdmin` to the register route**

Find:
```javascript
router.post('/auth/register', async (req, res) => {
```
Replace with:
```javascript
router.post('/auth/register', requireAuth, requireAdmin, async (req, res) => {
```

Both `requireAuth` and `requireAdmin` are already imported at the top of this file.

### 6b — Frontend

**File:** `frontend/src/views/AuthView.jsx`

- [ ] **Read `frontend/src/views/AuthView.jsx`** (already read — the file is small)

- [ ] **Remove the register mode entirely**

Replace the full file content with:
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

Note: `LoginView` receives `onSwitchToRegister` as a prop — after this change it won't be passed. Read `frontend/src/views/LoginView.jsx` and remove any "Cadastrar" / register link/button that calls `onSwitchToRegister`. That prop is now unused.

- [ ] **Read `frontend/src/views/LoginView.jsx` and remove register link**

Find any element that calls `onSwitchToRegister` (likely a button or link near the bottom of the form) and delete it along with the prop from the function signature.

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

**Problem:** The hardcoded `GPL_SCRAPER` admin account in `auth.js:22` authenticates by comparing the submitted password against `process.env.ORACLE_PASSWORD`. This means the Oracle DB password doubles as a web admin password — leaking one leaks the other.

**Fix:** Use a dedicated `GPL_SCRAPER_PASSWORD` environment variable.

**⚠️ Manual step required BEFORE deploying this task:**
On the server, add `GPL_SCRAPER_PASSWORD=<chosen-password>` to NSSM `AppEnvironmentExtra` for the `CeleparApp` service. This must be done before `git pull` + restart, or the admin account will stop working.

**File:** `backend/routes/auth.js`

- [ ] **Read `backend/routes/auth.js`** (already read)

- [ ] **Replace the password comparison**

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

- [ ] **Commit**
```bash
git add backend/routes/auth.js
git commit -m "fix: decouple GPL_SCRAPER admin password from ORACLE_PASSWORD env var"
git push
```

- [ ] **Add `GPL_SCRAPER_PASSWORD` on the server** (manual — do before restarting)

---

## Task 8: Shorten token lifetime (C2)

**Problem:** JWTs are valid for 30 days with no revocation. A leaked token (e.g. via XSS or shared machine) stays valid for a month.

**Fix:** Reduce to 8 hours. This is a partial mitigation — full revocation would require a token blocklist, which is out of scope here.

**File:** `backend/routes/auth.js`

- [ ] **Read `backend/routes/auth.js`** (already read)

- [ ] **Change token expiry**

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

---

## Self-Review Checklist

- [x] M3 (CORS) → Task 1
- [x] M1 (tokenBody) → Task 2
- [x] M2 (error messages) → Task 3
- [x] H1 (SSRF PDF proxy) → Task 4
- [x] H3 (requireAdmin mutations) → Task 5
- [x] H2 (open registration) → Task 6
- [x] C1 (Oracle password reuse) → Task 7
- [x] C2 (30-day tokens) → Task 8
- [x] All tasks have exact file paths and full replacement code
- [x] No TDD steps (no test framework configured)
- [x] Frontend tasks include `npm run build` and commit of `backend/public/`
- [x] Tasks are ordered: medium → high → critical
- [x] Each task commits independently
