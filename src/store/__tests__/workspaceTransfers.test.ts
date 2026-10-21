jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Appearance: { getColorScheme: () => 'dark' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'pt-BR', currencyCode: 'BRL' }],
}));

jest.mock('../../services/notificationService', () => ({
  notifyBudgetThreshold: jest.fn(),
  notifyRecurringDueNow: jest.fn(),
  scheduleRecurringReminders: jest.fn(),
}));

import { useFinanceStore } from '../useFinanceStore';

describe('Workspace Transfers - Transferências entre Ambientes', () => {
  beforeEach(() => {
    useFinanceStore.setState({
      currentWorkspaceId: 'personal',
      workspaces: [
        {
          id: 'personal',
          name: 'Finanças Pessoais',
          type: 'personal',
          themeColor: '#0A84FF',
          creditCards: [],
        },
        {
          id: 'business',
          name: 'Finanças da Empresa',
          type: 'business',
          themeColor: '#d2ff61',
          creditCards: [],
        },
      ],
      accounts: [
        {
          id: 'acc-personal',
          name: 'Conta Pessoal',
          balance: 5000,
          themeColor: '#0A84FF',
          type: 'checking',
          workspaceId: 'personal',
        },
        {
          id: 'acc-business',
          name: 'Conta PJ',
          balance: 10000,
          themeColor: '#30D158',
          type: 'checking',
          workspaceId: 'business',
        },
      ],
      transactions: [],
      categories: [],
      recurringTemplates: [],
    });
  });

  describe('transferBetweenWorkspaces', () => {
    it('cria duas transações espelhadas com a categoria automática de transferência interna', () => {
      useFinanceStore
        .getState()
        .transferBetweenWorkspaces(1500, 'personal', 'business', 'Aporte de Capital');

      const state = useFinanceStore.getState();
      expect(state.transactions.length).toBe(2);

      const fromTx = state.transactions.find((tx) => tx.workspaceId === 'personal');
      const toTx = state.transactions.find((tx) => tx.workspaceId === 'business');

      expect(fromTx).toBeDefined();
      expect(toTx).toBeDefined();

      expect(fromTx?.amount).toBe(1500);
      expect(fromTx?.type).toBe('transfer');
      expect(fromTx?.categoryId).toBe('internal-transfer-personal');
      expect(fromTx?.note).toBe('Aporte de Capital');

      expect(toTx?.amount).toBe(1500);
      expect(toTx?.type).toBe('transfer');
      expect(toTx?.categoryId).toBe('internal-transfer-business');
      expect(toTx?.note).toBe('Aporte de Capital');

      // Categorias internas criadas automaticamente para ambos os workspaces
      const personalTransferCategory = state.categories.find(
        (c) => c.id === 'internal-transfer-personal'
      );
      const businessTransferCategory = state.categories.find(
        (c) => c.id === 'internal-transfer-business'
      );

      expect(personalTransferCategory).toBeDefined();
      expect(personalTransferCategory?.name).toBe('Transferência Interna');
      expect(businessTransferCategory).toBeDefined();
      expect(businessTransferCategory?.name).toBe('Transferência Interna');
    });

    it('gera notas padrão com o nome do workspace quando note não for informado', () => {
      useFinanceStore.getState().transferBetweenWorkspaces(800, 'business', 'personal');

      const state = useFinanceStore.getState();
      const originTx = state.transactions.find((tx) => tx.workspaceId === 'business');
      const destTx = state.transactions.find((tx) => tx.workspaceId === 'personal');

      expect(originTx?.note).toBe('Transferência: Finanças Pessoais');
      expect(destTx?.note).toBe('Origem: Finanças da Empresa');
    });

    it('rejeita transferência com valor menor ou igual a zero', () => {
      useFinanceStore.getState().transferBetweenWorkspaces(0, 'personal', 'business');
      useFinanceStore.getState().transferBetweenWorkspaces(-50, 'personal', 'business');

      expect(useFinanceStore.getState().transactions.length).toBe(0);
    });

    it('rejeita transferência para o mesmo workspace', () => {
      useFinanceStore.getState().transferBetweenWorkspaces(500, 'personal', 'personal');

      expect(useFinanceStore.getState().transactions.length).toBe(0);
    });
  });

  describe('Sincronismo na Exclusão (deleteTransaction)', () => {
    it('ao excluir uma ponta da transferência, remove automaticamente a transação contraparte', () => {
      useFinanceStore
        .getState()
        .transferBetweenWorkspaces(2000, 'personal', 'business', 'Pró-labore');

      const stateBefore = useFinanceStore.getState();
      expect(stateBefore.transactions.length).toBe(2);

      const personalTx = stateBefore.transactions.find((t) => t.workspaceId === 'personal')!;

      // Exclui a ponta pessoal
      useFinanceStore.getState().deleteTransaction(personalTx.id);

      const stateAfter = useFinanceStore.getState();
      // Ambas as pontas devem ter sido excluídas
      expect(stateAfter.transactions.length).toBe(0);
    });
  });
});
