const https = require('https');
const { converterPaginas } = require('./pdfToImages');

const LMSTUDIO_BASE_URL = process.env.LMSTUDIO_BASE_URL || 'agent.tricagono.com';
const LMSTUDIO_API_KEY  = process.env.LMSTUDIO_API_KEY  || 'lm-studio';
const VISION_MODEL      = process.env.LMSTUDIO_VISION_MODEL || 'qwen2.5-vl-7b-instruct';

async function callVision(prompt, pdfPath, { maxTokens = 1200, temperature = 0, systemPrompt, pages: pagesToProcess } = {}) {
  const pages = await converterPaginas(pdfPath, pagesToProcess);

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
      hostname: LMSTUDIO_BASE_URL,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LMSTUDIO_API_KEY}`,
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
          if (json.error) return reject(new Error(`LMStudio API: ${JSON.stringify(json.error)}`));
          resolve({ content: json.choices[0].message.content, usage: json.usage });
        } catch (e) {
          reject(new Error(`LMStudio parse error: ${e.message} — raw: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(180000, () => { req.destroy(); reject(new Error('LMStudio timeout')); });
    req.write(payload);
    req.end();
  });
}

module.exports = { callVision };
