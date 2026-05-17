import { GoogleGenerativeAI } from '@google/generative-ai';

import type { Transaction, TransactionType } from '../types/finance.types';

export interface GeminiFinanceData {
  amount?: number;
  type?: TransactionType;
  category?: string;
  note?: string;
}

export interface GeminiFinanceResponse {
  data: GeminiFinanceData;
  confirmationMsg: string;
}

export type GeminiFailureMode = 'none' | 'offline' | 'invalid-key' | 'timeout';

interface ProcessFinanceCommandOptions {
  failureMode?: GeminiFailureMode;
  timeoutMs?: number;
}

const MODEL_NAME = 'gemini-1.5-flash';
const DEFAULT_TIMEOUT_MS = 12000;

const buildFallbackFinanceResponse = (
  text: string,
  message: string
): GeminiFinanceResponse => ({
  data: {
    type: 'expense',
    note: text,
  },
  confirmationMsg: message,
});

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

export const processFinanceCommand = async (
  text: string,
  options: ProcessFinanceCommandOptions = {}
): Promise<GeminiFinanceResponse> => {
  const failureMode = options.failureMode || 'none';
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  if (failureMode === 'offline') {
    return buildFallbackFinanceResponse(
      text,
      'Sem conexao com a internet agora. Confira os dados e confirme manualmente.'
    );
  }

  if (failureMode === 'invalid-key') {
    return buildFallbackFinanceResponse(
      text,
      'A chave da IA parece invalida no momento. Confira os dados e confirme manualmente.'
    );
  }

  if (failureMode === 'timeout') {
    return buildFallbackFinanceResponse(
      text,
      'A IA demorou para responder. Revise os dados e confirme manualmente.'
    );
  }

  const client = getClient();

  if (!client) {
    return buildFallbackFinanceResponse(
      text,
      'Nao consegui acessar a IA agora. Confira os dados e confirme manualmente.'
    );
  }

  try {
    const model = client.getGenerativeModel({ model: MODEL_NAME });

    const systemPrompt =
      'Voce e um assistente financeiro. Extraia: valor, tipo (income/expense), categoria sugerida e nota. Retorne APENAS um JSON estruturado e uma frase curta de confirmacao para o usuario. Formato obrigatorio: {"data":{"amount":number,"type":"income|expense","category":"string","note":"string"},"confirmationMsg":"string"}';

    const result = await Promise.race([
      model.generateContent([
        systemPrompt,
        `Comando do usuario: ${text}`,
      ]),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), timeoutMs);
      }),
    ]);

    const raw = result.response.text().trim();
    const parsed = safeJsonParse<GeminiFinanceResponse>(extractJsonFromText(raw));

    if (!parsed) {
      return buildFallbackFinanceResponse(
        text,
        'Nao consegui interpretar com confianca. Pode revisar e confirmar?'
      );
    }

    const normalizedType: TransactionType =
      parsed.data.type === 'income' ? 'income' : 'expense';

    return {
      data: {
        amount:
          typeof parsed.data.amount === 'number' ? parsed.data.amount : undefined,
        type: normalizedType,
        category: parsed.data.category,
        note: parsed.data.note,
      },
      confirmationMsg:
        parsed.confirmationMsg ||
        'Entendi seu lancamento. Posso salvar essa movimentacao?',
    };
  } catch {
    return buildFallbackFinanceResponse(
      text,
      'Nao foi possivel consultar a IA agora. Confira os dados e confirme manualmente.'
    );
  }
};

export const askFinanceConsultant = async (
  question: string,
  history: Transaction[]
): Promise<string> => {
  const client = getClient();

  if (!client) {
    return 'No momento não foi possível acessar o consultor. Tente novamente em instantes.';
  }

  const model = client.getGenerativeModel({ model: MODEL_NAME });

  const anonymizedHistory = history.map((tx) => ({
    amount: tx.amount,
    type: tx.type,
    categoryId: tx.categoryId,
    date: tx.date,
    isRecurring: tx.isRecurring,
  }));

  const prompt = [
    'Você é um consultor financeiro pessoal objetivo e didático.',
    'Use apenas os dados enviados e responda em português de forma curta e acionável.',
    `Pergunta do usuário: ${question}`,
    `Histórico anonimizado: ${JSON.stringify(anonymizedHistory)}`,
  ].join('\n\n');

  const result = await model.generateContent(prompt);
  const answer = result.response.text().trim();

  return answer || 'Não consegui gerar uma recomendação agora.';
};

export const mapGeminiCategoryToId = (category?: string): string => {
  return toCategoryId(category) || 'uncategorized';
};