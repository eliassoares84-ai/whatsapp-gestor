import { GoogleGenerativeAI } from '@google/generative-ai';
import * as Localization from 'expo-localization';

import type { Account, PaymentMethod, Transaction, TransactionType } from '../types/finance.types';
import { parseVoiceCommand } from '../utils/voiceParser';

export interface GeminiFinanceData {
  amount?: number;
  type?: TransactionType;
  category?: string;
  note?: string;
  paymentMethod?: PaymentMethod;
  installments?: number;
}

export interface GeminiFinanceResponse {
  data: GeminiFinanceData;
  confirmationMsg: string;
}

export type GeminiFailureMode = 'none' | 'offline' | 'invalid-key' | 'timeout';

interface ProcessFinanceCommandOptions {
  failureMode?: GeminiFailureMode;
  timeoutMs?: number;
  availableCategories?: string[];
}

const MODEL_NAME = 'gemini-2.5-flash';
const CANDIDATE_MODELS = [MODEL_NAME, 'gemini-flash-latest', 'gemini-2.5-flash-lite'];
const DEFAULT_TIMEOUT_MS = 12000;

const getUserLanguageTag = (): string =>
  Localization.getLocales()[0]?.languageTag || 'pt-BR';

const normalizeLabel = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const pickFallbackCategory = (
  availableCategories: string[],
  parsedCategoryId?: string,
  sourceText?: string
): string => {
  if (availableCategories.length === 0) {
    return 'Outros';
  }

  const normalizedCategories = availableCategories.map((name) => ({
    name,
    normalized: normalizeLabel(name),
  }));

  if (parsedCategoryId) {
    const normalizedId = normalizeLabel(parsedCategoryId).replace(/[-_]/g, ' ');
    const mappedById = normalizedCategories.find(
      (category) =>
        category.normalized.includes(normalizedId) ||
        normalizedId.includes(category.normalized)
    );

    if (mappedById) {
      return mappedById.name;
    }
  }

  if (sourceText) {
    const normalizedText = normalizeLabel(sourceText);
    const mappedByText = normalizedCategories.find((category) =>
      normalizedText.includes(category.normalized)
    );

    if (mappedByText) {
      return mappedByText.name;
    }
  }

  const outros = normalizedCategories.find(
    (category) => category.normalized === 'outros'
  );

  return outros?.name || availableCategories[0] || 'Outros';
};

const getGeminiFallbackMessage = (error: unknown): string => {
  const message = String(error);
  const normalized = normalizeLabel(message);

  if (
    normalized.includes('resource_exhausted') ||
    normalized.includes('quota exceeded') ||
    normalized.includes('rate limit')
  ) {
    return 'A cota da IA foi excedida neste momento. Confira os dados e confirme manualmente.';
  }

  if (
    normalized.includes('invalid api key') ||
    normalized.includes('api key not valid') ||
    normalized.includes('permission_denied') ||
    normalized.includes('forbidden')
  ) {
    return 'A chave da IA nao esta autorizada no momento. Confira os dados e confirme manualmente.';
  }

  if (
    normalized.includes('not_found') ||
    normalized.includes('model') && normalized.includes('not found')
  ) {
    return 'O modelo da IA nao esta disponivel agora. Confira os dados e confirme manualmente.';
  }

  if (normalized.includes('timeout')) {
    return 'A IA demorou para responder. Revise os dados e confirme manualmente.';
  }

  return 'Nao foi possivel consultar a IA agora. Confira os dados e confirme manualmente.';
};

const extractFallbackInstallments = (text: string): number => {
  const match = text.match(/(\d+)\s*(?:x|vezes|parcelas)/i);
  return match && match[1] ? parseInt(match[1], 10) : 1;
};

const buildFallbackFinanceResponse = (
  text: string,
  message: string,
  availableCategories: string[] = []
): GeminiFinanceResponse => {
  const parsedLocal = parseVoiceCommand(text);

  return {
    data: {
      amount: parsedLocal.amount,
      type: parsedLocal.type || 'expense',
      category: pickFallbackCategory(
        availableCategories,
        parsedLocal.categoryId,
        text
      ),
      note: parsedLocal.note || text,
      paymentMethod: parsedLocal.paymentMethod || 'cash',
      installments: extractFallbackInstallments(text),
    },
    confirmationMsg: `${message} Apliquei uma analise local para sugerir os dados.`,
  };
};

