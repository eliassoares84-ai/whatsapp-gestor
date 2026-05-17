import type { Transaction, TransactionType } from '../types/finance.types';

const INCOME_KEYWORDS = ['recebi', 'ganhei', 'entrou', 'pagaram', 'venda'];
const EXPENSE_KEYWORDS = ['gastei', 'paguei', 'comprei', 'custou', 'deu'];

const CURRENCY_TOKENS_REGEX = /\b(r\$|reais|real|rs)\b/gi;

const CATEGORY_HINTS: Array<{ id: string; keywords: string[] }> = [
  {
    id: 'transporte',
    keywords: ['gasolina', 'uber', 'pedagio'],
  },
  {
    id: 'alimentacao',
    keywords: ['almoco', 'jantar', 'ifood'],
  },
];

const AMOUNT_REGEX = /[\d]{1,}(?:[.,][\d]{1,3}){0,2}(?:[.,][\d]{2})?/g;

const normalizeForMatch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const parseAmount = (text: string): number | undefined => {
  const matches = text.match(AMOUNT_REGEX);
  if (!matches || matches.length === 0) {
    return undefined;
  }

  const candidate = matches[0].replace(/\s+/g, '');
  const separators = candidate.match(/[.,]/g) || [];

  let normalized = candidate;

  if (separators.length === 0) {
    return Number.parseInt(candidate, 10);
  }

  if (separators.length === 1) {
    const lastIndex = candidate.lastIndexOf(separators[0]);
    const afterSeparator = candidate.substring(lastIndex + 1);

    if (afterSeparator.length === 2) {
      normalized = candidate.replace(separators[0], '.');
    } else {
      normalized = candidate.replace(separators[0], '');
    }
  } else {
    const lastSeparator = candidate[candidate.length - 3];
    const firstSeparators = candidate.substring(0, candidate.length - 3);

    if (lastSeparator === '.' || lastSeparator === ',') {
      const cleanedFirst = firstSeparators.replace(/[.,]/g, '');
      normalized = cleanedFirst + '.' + candidate.slice(-2);
    } else {
      normalized = candidate.replace(/[.,]/g, '');
    }
  }

  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : undefined;
};

const inferType = (normalizedText: string): TransactionType => {
  const hasIncomeKeyword = INCOME_KEYWORDS.some((keyword) =>
    new RegExp(`\\b${keyword}\\b`, 'i').test(normalizedText)
  );

  if (hasIncomeKeyword) {
    return 'income';
  }

  const hasExpenseKeyword = EXPENSE_KEYWORDS.some((keyword) =>
    new RegExp(`\\b${keyword}\\b`, 'i').test(normalizedText)
  );

  if (hasExpenseKeyword) {
    return 'expense';
  }

  return 'expense';
};

const inferCategoryId = (normalizedText: string): string | undefined => {
  const category = CATEGORY_HINTS.find((hint) =>
    hint.keywords.some((keyword) =>
      new RegExp(`\\b${keyword}\\b`, 'i').test(normalizedText)
    )
  );

  return category?.id;
};

const stripTypeKeywords = (text: string): string => {
  const allKeywords = [...INCOME_KEYWORDS, ...EXPENSE_KEYWORDS];

  return allKeywords.reduce(
    (acc, keyword) => acc.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), ' '),
    text
  );
};

const sanitizeNote = (rawText: string): string | undefined => {
  let cleaned = rawText;

  const amountMatches = rawText.match(AMOUNT_REGEX) || [];
  amountMatches.forEach((match) => {
    cleaned = cleaned.replace(match, ' ');
  });

  const noTypeKeywords = stripTypeKeywords(cleaned);
  const noCurrencyTokens = noTypeKeywords.replace(CURRENCY_TOKENS_REGEX, ' ');

  cleaned = noCurrencyTokens
    .replace(/\b(com|de|do|da|dos|das|no|na|nos|nas|para|em)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length > 0 ? cleaned : undefined;
};

export const parseVoiceCommand = (text: string): Partial<Transaction> => {
  const safeText = text.trim();
  if (!safeText) {
    return {
      type: 'expense',
    };
  }

  const normalizedText = normalizeForMatch(safeText);

  const amount = parseAmount(normalizedText);
  const type = inferType(normalizedText);
  const categoryId = inferCategoryId(normalizedText);
  const note = sanitizeNote(normalizedText);

  const parsed: Partial<Transaction> = {
    type,
  };

  if (typeof amount === 'number') {
    parsed.amount = amount;
  }

  if (note) {
    parsed.note = note;
  }

  if (categoryId) {
    parsed.categoryId = categoryId;
  }

  return parsed;
};
