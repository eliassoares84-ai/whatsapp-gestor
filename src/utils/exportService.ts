import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { useFinanceStore } from '../store/useFinanceStore';
import type { Transaction } from '../types/finance.types';

const formatCurrency = (value: number): string =>
  `R$ ${Math.abs(value).toFixed(2).replace('.', ',')}`;

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const getCurrentMonthTransactions = (
  transactions: Transaction[],
  workspaceId: string
): Transaction[] => {
  const now = new Date();

  return transactions.filter((tx) => {
    if (tx.workspaceId !== workspaceId) {
      return false;
    }

    const date = new Date(tx.date);
    return (
      date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    );
  });
};

export const exportToPDF = async (workspaceId: string): Promise<boolean> => {
  try {
    const { workspaces, transactions } = useFinanceStore.getState();
    const workspace = workspaces.find((item) => item.id === workspaceId);

    if (!workspace) {
      return false;
    }

    const monthTransactions = getCurrentMonthTransactions(transactions, workspaceId);
    const income = monthTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expense = monthTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const profit = income - expense;

    const latest = [...monthTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);

    const rows = latest
      .map(
        (tx) => `
          <tr>
            <td>${formatDate(tx.date)}</td>
            <td>${tx.type}</td>
            <td>${tx.note || '-'}</td>
            <td style="text-align:right;">${formatCurrency(tx.amount)}</td>
          </tr>
        `
      )
      .join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #111; padding: 24px; }
            .logo { width: 100%; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 20px; }
            .logo span { font-size: 20px; font-weight: 700; }
            .section { background: #f4f4f4; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
            .dre-line { display: flex; justify-content: space-between; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-bottom: 1px solid #ddd; padding: 8px 6px; font-size: 12px; }
            th { text-align: left; background: #eee; }
          </style>
        </head>
        <body>
          <div class="logo"><span>Micro-ERP Financeiro</span></div>
          <div class="section">
            <strong>Workspace:</strong> ${workspace.name}
          </div>
          <div class="section">
            <h3 style="margin-top:0;">DRE do Mês Atual</h3>
            <div class="dre-line"><span>Receita</span><strong>${formatCurrency(income)}</strong></div>
            <div class="dre-line"><span>Despesa</span><strong>${formatCurrency(expense)}</strong></div>
            <div class="dre-line"><span>Lucro</span><strong>${formatCurrency(profit)}</strong></div>
          </div>
          <div class="section">
            <h3 style="margin-top:0;">Últimas transações</h3>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th style="text-align:right;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="4">Sem transações no período.</td></tr>'}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        dialogTitle: 'Exportar Relatório em PDF',
        mimeType: 'application/pdf',
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

export const exportToCSV = async (workspaceId: string): Promise<boolean> => {
  try {
    const { transactions, workspaces } = useFinanceStore.getState();
    const workspace = workspaces.find((item) => item.id === workspaceId);

    if (!workspace) {
      return false;
    }

    const monthTransactions = getCurrentMonthTransactions(transactions, workspaceId);
    const csvHeader = 'data,tipo,categoria,descricao,valor\n';
    const csvRows = monthTransactions
      .map((tx) => {
        const line = [
          formatDate(tx.date),
          tx.type,
          tx.categoryId,
          (tx.note || '').replace(/,/g, ' '),
          tx.amount.toFixed(2),
        ];
        return line.join(',');
      })
      .join('\n');

    const csvContent = csvHeader + csvRows;
      const cacheDir = (FileSystem as any).cacheDirectory;
      const fileUri = `${cacheDir}${workspace.name
      .toLowerCase()
      .replace(/\s+/g, '-')}-relatorio.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: ((FileSystem as any).EncodingType?.UTF8) || 'utf8',
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        dialogTitle: 'Exportar Relatório em CSV',
        mimeType: 'text/csv',
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
};