const AI_PROXY_URL = process.env.EXPO_PUBLIC_AI_PROXY_URL?.replace(/\/+$/, '');

const callProxy = async <T>(
  endpoint: string,
  payload: unknown,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T | null> => {
  if (!AI_PROXY_URL) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${AI_PROXY_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
};

const getClient = (): GoogleGenerativeAI | null => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new GoogleGenerativeAI(apiKey);
};

const safeJsonParse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const extractJsonFromText = (text: string): string => {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
};

const toCategoryId = (category?: string): string | undefined => {
  if (!category) {
    return undefined;
  }

  return category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

const normalizePaymentMethod = (value?: string): PaymentMethod => {
  const normalized = normalizeLabel(value || '');

  if (/(debito|debit)/.test(normalized)) {
    return 'debit';
  }

  if (/(credito|cartao|cartão|credit)/.test(normalized)) {
    return 'credit';
  }

  if (/(pix)/.test(normalized)) {
    return 'pix';
  }

  return 'cash';
};

export const processFinanceCommand = async (
  text: string,
  options: ProcessFinanceCommandOptions = {}
): Promise<GeminiFinanceResponse> => {
  const failureMode = options.failureMode || 'none';
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const normalizedCategories =
    options.availableCategories
      ?.map((name) => name.trim())
      .filter((name) => Boolean(name)) || [];
  const availableCategories =
    normalizedCategories.length > 0 ? normalizedCategories : ['Outros'];

  if (failureMode === 'offline') {
    return buildFallbackFinanceResponse(
      text,
      'Sem conexao com a internet agora. Confira os dados e confirme manualmente.',
      availableCategories
    );
  }

  if (failureMode === 'invalid-key') {
    return buildFallbackFinanceResponse(
      text,
      'A chave da IA parece invalida no momento. Confira os dados e confirme manualmente.',
      availableCategories
    );
  }

  if (failureMode === 'timeout') {
    return buildFallbackFinanceResponse(
      text,
      'A IA demorou para responder. Revise os dados e confirme manualmente.',
      availableCategories
    );
  }

  if (AI_PROXY_URL) {
    const proxyResult = await callProxy<GeminiFinanceResponse>(
      '/api/ai/parse-command',
      {
        text,
        availableCategories,
        userLanguage: getUserLanguageTag(),
      },
      timeoutMs
    );

    if (proxyResult?.data) {
      return proxyResult;
    }
  }

  const client = getClient();

  if (!client) {
    return buildFallbackFinanceResponse(
      text,
      'Nao consegui acessar a IA agora. Confira os dados e confirme manualmente.',
      availableCategories
    );
  }

  try {
    const userLanguage = getUserLanguageTag();

    const systemPrompt = [
      'Você é um assistente financeiro especialista em inteligência contábil e processamento de linguagem natural em português do Brasil.',
      'Sua missão é extrair com precisão cirúrgica os dados de transações financeiras ditadas ou digitadas pelo usuário.',
      `Categorias permitidas: ${availableCategories.join(', ')}.`,
      'REGRAS MANDATÓRIAS:',
      '1. VALOR (amount): Extraia o valor numérico decimal (ex: 45.50). Entenda números por extenso ("trinta e cinco e noventa" -> 35.90, "cem reais" -> 100) e gírias monetárias brasileiras comuns ("50 conto" -> 50, "30 pila" -> 30, "100 pau" -> 100, "20 e 50" -> 20.50, "45 com 50" -> 45.50). Se nenhum valor for dito, retorne null.',
      '2. DESCRIÇÃO/NOTA (note): Crie uma descrição limpa, concisa e elegante com a primeira letra maiúscula (Title Case ou frase) representando o produto, serviço ou estabelecimento. NUNCA inclua o valor numérico, moeda ou forma de pagamento na nota. Exemplos:',
      '   - "Paguei 45 no almoço no restaurante do Zé no cartão" -> note: "Almoço no Restaurante do Zé"',
      '   - "Abasteci 120 de gasolina no posto Shell no débito" -> note: "Gasolina Posto Shell"',
      '   - "Comprei remédio na farmácia 32 reais no pix" -> note: "Remédio na Farmácia"',
      '   - "50 conto de mercado" -> note: "Mercado"',
      '   - "Conta de energia da Copel" -> note: "Conta de Energia Copel"',
      '   - "Recebi 3500 de salário" -> note: "Salário"',
      '   - "Uber para o trabalho 24 reais" -> note: "Uber para o Trabalho"',
      '   - "Pizza de calabresa 65 reais em 2 vezes" -> note: "Pizza de Calabresa"',
      '3. CATEGORIA (category): Escolha obrigatoriamente uma das categorias fornecidas. Se nenhuma se encaixar perfeitamente, escolha a mais próxima pelo contexto.',
      '4. FORMA DE PAGAMENTO (paymentMethod): Mapeie para "credit" (se falar crédito, cartão, parcelado, fatura), "debit" (se falar débito, cartão de débito), "pix" (se falar pix, transferência), ou "cash" (se falar dinheiro, espécie, ou padrão).',
      '5. PARCELAS (installments): Se disser "em 3x", "em 3 vezes", "parcelado em 5", extraia o número. Se não for parcelado, retorne 1.',
      '6. TIPO (type): "expense" (gastos, compras, saídas) ou "income" (receitas, entradas, salários).',
      '7. MENSAGEM (confirmationMsg): Frase curta e natural confirmando o lançamento em português (ex: "Entendido: R$ 45,00 em Almoço no Restaurante no crédito.").',
      'Retorne EXCLUSIVAMENTE um JSON: {"data":{"amount":number|null,"type":"income|expense","category":"string","note":"string","paymentMethod":"cash|debit|credit|pix","installments":number},"confirmationMsg":"string"}',
      `CRÍTICO: Responda obrigatoriamente no idioma da tag: ${userLanguage}.`,
    ].join('\n');

    let raw = '';
    let lastError: unknown = null;

    for (const modelToTry of CANDIDATE_MODELS) {
      try {
        const model = client.getGenerativeModel({ model: modelToTry });
        const result = await Promise.race([
          model.generateContent([
            systemPrompt,
            `Comando do usuario: ${text}`,
          ]),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), Math.min(timeoutMs, 7500));
          }),
        ]);

        raw = result.response.text().trim();
        if (raw) break;
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    if (!raw && lastError) {
      throw lastError;
    }
    const parsed = safeJsonParse<GeminiFinanceResponse>(extractJsonFromText(raw));

    if (!parsed) {
      return buildFallbackFinanceResponse(
        text,
        'Nao consegui interpretar com confianca. Pode revisar e confirmar?',
        availableCategories
      );
    }

    const normalizedType: TransactionType =
      parsed.data.type === 'income' ? 'income' : 'expense';
    const normalizedPaymentMethod = normalizePaymentMethod(parsed.data.paymentMethod);
    const parsedInstallments = typeof parsed.data.installments === 'number' && parsed.data.installments > 0 ? parsed.data.installments : 1;

    return {
      data: {
        amount:
          typeof parsed.data.amount === 'number' ? parsed.data.amount : undefined,
        type: normalizedType,
        category: parsed.data.category,
        note: parsed.data.note,
        paymentMethod: normalizedPaymentMethod,
        installments: parsedInstallments,
      },
      confirmationMsg:
        parsed.confirmationMsg ||
        'Entendi seu lancamento. Posso salvar essa movimentacao?',
    };
  } catch (error) {
    return buildFallbackFinanceResponse(
      text,
      getGeminiFallbackMessage(error),
      availableCategories
    );
  }
};

