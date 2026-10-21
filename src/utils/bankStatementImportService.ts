export type ImportedStatementEntry = {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
};

const normalizeHeader = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const parseCsvLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

const parseAmount = (raw: string): number | null => {
  if (!raw) {
    return null;
  }

  const cleaned = raw
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
};

const parseDate = (raw: string): string | null => {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  const brDateMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (brDateMatch && brDateMatch[1] && brDateMatch[2] && brDateMatch[3]) {
    const day = brDateMatch[1].padStart(2, '0');
    const month = brDateMatch[2].padStart(2, '0');
    const yearRaw = brDateMatch[3];
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${month}-${day}T12:00:00.000Z`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

export const parseBankStatementCsv = (csvContent: string): ImportedStatementEntry[] => {
  const lines = csvContent
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const firstLine = lines[0];
  if (!firstLine) {
    return [];
  }
  const delimiter = (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0)
    ? ';'
    : ',';

  const headers = parseCsvLine(firstLine, delimiter).map(normalizeHeader);

  const dateIdx = headers.findIndex((h) => ['data', 'date'].includes(h));
  const descIdx = headers.findIndex((h) =>
    ['descricao', 'historico', 'descricao do lancamento', 'lancamento', 'description'].includes(h)
  );
  const amountIdx = headers.findIndex((h) => ['valor', 'amount', 'valor (r$)'].includes(h));
  const debitIdx = headers.findIndex((h) => ['debito', 'debit', 'saidas', 'saida'].includes(h));
  const creditIdx = headers.findIndex((h) => ['credito', 'credit', 'entradas', 'entrada'].includes(h));

  if (dateIdx < 0 || descIdx < 0 || (amountIdx < 0 && debitIdx < 0 && creditIdx < 0)) {
    return [];
  }

  const entries: ImportedStatementEntry[] = [];

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line, delimiter);
    const isoDate = parseDate(cols[dateIdx] || '');
    const description = (cols[descIdx] || '').trim();

    if (!isoDate || !description) {
      continue;
    }

    let amount: number | null = null;
    let type: 'income' | 'expense' | null = null;

    if (amountIdx >= 0) {
      const rawAmount = parseAmount(cols[amountIdx] || '');
      if (rawAmount !== null) {
        amount = Math.abs(rawAmount);
        type = rawAmount < 0 ? 'expense' : 'income';
      }
    }

    if ((amount === null || type === null) && debitIdx >= 0) {
      const debit = parseAmount(cols[debitIdx] || '');
      if (debit !== null && debit > 0) {
        amount = Math.abs(debit);
        type = 'expense';
      }
    }

    if ((amount === null || type === null) && creditIdx >= 0) {
      const credit = parseAmount(cols[creditIdx] || '');
      if (credit !== null && credit > 0) {
        amount = Math.abs(credit);
        type = 'income';
      }
    }

    if (amount === null || type === null) {
      continue;
    }

    entries.push({
      date: isoDate,
      description,
      amount,
      type,
    });
  }

  return entries;
};
