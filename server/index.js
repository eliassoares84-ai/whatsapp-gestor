const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3001;
const MODEL_NAME = 'gemini-2.5-flash';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractJsonFromText = (text) => {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text;
};

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. Parse Voice / Text Command
app.post('/api/ai/parse-command', async (req, res) => {
  try {
    const { text, availableCategories = ['Outros'], userLanguage = 'pt-BR' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Parâmetro text é obrigatório.' });
    }

    const client = getClient();
    if (!client) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor proxy.' });
    }

    const model = client.getGenerativeModel({ model: MODEL_NAME });

    const systemPrompt = [
      'Você é um assistente financeiro de alta precisão.',
      'Analise a entrada de texto e extraia o lançamento financeiro estritamente no formato JSON.',
      `Categorias disponíveis: ${availableCategories.join(', ')}.`,
      'Schema JSON esperado:',
      '{',
      '  "data": {',
      '    "amount": number (obrigatório, positivo),',
      '    "type": "expense" | "income" (obrigatório),',
      '    "category": string (deve escolher a melhor entre as disponíveis ou "Outros"),',
      '    "note": string (descrição limpa da compra/receita),',
      '    "paymentMethod": "cash" | "debit" | "credit" | "pix",',
      '    "installments": number (quantidade de parcelas, default 1)',
      '  },',
      '  "confirmationMsg": string',
      '}',
      `CRÍTICO: A mensagem de confirmação (confirmationMsg) DEVE estar no idioma: ${userLanguage}.`,
    ].join('\n');

    const result = await model.generateContent([
      systemPrompt,
      `Texto informado pelo usuário: "${text}"`,
    ]);

    const raw = result.response.text();
    const parsed = safeJsonParse(extractJsonFromText(raw));

    if (!parsed || !parsed.data) {
      return res.status(422).json({ error: 'Não foi possível estruturar os dados.', raw });
    }

    return res.json(parsed);
  } catch (error) {
    console.error('Erro no proxy parse-command:', error);
    return res.status(500).json({ error: 'Erro ao processar comando com IA.' });
  }
});

// 2. Financial Insights
app.post('/api/ai/insights', async (req, res) => {
  try {
    const { transactions = [], accounts = [], userLanguage = 'pt-BR' } = req.body;

    const client = getClient();
    if (!client) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor proxy.' });
    }

    const model = client.getGenerativeModel({ model: MODEL_NAME });

    const systemPrompt = `Você é um consultor financeiro sênior. O usuário enviará um extrato JSON das transações recentes e os saldos das contas. Sua tarefa é analisar o comportamento financeiro e retornar exatamente 3 dicas curtas, diretas e acionáveis (máximo de 2 frases cada) sobre como economizar ou otimizar dinheiro. Retorne estritamente um JSON no formato: {"insights":["dica 1","dica 2","dica 3"]}. CRÍTICO: Você DEVE gerar sua resposta no idioma: ${userLanguage}.`;

    const result = await model.generateContent([
      systemPrompt,
      `Dados do usuário: ${JSON.stringify({ transactions, accounts })}`,
    ]);

    const raw = result.response.text();
    const parsed = safeJsonParse(extractJsonFromText(raw));

    if (parsed && Array.isArray(parsed.insights)) {
      return res.json({ insights: parsed.insights.slice(0, 3) });
    }

    return res.json({
      insights: [
        'Revise os maiores gastos recorrentes e corte despesas supérfluas este mês.',
        'Concentre os gastos em uma conta ou cartão para facilitar o acompanhamento.',
        'Defina uma meta fixa de economia no início de cada mês.',
      ],
    });
  } catch (error) {
    console.error('Erro no proxy insights:', error);
    return res.status(500).json({ error: 'Erro ao gerar insights com IA.' });
  }
});

// 3. Financial Consultant Chat
app.post('/api/ai/consultant', async (req, res) => {
  try {
    const { question, history = [], userLanguage = 'pt-BR' } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Pergunta obrigatória.' });
    }

    const client = getClient();
    if (!client) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor proxy.' });
    }

    const model = client.getGenerativeModel({ model: MODEL_NAME });

    const prompt = [
      'Você é um consultor financeiro pessoal objetivo e didático.',
      'Use apenas os dados enviados e responda de forma curta e acionável.',
      `Pergunta do usuário: ${question}`,
      `Histórico anonimizado: ${JSON.stringify(history)}`,
      `CRÍTICO: Responda no idioma: ${userLanguage}.`,
    ].join('\n\n');

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();

    return res.json({ answer: answer || 'Não foi possível gerar recomendação no momento.' });
  } catch (error) {
    console.error('Erro no proxy consultant:', error);
    return res.status(500).json({ error: 'Erro no consultor IA.' });
  }
});

app.listen(port, () => {
  console.log(`[AI-PROXY] Servidor rodando com sucesso na porta ${port}`);
});