export const askFinanceConsultant = async (
  question: string,
  history: Transaction[]
): Promise<string> => {
  const userLanguage = getUserLanguageTag();

  const anonymizedHistory = history.map((tx) => ({
    amount: tx.amount,
    type: tx.type,
    categoryId: tx.categoryId,
    date: tx.date,
    isRecurring: tx.isRecurring,
  }));

  if (AI_PROXY_URL) {
    const proxyResult = await callProxy<{ answer?: string }>(
      '/api/ai/consultant',
      {
        question,
        history: anonymizedHistory,
        userLanguage,
      }
    );

    if (proxyResult?.answer) {
      return proxyResult.answer;
    }
  }

  const client = getClient();

  if (!client) {
    return 'No momento não foi possível acessar o consultor. Tente novamente em instantes.';
  }

  const model = client.getGenerativeModel({ model: MODEL_NAME });

  const prompt = [
    'Você é um consultor financeiro pessoal objetivo e didático.',
    'Use apenas os dados enviados e responda de forma curta e acionável.',
    `Pergunta do usuário: ${question}`,
    `Histórico anonimizado: ${JSON.stringify(anonymizedHistory)}`,
    `CRÍTICO: Você DEVE gerar sua resposta inteiramente no idioma correspondente a esta tag: ${userLanguage}. Não use outro idioma.`,
  ].join('\n\n');

  const result = await model.generateContent(prompt);
  const answer = result.response.text().trim();

  return answer || 'Não consegui gerar uma recomendação agora.';
};

