const mockPrintToFileAsync = jest.fn().mockResolvedValue({ uri: 'file:///mock/report.pdf' });
const mockShareAsync = jest.fn().mockResolvedValue(undefined);
const mockIsAvailableAsync = jest.fn().mockResolvedValue(true);
const mockWriteAsStringAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone',
  },
}));

jest.mock('expo-print', () => ({
  __esModule: true,
  printToFileAsync: mockPrintToFileAsync,
}));

jest.mock('expo-sharing', () => ({
  __esModule: true,
  isAvailableAsync: mockIsAvailableAsync,
  shareAsync: mockShareAsync,
}));

jest.mock('expo-file-system', () => ({
  __esModule: true,
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///docs/',
  writeAsStringAsync: mockWriteAsStringAsync,
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///docs/',
  writeAsStringAsync: mockWriteAsStringAsync,
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('react-native', () => ({
  Appearance: { getColorScheme: () => 'dark', addChangeListener: () => ({ remove: jest.fn() }) },
  Alert: { alert: jest.fn() },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'pt-BR', currencyCode: 'BRL' }],
}));

jest.mock('../../storage/asyncStorageAdapter', () => ({
  financeStorageAdapter: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

import { useFinanceStore } from '../../store/useFinanceStore';
import { exportToPDF, exportToCSV } from '../exportService';

describe('exportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFinanceStore.setState({
      currentWorkspaceId: 'ws-test',
      workspaces: [
        {
          id: 'ws-test',
          name: 'Empresa Principal',
          type: 'business',
          themeColor: '#10B981',
          creditCards: [],
        },
      ],
      categories: [
        { id: 'cat-sales', name: 'Vendas', icon: 'cash', color: '#10B981', workspaceId: 'ws-test' },
        { id: 'cat-ops', name: 'Operacional', icon: 'cog', color: '#EF4444', workspaceId: 'ws-test' },
      ],
      transactions: [
        {
          id: 'tx-1',
          workspaceId: 'ws-test',
          type: 'income',
          categoryId: 'cat-sales',
          amount: 5000,
          note: 'Projeto Alpha',
          date: '2026-10-05T10:00:00.000Z',
          isRecurring: false,
        },
        {
          id: 'tx-2',
          workspaceId: 'ws-test',
          type: 'expense',
          categoryId: 'cat-ops',
          amount: 1500,
          note: 'Servidores AWS',
          date: '2026-10-12T14:30:00.000Z',
          isRecurring: false,
        },
        {
          id: 'tx-prev',
          workspaceId: 'ws-test',
          type: 'income',
          categoryId: 'cat-sales',
          amount: 8000,
          date: '2026-08-01T10:00:00.000Z', // Mês diferente (agosto)
          isRecurring: false,
        },
      ],
      currency: 'BRL',
    });
  });

  describe('exportToPDF', () => {
    it('gera PDF executivo formatado para o mês e ano especificados', async () => {
      // Outubro de 2026 (month 9 no JS Date 0-indexed)
      const success = await exportToPDF('ws-test', 9, 2026);

      expect(success).toBe(true);
      expect(mockPrintToFileAsync).toHaveBeenCalledTimes(1);

      const html = mockPrintToFileAsync.mock.calls[0][0].html;
      // Deve conter informações do workspace
      expect(html).toContain('Empresa Principal');
      expect(html).toContain('Empresarial');
      // Deve conter transações apenas de outubro (5000 e 1500), excluindo agosto (8000)
      expect(html).toContain('Projeto Alpha');
      expect(html).toContain('Servidores AWS');
      expect(html).not.toContain('2026-08-01');
      // Deve conter resumo de categorias
      expect(html).toContain('Operacional');
      // Deve invocar compartilhamento
      expect(mockShareAsync).toHaveBeenCalledWith('file:///mock/report.pdf', expect.any(Object));
    });

    it('retorna false quando workspace não existe', async () => {
      const success = await exportToPDF('ws-inexistente');
      expect(success).toBe(false);
      expect(mockPrintToFileAsync).not.toHaveBeenCalled();
    });
  });

  describe('exportToCSV', () => {
    it('gera CSV com BOM UTF-8, ponto e vírgula e nomes amigáveis de categoria', async () => {
      const success = await exportToCSV('ws-test', 9, 2026);

      expect(success).toBe(true);
      expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);

      const [filePath, content] = mockWriteAsStringAsync.mock.calls[0];
      expect(filePath).toContain('empresa-principal-relatorio-2026-10.csv');
      // Verifica UTF-8 BOM
      expect(content.startsWith('\uFEFF')).toBe(true);
      // Verifica cabeçalho e linhas
      expect(content).toContain('Data;Tipo;Categoria;Descricao;Forma de Pagamento;Valor');
      expect(content).toContain('Receita;Vendas;Projeto Alpha;Outro;"5000,00"');
      expect(content).toContain('Despesa;Operacional;Servidores AWS;Outro;"1500,00"');
      // Não deve conter transação de agosto
      expect(content).not.toContain('8000,00');

      expect(mockShareAsync).toHaveBeenCalledWith(filePath, expect.any(Object));
    });
  });
});
