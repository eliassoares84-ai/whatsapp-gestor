import type { PaymentMethod, Transaction, TransactionType } from '../types/finance.types';

export type ParsedVoiceCommand = Partial<Transaction> & {
  installments?: number;
};

const INCOME_KEYWORDS = [
  'recebi', 'ganhei', 'entrou', 'pagaram', 'venda', 'vendi', 'salario', 'salário',
  'pix recebido', 'ted recebida', 'deposito', 'depósito', 'rendimento', 'lucro',
  'comissao', 'comissão', 'entrada', 'receita'
];
const EXPENSE_KEYWORDS = ['gastei', 'paguei', 'comprei', 'custou', 'deu', 'despesa', 'saida', 'saída'];

const PAYMENT_METHOD_KEYWORDS: Array<{ method: PaymentMethod; patterns: RegExp[] }> = [
  { method: 'pix', patterns: [/\bpix\b/i] },
  { method: 'credit', patterns: [/\bcr[eé]dito\b/i, /\bcart[aã]o\b/i, /\bcredit\b/i, /\bfatura\b/i, /\bparcelad[oa]\b/i] },
  { method: 'debit', patterns: [/\bd[eé]bito\b/i, /\bdebit\b/i] },
  { method: 'cash', patterns: [/\bdinheiro\b/i, /\bcash\b/i, /\besp[eé]cie\b/i] },
];

const CURRENCY_TOKENS_REGEX = /\b(r\$|reais|real|rs|conto|contos|pila|pilas|pau|paus|mangos|mango)\b/gi;

/**
 * Normaliza erros fonéticos comuns de reconhecimento de voz e gírias monetárias em PT-BR.
 */
export const normalizeSpokenPortuguese = (text: string): string => {
  let cleaned = text;

  // Correção de erros fonéticos do Speech Recognizer
  cleaned = cleaned.replace(/\b(?:pique|piki|pics|peek|peck)\b/gi, 'pix');
  cleaned = cleaned.replace(/\b(?:no\s+)?h[aá]bito\b/gi, 'no débito');
  cleaned = cleaned.replace(/\bdevito\b/gi, 'débito');

  // Gírias monetárias brasileiras comuns ("45 conto", "50 pila", "100 pau") -> "45 reais"
  cleaned = cleaned.replace(/\b(\d+)\s*(?:conto|contos|pila|pilas|pau|paus|mangos|mango)\b/gi, '$1 reais');

  // Padrão "X com Y" -> "X,Y" (ex: "35 com 50" -> "35,50 reais")
  cleaned = cleaned.replace(/\b(\d+)\s+com\s+(\d{1,2})\b(?!\s*\d)/gi, (_, reais, centavos) => {
    const cents = parseInt(centavos, 10);
    return cents >= 1 && cents <= 99 ? `${reais},${String(cents).padStart(2, '0')} reais` : _;
  });

  return cleaned;
};

// ---- Conversão de números por extenso em PT ----

const PT_ONES: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16,
  dezessete: 17, dezoito: 18, dezenove: 19,
};

const PT_TENS: Record<string, number> = {
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
  setenta: 70, oitenta: 80, noventa: 90,
};

const PT_HUNDREDS: Record<string, number> = {
  // "cento" omitido: só ocorre em compostos ("cento e vinte") e nunca como split de decimal
  cem: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700,
  oitocentos: 800, novecentos: 900,
};

/**
 * Verifica se uma lista de tokens (sem acentos, minúsculas) forma um número natural em PT.
 * Retorna o valor numérico ou null se não for reconhecível.
 */
