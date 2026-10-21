import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { useFinanceStore } from '../store/useFinanceStore';
import type { Category, Transaction } from '../types/finance.types';
import { formatCurrency } from './formatters';

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTargetMonthTransactions = (
  transactions: Transaction[],
  workspaceId: string,
  monthIndex?: number,
  year?: number
): { list: Transaction[]; targetMonth: number; targetYear: number } => {
  const state = useFinanceStore.getState();
  const targetMonth = typeof monthIndex === 'number' ? monthIndex : state.selectedMonth;
  const targetYear = typeof year === 'number' ? year : state.selectedYear;

  const list = transactions.filter((tx) => {
    if (tx.workspaceId !== workspaceId) {
      return false;
    }

    const date = new Date(tx.date);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
  });

  return { list, targetMonth, targetYear };
};

const resolveCategoryName = (
  categoryId: string,
  categories: Category[]
): string => {
  const found = categories.find((c) => c.id === categoryId);
  if (found) return found.name;
  if (categoryId === 'outros') return 'Outros';
  if (categoryId.includes('internal-transfer')) return 'Transferência Interna';
  return categoryId || 'Geral';
};

const escapeCsvField = (field: string | number | undefined | null): string => {
  if (field === undefined || field === null) return '""';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportToPDF = async (
  workspaceId: string,
  monthIndex?: number,
  year?: number
): Promise<boolean> => {
  try {
    const { workspaces, transactions, categories, currency } = useFinanceStore.getState();
    const workspace = workspaces.find((item) => item.id === workspaceId);

    if (!workspace) {
      return false;
    }

    const { list: monthTransactions, targetMonth, targetYear } = getTargetMonthTransactions(
      transactions,
      workspaceId,
      monthIndex,
      year
    );

    const monthDate = new Date(targetYear, targetMonth, 1);
    const monthLabel = monthDate.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    const income = monthTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const expense = monthTransactions
      .filter((tx) => tx.type === 'expense' && !tx.categoryId.includes('internal-transfer'))
      .reduce((sum, tx) => sum + tx.amount, 0);

    const profit = income - expense;
    const savingsRate = income > 0 ? Math.max(0, Math.round((profit / income) * 100)) : 0;

    // Agrupamento de Despesas por Categoria
    const expenseByCategory: Record<string, number> = {};
    monthTransactions
      .filter((tx) => tx.type === 'expense' && !tx.categoryId.includes('internal-transfer'))
      .forEach((tx) => {
        const catName = resolveCategoryName(tx.categoryId, categories);
        expenseByCategory[catName] = (expenseByCategory[catName] || 0) + tx.amount;
      });

    const categoryBreakdownRows = Object.entries(expenseByCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([catName, amount]) => {
        const pct = expense > 0 ? ((amount / expense) * 100).toFixed(1) : '0';
        return `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-weight: 500;">${catName}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; text-align: right; color: #666;">${pct}%</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 600; color: #E53E3E;">
              ${formatCurrency(amount, currency, 'pt-BR', true)}
            </td>
          </tr>
        `;
      })
      .join('');

    // Lista de transações ordenada decrescente por data
    const sortedTransactions = [...monthTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const transactionRows = sortedTransactions
      .map((tx) => {
        const catName = resolveCategoryName(tx.categoryId, categories);
        const isIncome = tx.type === 'income';
        const isTransfer = tx.type === 'transfer';
        const color = isIncome ? '#22C55E' : isTransfer ? '#3B82F6' : '#EF4444';
        const typeBadge = isIncome ? 'Receita' : isTransfer ? 'Transf.' : 'Despesa';
        const badgeBg = isIncome ? '#DCFCE7' : isTransfer ? '#DBEAFE' : '#FEE2E2';

        return `
          <tr>
            <td style="padding: 8px 10px; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">
              <span style="font-weight: 500;">${formatDate(tx.date)}</span>
              <span style="font-size: 10px; color: #888; display: block;">${formatTime(tx.date)}</span>
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #f0f0f0;">
              <span style="background: ${badgeBg}; color: ${color}; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">
                ${typeBadge}
              </span>
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #f0f0f0; font-weight: 500;">
              ${catName}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #f0f0f0; color: #4B5563;">
              ${tx.note || '-'}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 700; color: ${color}; white-space: nowrap;">
              ${isIncome ? '+' : isTransfer ? '' : '-'} ${formatCurrency(tx.amount, currency, 'pt-BR', true)}
            </td>
          </tr>
        `;
      })
      .join('');

    const nowFormatted = new Date().toLocaleString('pt-BR');
    const accentColor = workspace.themeColor || '#0A84FF';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatório Financeiro - ${capitalizedMonthLabel}</title>
          <style>
            @page { margin: 16mm; size: A4; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1F2937;
              margin: 0;
              padding: 0;
              font-size: 12px;
              line-height: 1.4;
            }
            .header-banner {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #E5E7EB;
              padding-bottom: 18px;
              margin-bottom: 24px;
            }
            .brand-title {
              font-size: 20px;
              font-weight: 800;
              color: #111827;
              letter-spacing: -0.5px;
            }
            .brand-subtitle {
              font-size: 12px;
              color: #6B7280;
              margin-top: 2px;
            }
            .period-badge {
              text-align: right;
            }
            .period-title {
              font-size: 16px;
              font-weight: 700;
              color: ${accentColor};
            }
            .period-sub {
              font-size: 11px;
              color: #9CA3AF;
              margin-top: 2px;
            }
            .cards-grid {
              display: flex;
              gap: 12px;
              margin-bottom: 24px;
            }
            .card {
              flex: 1;
              background: #F9FAFB;
              border: 1px solid #E5E7EB;
              border-radius: 10px;
              padding: 12px 14px;
            }
            .card-label {
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #6B7280;
              margin-bottom: 4px;
            }
            .card-value {
              font-size: 18px;
              font-weight: 800;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #111827;
              margin-top: 20px;
              margin-bottom: 10px;
              padding-bottom: 6px;
              border-bottom: 1px solid #E5E7EB;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background: #F3F4F6;
              padding: 8px 10px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #4B5563;
              text-align: left;
              border-bottom: 2px solid #E5E7EB;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #E5E7EB;
              padding-top: 12px;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #9CA3AF;
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div>
              <div class="brand-title">SeuGestor</div>
              <div class="brand-subtitle">
                Espaço de Trabalho: <strong>${workspace.name}</strong> (${workspace.type === 'personal' ? 'Pessoal' : 'Empresarial'})
              </div>
            </div>
            <div class="period-badge">
              <div class="period-title">${capitalizedMonthLabel}</div>
              <div class="period-sub">Relatório Executivo Mensal</div>
            </div>
          </div>

          <div class="cards-grid">
            <div class="card">
              <div class="card-label">Receitas</div>
              <div class="card-value" style="color: #22C55E;">${formatCurrency(income, currency, 'pt-BR', true)}</div>
            </div>
            <div class="card">
              <div class="card-label">Despesas</div>
              <div class="card-value" style="color: #EF4444;">${formatCurrency(expense, currency, 'pt-BR', true)}</div>
            </div>
            <div class="card">
              <div class="card-label">Resultado Líquido</div>
              <div class="card-value" style="color: ${profit >= 0 ? '#22C55E' : '#EF4444'};">
                ${profit >= 0 ? '+' : ''}${formatCurrency(profit, currency, 'pt-BR', true)}
              </div>
            </div>
            <div class="card">
              <div class="card-label">Taxa de Poupança</div>
              <div class="card-value" style="color: ${accentColor};">${savingsRate}%</div>
            </div>
          </div>

          ${
            categoryBreakdownRows
              ? `
              <div class="section-title">Distribuição de Despesas por Categoria</div>
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th style="text-align: right;">% Total</th>
                    <th style="text-align: right;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryBreakdownRows}
                </tbody>
              </table>
              `
              : ''
          }

          <div class="section-title">Lançamentos do Período (${monthTransactions.length})</div>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${transactionRows || '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #9CA3AF;">Nenhum lançamento registrado neste mês.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <span>Gerado automaticamente pelo aplicativo SeuGestor (Local-First & Seguro)</span>
            <span>Emitido em ${nowFormatted}</span>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        dialogTitle: `Relatório Financeiro - ${capitalizedMonthLabel}`,
        mimeType: 'application/pdf',
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('exportToPDF error:', error);
    return false;
  }
};

export const exportToCSV = async (
  workspaceId: string,
  monthIndex?: number,
  year?: number
): Promise<boolean> => {
  try {
    const { transactions, workspaces, categories } = useFinanceStore.getState();
    const workspace = workspaces.find((item) => item.id === workspaceId);

    if (!workspace) {
      return false;
    }

    const { list: monthTransactions, targetMonth, targetYear } = getTargetMonthTransactions(
      transactions,
      workspaceId,
      monthIndex,
      year
    );

    // CSV Header em português (com BOM UTF-8 para Excel)
    const csvHeader = 'Data;Tipo;Categoria;Descricao;Forma de Pagamento;Valor\n';
    const csvRows = monthTransactions
      .map((tx) => {
        const catName = resolveCategoryName(tx.categoryId, categories);
        const line = [
          escapeCsvField(formatDate(tx.date)),
          escapeCsvField(tx.type === 'income' ? 'Receita' : tx.type === 'transfer' ? 'Transferência' : 'Despesa'),
          escapeCsvField(catName),
          escapeCsvField(tx.note || ''),
          escapeCsvField(tx.paymentMethod || 'Outro'),
          escapeCsvField(tx.amount.toFixed(2).replace('.', ',')),
        ];
        return line.join(';');
      })
      .join('\n');

    // UTF-8 BOM (\uFEFF) garante compatibilidade perfeita com Excel no Windows
    const csvContent = '\uFEFF' + csvHeader + csvRows;

    const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
    const safeWorkspaceName = workspace.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const monthFormatted = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const fileUri = `${cacheDir}${safeWorkspaceName}-relatorio-${monthFormatted}.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        dialogTitle: `Exportar Relatório CSV (${monthFormatted})`,
        mimeType: 'text/csv',
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('exportToCSV error:', error);
    return false;
  }
};