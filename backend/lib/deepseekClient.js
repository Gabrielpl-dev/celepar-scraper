const https = require('https');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEFAULT_MODEL = 'deepseek-chat';

async function callDeepSeek(prompt, { model = DEFAULT_MODEL, maxTokens = 1200, temperature = 0, systemPrompt } = {}) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const payload = JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
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
          if (json.error) return reject(new Error(`DeepSeek API: ${json.error.message}`));
          resolve({
            content: json.choices[0].message.content,
            usage: json.usage,
          });
        } catch (e) {
          reject(new Error(`DeepSeek parse error: ${e.message} — raw: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('DeepSeek timeout')); });
    req.write(payload);
    req.end();
  });
}

module.exports = { callDeepSeek };