const isNaturalPtNumber = (tokens: string[]): number | null => {
  const nonE = tokens.filter((t) => t !== 'e');
  if (nonE.length === 0) return null;

  if (nonE.length === 1) {
    const first = nonE[0];
    if (!first) return null;
    if (first === 'mil') return 1000;
    const val = PT_ONES[first] ?? PT_TENS[first] ?? PT_HUNDREDS[first];
    return val !== undefined ? val : null;
  }

  if (nonE.length === 2) {
    const first = nonE[0];
    const second = nonE[1];
    if (!first || !second) return null;

    // dezenas + unidades: "vinte oito" = 28
    const t = PT_TENS[first];
    const u = PT_ONES[second];
    if (t !== undefined && u !== undefined && u > 0) return t + u;
    // centenas + dezenas: "duzentos vinte" = 220
    const h = PT_HUNDREDS[first];
    const t2 = PT_TENS[second];
    if (h !== undefined && t2 !== undefined) return h + t2;
    // centenas + unidades: "duzentos cinco" = 205
    const u2 = PT_ONES[second];
    if (h !== undefined && u2 !== undefined && u2 > 0) return h + u2;
    return null;
  }

  if (nonE.length === 3) {
    const first = nonE[0];
    const second = nonE[1];
    const third = nonE[2];
    if (!first || !second || !third) return null;

    // centenas + dezenas + unidades
    const h = PT_HUNDREDS[first];
    const t = PT_TENS[second];
    const u = PT_ONES[third];
    if (h !== undefined && t !== undefined && u !== undefined && u > 0) return h + t + u;
    return null;
  }

  return null;
};

/**
 * Pré-processa o texto normalizado para resolver expressões monetárias por extenso.
 * Exemplo: "vinte e oito e oitenta e quatro" → "28,84"
 * Exemplo: "28 e 84" → "28,84"
 */
const preprocessCurrencyExpression = (text: string): string => {
  const tokens = text.split(/\s+/).filter(Boolean);

  // Coleta todas as palavras numéricas PT
  const isPtNumWord = (t?: string): boolean =>
    !!t && (t === 'e' || t === 'mil' ||
    PT_ONES[t] !== undefined ||
    PT_TENS[t] !== undefined ||
    PT_HUNDREDS[t] !== undefined);

  const output: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    const cur = tokens[i];
    if (!cur) {
      i++;
      continue;
    }

    // Não é palavra numérica
    if (!isPtNumWord(cur) || cur === 'e') {
      output.push(cur);
      i++;
      continue;
    }

    // Coleta sequência contígua de palavras numéricas
    const segStart = i;
    while (i < tokens.length && isPtNumWord(tokens[i])) i++;
    let seg = tokens.slice(segStart, i);

    // Remove "e" nas bordas
    while (seg.length > 0 && seg[0] === 'e') seg = seg.slice(1);
    while (seg.length > 0 && seg[seg.length - 1] === 'e') seg = seg.slice(0, -1);

    if (seg.length === 0) continue;

    // Tenta encontrar split decimal: "X e Y" onde Y é centavos (1-99)
    let resolved: string | null = null;
    for (let j = 0; j < seg.length; j++) {
      if (seg[j] !== 'e') continue;
      const leftVal = isNaturalPtNumber(seg.slice(0, j));
      const rightVal = isNaturalPtNumber(seg.slice(j + 1));
      if (leftVal !== null && leftVal > 0 && rightVal !== null && rightVal >= 1 && rightVal <= 99) {
        resolved = `${leftVal},${String(rightVal).padStart(2, '0')}`;
        break;
      }
    }

    if (resolved === null) {
      // Tenta converter o segmento inteiro como número único
      const whole = isNaturalPtNumber(seg);
      resolved = whole !== null ? String(whole) : seg.join(' ');
    }

    output.push(resolved);
  }

  let result = output.join(' ');

  // Padrão dígito: "28 e 84" → "28,84" (quando segundo número é 1-99)
  result = result.replace(/\b(\d+)\s+e\s+(\d{1,2})\b(?!\s*\d)/g, (_, reais, centavos) => {
    const cents = parseInt(centavos, 10);
    return cents >= 1 && cents <= 99
      ? `${reais},${String(cents).padStart(2, '0')}`
      : _;
  });

  return result;
};

