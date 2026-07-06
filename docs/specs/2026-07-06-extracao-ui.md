# UI de extração de bulas (v1)

## Contexto

O pipeline de extração (`backend/extracao/`) já roda via CLI (`teste.js`): mapeia páginas por
campo, chama um provider de visão (`cerebrasClient` / `lmstudioClient`, com fallback em
`visionClient`), e confere se o valor bate no texto da página (`confirmador.js`). Não existe
endpoint HTTP nem UI — a tela `/extracao` (`ExtracaoApp.jsx`) é hoje só um placeholder.

Testes comparativos (37/40 campos corretos em ambos os providers, nos 4 PDFs com gabarito)
mostraram que Cerebras e LM Studio empatam em acurácia mas erram em campos diferentes, e que
`confirmarNoTexto` já resolve a maioria dos casos de divergência (valor que não aparece
literalmente na página perde pro que aparece).

## Objetivo

Upload de um PDF de bula → rodar os 11 campos com os dois providers em paralelo por campo →
mostrar resultado em tempo real → permitir ver a página de origem de cada campo extraído.

## Arquitetura

**Backend — `routes/extracao.js`:**

1. `POST /api/extracao/rodar` (multipart, campo `pdf`): abre uma resposta SSE
   (`text/event-stream`). Roda `mapearPaginas(pdf)` uma vez. Processa os 11 campos de
   `campos_cadastro_produto.js` **sequencialmente entre si** (evita estourar o rate limit do
   Cerebras mais rápido do que precisa), mas os **dois providers de um mesmo campo rodam em
   paralelo** (`Promise.all([cerebrasClient.callVision, lmstudioClient.callVision])`).

   Regra de decisão por campo:
   - Valores iguais (após `norm()`) → `confianca: 'alta'`, usa o valor.
   - Valores diferentes → roda `confirmarNoTexto` nos dois contra o texto da página; usa o que
     bateu. Se nenhum bateu ou os dois bateram → `confianca: 'revisar'`, expõe os dois valores
     brutos.
   - Um provider falhou (erro/timeout) → usa o outro isolado, `confianca: 'alta'` (não é
     divergência, é indisponibilidade).
   - Os dois falharam → `confianca: 'erro'`, campo sem valor.

   Emite um evento SSE por campo pronto (`{ campo, valor, confianca, pagina, cerebras, lmstudio }`)
   e um evento final `done`.

2. `GET /api/extracao/pagina?pdf=&pagina=`: renderiza a página em PNG (reaproveita `pdfToPng`,
   mesma função usada pelos clients), com cache em memória simples (chave `pdf:pagina`).

3. PDF enviado é salvo temporariamente em `backend/extracao/bulas/` durante a sessão de extração
   (multer ou equivalente).

**Frontend — `frontend/src/extracao/ExtracaoApp.jsx`:**

1. Dropzone/input de arquivo PDF.
2. Ao enviar: abre `EventSource` no endpoint SSE, renderiza tabela com 11 linhas em estado
   "aguardando".
3. Cada evento SSE atualiza a linha correspondente: valor final + selo (✓ alta confiança /
   ⚠ revisar / ✗ erro).
4. Clique na linha → painel lateral mostra a imagem da página (`GET /api/extracao/pagina`) e o
   selo de confirmação; se divergiu entre providers, mostra os dois valores brutos lado a lado.

## Fora de escopo (v2+)

- Edição/correção manual do valor (integraria com `feedbackDb.js`, que já existe).
- Highlight da posição exata do texto sobre a imagem da página (hoje só mostra a página inteira).
- Persistência do resultado da extração em banco — v1 é só visualização.
