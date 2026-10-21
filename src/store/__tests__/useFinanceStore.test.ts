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

describe('useFinanceStore - deleteTransaction', () => {
  beforeEach(() => {
    useFinanceStore.setState({
      currentWorkspaceId: 'personal',
      workspaces: [
        {
          id: 'personal',
          name: 'Pessoal',
          type: 'personal',
          themeColor: '#0A84FF',
          creditCards: [
            {
              id: 'card-1',
              name: 'Nubank',
              limit: 5000,
              availableLimit: 4000,
              closingDay: 5,
              dueDay: 12,
              themeColor: '#820AD1',
            },
          ],
        },
      ],
      accounts: [
        {
          id: 'acc-1',
          name: 'Conta Corrente',
          balance: 1000,
          themeColor: '#0A84FF',
          type: 'checking',
          workspaceId: 'personal',
        },
      ],
      transactions: [],
      categories: [
        {
          id: 'alimentacao',
          name: 'Alimentação',
          icon: 'food',
          color: '#FF9500',
          workspaceId: 'personal',
        },
      ],
    });
  });

  it('exclui despesa de conta bancária e devolve o saldo', () => {
    // Adiciona despesa de 100 reais
    useFinanceStore.getState().addTransaction({
      amount: 100,
      type: 'expense',
      paymentMethod: 'debit',
      categoryId: 'alimentacao',
      date: new Date().toISOString(),
      isRecurring: false,
      accountId: 'acc-1',
    });

    const stateAfterAdd = useFinanceStore.getState();
    expect(stateAfterAdd.accounts[0]!.balance).toBe(900);
    expect(stateAfterAdd.transactions.length).toBe(1);

    const txId = stateAfterAdd.transactions[0]!.id;
    useFinanceStore.getState().deleteTransaction(txId);

    const stateAfterDelete = useFinanceStore.getState();
    expect(stateAfterDelete.transactions.length).toBe(0);
    expect(stateAfterDelete.accounts[0]!.balance).toBe(1000);
  });

  it('exclui receita de conta bancária e reduz o saldo', () => {
    useFinanceStore.getState().addTransaction({
      amount: 500,
      type: 'income',
      paymentMethod: 'pix',
      categoryId: 'alimentacao',
      date: new Date().toISOString(),
      isRecurring: false,
      accountId: 'acc-1',
    });

    const stateAfterAdd = useFinanceStore.getState();
    expect(stateAfterAdd.accounts[0]!.balance).toBe(1500);

    const txId = stateAfterAdd.transactions[0]!.id;
    useFinanceStore.getState().deleteTransaction(txId);

    const stateAfterDelete = useFinanceStore.getState();
    expect(stateAfterDelete.transactions.length).toBe(0);
    expect(stateAfterDelete.accounts[0]!.balance).toBe(1000);
  });

  it('exclui compra no cartão de crédito em fatura aberta e devolve limite disponível', () => {
    useFinanceStore.getState().addTransaction({
      amount: 300,
      type: 'expense',
      paymentMethod: 'credit',
      creditCardId: 'card-1',
      categoryId: 'alimentacao',
      date: new Date().toISOString(),
      isRecurring: false,
    });

    const stateAfterAdd = useFinanceStore.getState();
    const cardAfterAdd = stateAfterAdd.workspaces[0]!.creditCards[0]!;
    expect(cardAfterAdd.availableLimit).toBe(3700);

    const txId = stateAfterAdd.transactions[0]!.id;
    useFinanceStore.getState().deleteTransaction(txId);

    const stateAfterDelete = useFinanceStore.getState();
    const cardAfterDelete = stateAfterDelete.workspaces[0]!.creditCards[0]!;
    expect(stateAfterDelete.transactions.length).toBe(0);
    expect(cardAfterDelete.availableLimit).toBe(4000);
  });

  it('exclui todas as parcelas de compra parcelada com deleteAllInstallments: true', () => {
    useFinanceStore.getState().addTransaction({
      amount: 600,
      type: 'expense',
      paymentMethod: 'credit',
      creditCardId: 'card-1',
      categoryId: 'alimentacao',
      date: new Date().toISOString(),
      isRecurring: false,
      installments: 3,
    });

    const stateAfterAdd = useFinanceStore.getState();
    expect(stateAfterAdd.transactions.length).toBe(3);
    const cardAfterAdd = stateAfterAdd.workspaces[0]!.creditCards[0]!;
    expect(cardAfterAdd.availableLimit).toBe(3400);

    const firstTx = stateAfterAdd.transactions[0]!;
    expect(firstTx.installmentGroupId).toBeDefined();

    // Deleta todo o grupo de parcelas
    useFinanceStore.getState().deleteTransaction(firstTx.id, { deleteAllInstallments: true });

    const stateAfterDelete = useFinanceStore.getState();
    expect(stateAfterDelete.transactions.length).toBe(0);
    const cardAfterDelete = stateAfterDelete.workspaces[0]!.creditCards[0]!;
    expect(cardAfterDelete.availableLimit).toBe(4000);
  });

  it('exclui apenas uma parcela individual de compra parcelada', () => {
    useFinanceStore.getState().addTransaction({
      amount: 600,
      type: 'expense',
      paymentMethod: 'credit',
      creditCardId: 'card-1',
      categoryId: 'alimentacao',
      date: new Date().toISOString(),
      isRecurring: false,
      installments: 3,
    });

    const stateAfterAdd = useFinanceStore.getState();
    expect(stateAfterAdd.transactions.length).toBe(3);

    const firstTx = stateAfterAdd.transactions[0]!; // parcela de 200
    useFinanceStore.getState().deleteTransaction(firstTx.id);

    const stateAfterDelete = useFinanceStore.getState();
    expect(stateAfterDelete.transactions.length).toBe(2);
    const cardAfterDelete = stateAfterDelete.workspaces[0]!.creditCards[0]!;
    // 3400 + 200 = 3600
    expect(cardAfterDelete.availableLimit).toBe(3600);
  });

  describe('setCategoryBudget', () => {
    it('define, altera e remove o limite de orcamento de uma categoria', () => {
      useFinanceStore.getState().setCategoryBudget('alimentacao', 500);

      const category = useFinanceStore
        .getState()
        .categories.find((c) => c.id === 'alimentacao');
      expect(category?.budgetLimit).toBe(500);

      // Altera o limite
      useFinanceStore.getState().setCategoryBudget('alimentacao', 850);
      const updated = useFinanceStore
        .getState()
        .categories.find((c) => c.id === 'alimentacao');
      expect(updated?.budgetLimit).toBe(850);

      // Remove o limite
      useFinanceStore.getState().setCategoryBudget('alimentacao', null);
      const cleared = useFinanceStore
        .getState()
        .categories.find((c) => c.id === 'alimentacao');
      expect(cleared?.budgetLimit).toBeUndefined();
    });
  });

  describe('premium management', () => {
    it('sets premium status and toggles status correctly', () => {
      useFinanceStore.setState({ isPremium: false });
      expect(useFinanceStore.getState().isPremium).toBe(false);

      useFinanceStore.getState().setPremiumStatus(true);
      expect(useFinanceStore.getState().isPremium).toBe(true);

      useFinanceStore.getState().togglePremiumStatus();
      expect(useFinanceStore.getState().isPremium).toBe(false);

      useFinanceStore.getState().setPremiumStatus(false);
      expect(useFinanceStore.getState().isPremium).toBe(false);
    });
  });
});