const CATEGORY_HINTS: Array<{ id: string; keywords: string[] }> = [
  {
    id: 'alimentacao',
    keywords: [
      'almoco', 'almoço', 'jantar', 'janta', 'cafe', 'café', 'lanche', 'lanches',
      'restaurante', 'comida', 'refeicao', 'refeição', 'mercado', 'supermercado',
      'hipermercado', 'padaria', 'panificadora', 'acougue', 'açougue', 'hortifruti',
      'feira', 'sacolao', 'sacolão', 'ifood', 'rappi', 'ze delivery', 'mcdonalds',
      'burger', 'hamburguer', 'hambúrguer', 'pizza', 'pizzaria', 'pastel', 'pastelaria',
      'sushi', 'churrasco', 'acai', 'açaí', 'sorvete', 'sorveteria', 'doce',
      'confeitaria', 'bolo', 'delivery', 'bar', 'boteco', 'pub', 'cerveja', 'chopp',
      'chope', 'vinho', 'bebida', 'adega'
    ],
  },
  {
    id: 'transporte',
    keywords: [
      'gasolina', 'combustivel', 'combustível', 'etanol', 'alcool', 'álcool',
      'diesel', 'gnv', 'abastecimento', 'abastecer', 'posto', 'uber', '99', '99pop',
      'indrive', 'taxi', 'táxi', 'corrida', 'pedagio', 'pedágio', 'sem parar',
      'conectcar', 'veloe', 'estacionamento', 'estacionar', 'valet', 'garagem',
      'onibus', 'ônibus', 'metro', 'metrô', 'trem', 'passagem', 'bilhete', 'voo',
      'aviao', 'avião', 'aeroporto', 'ipva', 'multa', 'detran', 'cnh', 'oficina',
      'mecanico', 'mecânico', 'revisao', 'revisão', 'troca de oleo', 'óleo',
      'pneu', 'balanceamento', 'lavagem', 'lava jato'
    ],
  },
  {
    id: 'moradia',
    keywords: [
      'aluguel', 'condominio', 'condomínio', 'iptu', 'luz', 'energia', 'eletricidade',
      'enel', 'cpfl', 'cemig', 'light', 'agua', 'água', 'esgoto', 'sabesp', 'sanepar',
      'copasa', 'cedae', 'gas', 'gás', 'botijao', 'botijão', 'internet', 'wifi', 'wi-fi',
      'fibra', 'claro', 'vivo', 'tim', 'oi', 'diarista', 'faxina', 'faxineira',
      'limpeza', 'reforma', 'obra', 'pedreiro', 'pintor', 'eletricista', 'encanador',
      'construcao', 'construção', 'moveis', 'móveis', 'decoracao', 'decoração',
      'casa', 'apartamento'
    ],
  },
  {
    id: 'saude',
    keywords: [
      'farmacia', 'farmácia', 'drogaria', 'droga raia', 'drogasil', 'pague menos',
      'panvel', 'remedio', 'remédio', 'medicamento', 'remedios', 'pomada', 'vitamina',
      'medico', 'médico', 'doutor', 'consulta', 'exame', 'exames', 'laboratorio',
      'laboratório', 'dentista', 'odonto', 'ortodontia', 'hospital', 'pronto socorro',
      'ps', 'clinica', 'clínica', 'upa', 'psicologo', 'psicólogo', 'terapia',
      'psiquiatra', 'plano de saude', 'plano de saúde', 'unimed', 'amil',
      'bradesco saude', 'otica', 'ótica', 'oculos', 'óculos', 'lente', 'fisioterapia',
      'pilates'
    ],
  },
  {
    id: 'lazer',
    keywords: [
      'cinema', 'cine', 'filme', 'ingresso', 'teatro', 'show', 'concerto', 'festival',
      'festa', 'balada', 'evento', 'jogo', 'game', 'games', 'playstation', 'xbox',
      'steam', 'streaming', 'netflix', 'spotify', 'disney', 'max', 'prime video',
      'viagem', 'passeio', 'turismo', 'hotel', 'pousada', 'hospedagem', 'airbnb',
      'booking', 'praia', 'clube', 'parque', 'resort', 'livro', 'livraria', 'kindle'
    ],
  },
  {
    id: 'educacao',
    keywords: [
      'faculdade', 'universidade', 'escola', 'colegio', 'colégio', 'curso', 'cursos',
      'treinamento', 'workshop', 'mentoria', 'matricula', 'matrícula', 'mensalidade',
      'material escolar', 'papelaria', 'caderno', 'mochila', 'livro didatico',
      'apostila', 'idiomas', 'ingles', 'inglês'
    ],
  },
  {
    id: 'escritorio',
    keywords: [
      'escritorio', 'escritório', 'suprimentos', 'computador', 'teclado', 'mouse',
      'monitor', 'cadeira', 'mesa', 'coworking', 'impressao', 'impressão'
    ],
  },
  {
    id: 'software',
    keywords: [
      'software', 'saas', 'assinatura', 'hospedagem', 'dominio', 'domínio', 'aws',
      'google cloud', 'microsoft', 'adobe', 'chatgpt', 'openai', 'canva', 'github',
      'notion', 'figma'
    ],
  },
  {
    id: 'impostos',
    keywords: [
      'imposto', 'impostos', 'tributo', 'taxa', 'taxas', 'darf', 'das',
      'simples nacional', 'irpf', 'irpj', 'inss', 'fgts', 'iss', 'icms', 'guia',
      'cartorio', 'cartório'
    ],
  },
  {
    id: 'marketing',
    keywords: [
      'marketing', 'anuncio', 'anúncio', 'anuncios', 'propaganda', 'campanha',
      'trafego', 'tráfego', 'ads', 'facebook ads', 'google ads', 'meta ads',
      'instagram', 'design', 'panfleto', 'grafica', 'gráfica', 'influencer'
    ],
  },
  {
    id: 'proLabore',
    keywords: ['pro labore', 'pró-labore', 'prolabore', 'retirada', 'socio', 'sócio'],
  },
  {
    id: 'consultoriaExterna',
    keywords: [
      'consultoria', 'advogado', 'juridico', 'jurídico', 'contador', 'contabilidade',
      'honorarios', 'honorários', 'assessoria'
    ],
  },
  {
    id: 'investimentos',
    keywords: [
      'investimento', 'investimentos', 'aplicacao', 'aplicação', 'acoes', 'ações',
      'fundo', 'cdb', 'lci', 'lca', 'tesouro', 'cripto', 'bitcoin', 'renda fixa', 'fii'
    ],
  },
  {
    id: 'reservaEmergencia',
    keywords: ['reserva de emergencia', 'reserva de emergência', 'reserva emergencial', 'reserva', 'emergencia', 'emergência'],
  },
];

