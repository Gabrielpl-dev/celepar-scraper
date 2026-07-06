const cerebrasClient = require('./cerebrasClient');
const lmstudioClient = require('./lmstudioClient');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Tenta Cerebras (gemma-4-31b, mais rápido) primeiro.
// Rate limit (preview tem janela apertada por minuto): espera o tempo indicado pela API
// e tenta de novo, em vez de cair pro LM Studio — o gargalo é temporário, não uma falha real.
// Qualquer outro erro (chave inválida, timeout, modelo fora do ar) cai pro LM Studio direto,
// do jeito que já funcionava antes.
async function callVision(prompt, pdfPath, opts = {}) {
  try {
    return await cerebrasClient.callVision(prompt, pdfPath, opts);
  } catch (err) {
    if (err instanceof cerebrasClient.RateLimitError) {
      const espera = Math.ceil(err.retryAfterMs / 1000);
      console.warn(`[visionClient] Cerebras rate limit — aguardando ${espera}s pra tentar de novo`);
      await sleep(err.retryAfterMs);
      try {
        return await cerebrasClient.callVision(prompt, pdfPath, opts);
      } catch (err2) {
        console.warn(`[visionClient] Cerebras ainda indisponível após espera (${err2.message}) — usando LM Studio`);
        return lmstudioClient.callVision(prompt, pdfPath, opts);
      }
    }

    console.warn(`[visionClient] Cerebras indisponível (${err.message}) — usando LM Studio`);
    return lmstudioClient.callVision(prompt, pdfPath, opts);
  }
}

module.exports = { callVision };
