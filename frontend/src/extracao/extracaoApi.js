function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// EventSource nativo não manda header de Authorization, então o streaming é feito
// lendo o corpo da resposta do fetch manualmente e parseando o formato SSE (`data: ...\n\n`).
export async function rodarExtracao(arquivo, onEvento) {
  const formData = new FormData()
  formData.append('pdf', arquivo)

  const res = await fetch('/api/extracao/rodar', {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })
  if (!res.ok || !res.body) throw new Error('Falha ao iniciar extração (' + res.status + ')')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const partes = buffer.split('\n\n')
    buffer = partes.pop()
    for (const parte of partes) {
      const linha = parte.trim()
      if (!linha.startsWith('data: ')) continue
      onEvento(JSON.parse(linha.slice(6)))
    }
  }
}

// <img src> não manda header de auth, então busca a imagem via fetch e vira object URL.
export async function buscarImagemPagina(pdfNome, pagina) {
  const url = `/api/extracao/pagina?pdf=${encodeURIComponent(pdfNome)}&pagina=${pagina}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error('Falha ao carregar página (' + res.status + ')')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