const AMOUNT_REGEX = /[\d]{1,}(?:[.,][\d]{1,3}){0,2}(?:[.,][\d]{2})?/g;

const normalizeForMatch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const parseAmount = (text: string): number | undefined => {
  // Pré-processa expressões monetárias por extenso antes de aplicar o regex numérico
  const processed = preprocessCurrencyExpression(text);
  const matches = processed.match(AMOUNT_REGEX);
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
    new RegExp(`\\b${normalizeForMatch(keyword)}\\b`, 'i').test(normalizedText)
  );

  if (hasIncomeKeyword) {
    return 'income';
  }

  const hasExpenseKeyword = EXPENSE_KEYWORDS.some((keyword) =>
    new RegExp(`\\b${normalizeForMatch(keyword)}\\b`, 'i').test(normalizedText)
  );

  if (hasExpenseKeyword) {
    return 'expense';
  }

  return 'expense';
};

const inferCategoryId = (
  normalizedText: string,
  availableCategories?: Array<{ id: string; name: string }>
): string | undefined => {
  // 1. Match direto contra nomes de categorias disponíveis no workspace
  if (availableCategories && availableCategories.length > 0) {
    const directMatch = availableCategories.find((cat) => {
      const normCatName = normalizeForMatch(cat.name);
      return normCatName.length >= 3 && normalizedText.includes(normCatName);
    });
    if (directMatch) {
      return directMatch.id;
    }
  }

  // 2. Match por dicionário de palavras-chave contextual (priorizando a palavra que aparece mais cedo na frase)
  let earliestMatch: { id: string; index: number } | null = null;

  for (const hint of CATEGORY_HINTS) {
    for (const keyword of hint.keywords) {
      const normKey = normalizeForMatch(keyword);
      const regex = new RegExp(`\\b${normKey}\\b`, 'i');
      const match = regex.exec(normalizedText);
      if (match) {
        if (!earliestMatch || match.index < earliestMatch.index) {
          earliestMatch = { id: hint.id, index: match.index };
        }
      }
    }
  }

  if (earliestMatch) {
    if (availableCategories && availableCategories.length > 0) {
      const hintId = earliestMatch.id;
      const matchingCategory = availableCategories.find(
        (c) =>
          c.id === hintId ||
          normalizeForMatch(c.id).includes(normalizeForMatch(hintId)) ||
          normalizeForMatch(c.name).includes(normalizeForMatch(hintId)) ||
          normalizeForMatch(hintId).includes(normalizeForMatch(c.name))
      );
      if (matchingCategory) {
        return matchingCategory.id;
      }
    }
    return earliestMatch.id;
  }

  return undefined;
};

