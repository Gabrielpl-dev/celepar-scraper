#!/usr/bin/env node
// Cria (uma única vez) a conta de serviço usada pelo mcp-server pra logar como
// agente autônomo, separada de contas humanas e do admin GPL_SCRAPER.
// Roda contra o backend remoto já deployado — nunca localhost (ver CLAUDE.md).
import 'dotenv/config'
import readline from 'node:readline'

const BASE_URL      = process.env.CELEPAR_API_BASE_URL || 'http://140.238.238.172:3000'
const AGENT_USERNAME = process.env.CELEPAR_AGENT_USERNAME || 'AGENTE_MCP'

function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(prompt, answer => { rl.close(); resolve(answer) }))
}

async function main() {
  const adminPassword = process.env.GPL_SCRAPER_PASSWORD || await ask('Senha do GPL_SCRAPER (admin): ')
  const agentPassword = process.env.CELEPAR_AGENT_PASSWORD || await ask(`Senha pra nova conta "${AGENT_USERNAME}": `)

  const loginRes  = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'GPL_SCRAPER', password: adminPassword }),
  })
  const loginData = await loginRes.json()
  if (!loginRes.ok || !loginData.ok) throw new Error(`login admin falhou: ${loginData.error || loginRes.status}`)

  const registerRes  = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginData.token}` },
    body: JSON.stringify({ username: AGENT_USERNAME, password: agentPassword }),
  })
  const registerData = await registerRes.json()
  if (!registerRes.ok || !registerData.ok) throw new Error(`criação da conta falhou: ${registerData.error || registerRes.status}`)

  console.log(`\nConta "${AGENT_USERNAME}" criada com role "${registerData.role}".`)
  console.log(`Preencha o mcp-server/.env com:\n  CELEPAR_AGENT_USERNAME=${AGENT_USERNAME}\n  CELEPAR_AGENT_PASSWORD=<a senha que você acabou de digitar>\n`)
}

main().catch(err => { console.error('Erro:', err.message); process.exitCode = 1 })