export const generateFinancialInsights = async (
  transactions: Transaction[],
  accounts: Account[]
): Promise<string[]> => {
  const userLanguage = getUserLanguageTag();

  const payload = {
    transactions: transactions.map((tx) => ({
      amount: tx.amount,
      type: tx.type,
      categoryId: tx.categoryId,
      date: tx.date,
      note: tx.note || '',
      accountId: tx.accountId || '',
    })),
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      balance: account.balance,
      type: account.type,
    })),
  };

  if (AI_PROXY_URL) {
    const proxyResult = await callProxy<{ insights?: string[] }>(
      '/api/ai/insights',
      {
        transactions: payload.transactions,
        accounts: payload.accounts,
        userLanguage,
      }
    );

    if (proxyResult?.insights && proxyResult.insights.length > 0) {
      return proxyResult.insights.slice(0, 3);
    }
  }

  const client = getClient();

  if (!client) {
    return [
      'Conecte a IA para receber insights automáticos do mês.',
      'Enquanto isso, reduza 10% das despesas variáveis desta semana.',
      'Defina um teto por categoria para evitar extrapolar o orçamento.',
    ];
  }

  const model = client.getGenerativeModel({ model: MODEL_NAME });

  const systemPrompt =
    `Você é um consultor financeiro sênior e ex-gerente de banco com 14 anos de experiência. O usuário enviará um extrato JSON das transações recentes e os saldos das contas. Sua tarefa é analisar o comportamento financeiro e retornar exatamente 3 dicas curtas, diretas e acionáveis (máximo de 2 frases cada) sobre como ele pode economizar ou otimizar esse dinheiro. Seja profissional, analítico e direto ao ponto. Não use formatação markdown excessiva. CRÍTICO: Você DEVE gerar sua resposta inteiramente no idioma correspondente a esta tag: ${userLanguage}. Não use outro idioma.`;

  try {
    const result = await model.generateContent([
      systemPrompt,
      'Retorne estritamente um JSON no formato: {"insights":["dica 1","dica 2","dica 3"]}.',
      `Dados do usuário: ${JSON.stringify(payload)}`,
    ]);

    const raw = result.response.text().trim();
    const parsed = safeJsonParse<{ insights?: string[] }>(extractJsonFromText(raw));

    const list = (parsed?.insights || [])
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 3);

    if (list.length === 3) {
      return list;
    }

    const fallbackFromText = raw
      .split(/\n+/)
      .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 3);

    if (fallbackFromText.length === 3) {
      return fallbackFromText;
    }
  } catch {
    // Ignore and use deterministic fallback tips.
  }

  return [
    'Revise os maiores gastos recorrentes e corte pelo menos um item com baixo retorno neste mês.',
    'Concentre despesas variáveis em uma conta para melhorar o controle diário e evitar dispersão.',
    'Reserve uma porcentagem fixa de cada entrada para meta de caixa antes de gastar.',
  ];
};

export const mapGeminiCategoryToId = (category?: string): string => {
  return toCategoryId(category) || 'uncategorized';
};