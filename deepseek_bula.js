require('./backend/node_modules/dotenv').config({ path: './backend/.env' });
const { callVision } = require('./backend/lib/lmstudioClient');
const path = require('path');

const PDF = path.join(__dirname, 'Bula-de-teste.pdf');
const SYSTEM_PROMPT = 'Você é um sistema especializado em extração de dados de bulas de agrotóxicos brasileiros. Extraia apenas o que estiver explicitamente no texto. Nunca invente informações.';

callVision(
  'Extraia o(s) nome(s) comercial(is) do produto registrado nesta bula. Se houver mais de um, separe com ";". Retorne apenas os nomes, sem explicações.',
  PDF,
  { systemPrompt: SYSTEM_PROMPT, maxTokens: 100, pages: [1] }
).then(r => console.log('Nome comercial:', r.content.trim()))
 .catch(console.error);
