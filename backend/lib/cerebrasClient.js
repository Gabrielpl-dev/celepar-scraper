const https = require('https');
const path = require('path');
const { pdfToPng } = require('pdf-to-png-converter');

const BACKEND_DIR = path.join(__dirname, '..');

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const VISION_MODEL      = process.env.CEREBRAS_VISION_MODEL || 'gemma-4-31b'; // preview: único modelo com suporte a imagem no catálogo público
const RATE_LIMIT_DEFAULT_MS = 60000; // preview não manda Retry-After sempre; janela é por minuto
const MAX_IMAGES_PER_REQUEST = Number(process.env.CEREBRAS_MAX_IMAGES) || 2; // Free Trial: 2/req; Developer: 5/req

let ultimaCota = null; // último snapshot de x-ratelimit-* visto (debug/observabilidade)

function lerCota(headers) {
  const n = v => v !== undefined ? Number(v) : undefined;
  return {
    remainingRequestsMinute: n(headers['x-ratelimit-remaining-requests-minute']),
    limitRequestsMinute:     n(headers['x-ratelimit-limit-requests-minute']),
    remainingTokensMinute:   n(headers['x-ratelimit-remaining-tokens-minute']),
    limitTokensMinute:       n(headers['x-ratelimit-limit-tokens-minute']),
  };
}

class RateLimitError extends Error {
  constructor(message, retryAfterMs) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

async function callVision(prompt, pdfPath, { maxTokens = 1200, temperature = 0, systemPrompt, pages: pagesToProcess } = {}) {
  if (pagesToProcess && pagesToProcess.length > MAX_IMAGES_PER_REQUEST) {
    pagesToProcess = pagesToProcess.slice(0, MAX_IMAGES_PER_REQUEST);
  }

  const origCwd = process.cwd();
  process.chdir(BACKEND_DIR);
  let pages;
  try {
    const opts = { verbosityLevel: 0, viewportScale: 1.5, cMapPacked: true };
    if (pagesToProcess) opts.pagesToProcess = pagesToProcess;
    pages = await pdfToPng(pdfPath, opts);
  } finally {
    process.chdir(origCwd);
  }

  if (pages.length > MAX_IMAGES_PER_REQUEST) {
    pages = pages.slice(0, MAX_IMAGES_PER_REQUEST);
  }

  const imageContent = pages.map(p => ({
    type: 'image_url',
    image_url: { url: `data:image/png;base64,${p.content.toString('base64')}` },
  }));

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({
    role: 'user',
    content: [
      ...imageContent,
      { type: 'text', text: prompt },
    ],
  });

  const payload = JSON.stringify({
    model: VISION_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cerebras.ai',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          ultimaCota = lerCota(res.headers);

          const isRateLimit = res.statusCode === 429
            || json.code === 'request_quota_exceeded'
            || json.type === 'too_many_requests_error';
          if (isRateLimit) {
            const retryAfterHeader = res.headers['retry-after'];
            const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : RATE_LIMIT_DEFAULT_MS;
            return reject(new RateLimitError(json.message || 'Cerebras rate limit', retryAfterMs));
          }

          if (json.error) return reject(new Error(`Cerebras API: ${JSON.stringify(json.error)}`));
          if (!json.choices) return reject(new Error(`Cerebras API: ${json.message || JSON.stringify(json)}`));
          resolve({ content: json.choices[0].message.content, usage: json.usage, rateLimit: ultimaCota });
        } catch (e) {
          reject(new Error(`Cerebras parse error: ${e.message} — raw: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(180000, () => { req.destroy(); reject(new Error('Cerebras timeout')); });
    req.write(payload);
    req.end();
  });
}

module.exports = { callVision, RateLimitError, getUltimaCota: () => ultimaCota };