const inferPaymentMethod = (normalizedText: string): PaymentMethod => {
  const matched = PAYMENT_METHOD_KEYWORDS.find((item) =>
    item.patterns.some((pattern) => pattern.test(normalizedText))
  );

  return matched?.method || 'pix';
};

const stripTypeKeywords = (text: string): string => {
  const allKeywords = [...INCOME_KEYWORDS, ...EXPENSE_KEYWORDS];

  return allKeywords.reduce(
    (acc, keyword) => acc.replace(new RegExp(`\\b${normalizeForMatch(keyword)}\\b`, 'gi'), ' '),
    text
  );
};

const PAYMENT_PHRASES_CLEANUP_REGEX =
  /\b(?:no\s+cart[aã]o(?:\s+de\s+(?:cr[eé]dito|d[eé]bito))?|no\s+cr[eé]dito|no\s+d[eé]bito|no\s+pix|em\s+dinheiro|no\s+dinheiro|em\s+esp[eé]cie|a\s+vista|[aà]\s+vista|cart[aã]o(?:\s+de\s+(?:cr[eé]dito|d[eé]bito))?|cr[eé]dito|d[eé]bito|pix|dinheiro)\b/gi;

const INSTALLMENTS_CLEANUP_REGEX =
  /\b(?:em\s+\d{1,2}\s*(?:x|vezes|parcelas?)|\d{1,2}\s*(?:x|vezes|parcelas?)|parcelad[oa](?:\s+em\s+\d{1,2}\s*(?:x|vezes|parcelas?))?)\b/gi;

const sanitizeNote = (rawText: string): string | undefined => {
  let cleaned = rawText;

  const amountMatches = rawText.match(AMOUNT_REGEX) || [];
  amountMatches.forEach((match) => {
    cleaned = cleaned.replace(match, ' ');
  });

  const noTypeKeywords = stripTypeKeywords(cleaned);
  const noCurrencyTokens = noTypeKeywords.replace(CURRENCY_TOKENS_REGEX, ' ');
  const noPaymentPhrases = noCurrencyTokens.replace(PAYMENT_PHRASES_CLEANUP_REGEX, ' ');
  const noInstallmentPhrases = noPaymentPhrases.replace(INSTALLMENTS_CLEANUP_REGEX, ' ');

  cleaned = noInstallmentPhrases
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove preposições soltas exclusivamente no início ou no fim da frase
  cleaned = cleaned.replace(/^(?:de|com|em|para|pra|no|na)\s+/i, '');
  cleaned = cleaned.replace(/\s+(?:de|com|em|para|pra|no|na)$/i, '');
  cleaned = cleaned.trim();

  if (cleaned.length === 0) {
    return undefined;
  }

  // Capitaliza a primeira letra para exibir uma descrição elegante
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const inferInstallments = (normalizedText: string): number => {
  const match = normalizedText.match(/(\d{1,2})\s*(?:x|vezes|parcela|parcelas)/i);
  if (!match?.[1]) {
    return 1;
  }

  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isFinite(parsed) || parsed <= 1) {
    return 1;
  }

  return Math.min(parsed, 48);
};

export const parseVoiceCommand = (
  text: string,
  availableCategories?: Array<{ id: string; name: string }>
): ParsedVoiceCommand => {
  const safeText = text.trim();
  if (!safeText) {
    return {
      type: 'expense',
      installments: 1,
    };
  }

  // 1. Normaliza gírias monetárias e transcrições fonéticas em PT-BR
  const spokenNormalized = normalizeSpokenPortuguese(safeText);
  const normalizedText = normalizeForMatch(spokenNormalized);

  const amount = parseAmount(normalizedText);
  const type = inferType(normalizedText);
  const categoryId = inferCategoryId(normalizedText, availableCategories);
  const paymentMethod = inferPaymentMethod(normalizedText);
  const note = sanitizeNote(normalizedText);
  const installments = inferInstallments(normalizedText);

  const parsed: ParsedVoiceCommand = {
    type,
    installments,
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

  parsed.paymentMethod = paymentMethod;

  return parsed;
};
