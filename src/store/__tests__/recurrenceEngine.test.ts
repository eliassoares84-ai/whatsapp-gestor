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

describe('Recurrence Engine - checkAndProcessRecurrences', () => {
  beforeEach(() => {
    jest.useRealTimers();
    useFinanceStore.setState({
      currentWorkspaceId: 'personal',
      workspaces: [
        {
          id: 'personal',
          name: 'Pessoal',
          type: 'personal',
          themeColor: '#0A84FF',
          creditCards: [],
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
          id: 'cat-fixa',
          name: 'Despesas Fixas',
          icon: 'home',
          color: '#FF3B30',
          workspaceId: 'personal',
        },
      ],
      recurringTemplates: [],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Recorrência Mensal', () => {
    it('não processa transação se o dia atual for anterior ao dia de vencimento', () => {
      // Simula data: 05 de Outubro de 2026
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-10-05T10:00:00Z'));

      useFinanceStore.getState().addRecurringTemplate({
        amount: 250,
        type: 'expense',
        frequency: 'monthly',
        dayOfMonth: 10, // Vence no dia 10
        categoryId: 'cat-fixa',
        note: 'Internet Fibra',
      });

      useFinanceStore.getState().checkAndProcessRecurrences();

      const state = useFinanceStore.getState();
      expect(state.transactions.length).toBe(0);
      expect(state.recurringTemplates[0]!.lastProcessedDate).toBe('');
    });

    it('gera transação quando o dia do vencimento é atingido e atualiza lastProcessedDate', () => {
      // Simula data: 10 de Outubro de 2026
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-10-10T10:00:00Z'));

      useFinanceStore.getState().addRecurringTemplate({
        amount: 250,
        type: 'expense',
        frequency: 'monthly',
        dayOfMonth: 10,
        categoryId: 'cat-fixa',
        note: 'Internet Fibra',
      });

      useFinanceStore.getState().checkAndProcessRecurrences();

      const state = useFinanceStore.getState();
      expect(state.transactions.length).toBe(1);
      const generatedTx = state.transactions[0]!;
      expect(generatedTx.amount).toBe(250);
      expect(generatedTx.type).toBe('expense');
      expect(generatedTx.note).toBe('Internet Fibra');
      expect(generatedTx.isRecurring).toBe(true);
      expect(state.recurringTemplates[0]!.lastProcessedDate).toBe('2026-10-10');
    });

    it('não gera duplicata ao rodar múltiplas vezes no mesmo dia', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-10-10T10:00:00Z'));

      useFinanceStore.getState().addRecurringTemplate({
        amount: 250,
        type: 'expense',
        frequency: 'monthly',
        dayOfMonth: 10,
        categoryId: 'cat-fixa',
        note: 'Internet Fibra',
      });

      // Roda 3 vezes seguidas no mesmo dia
      useFinanceStore.getState().checkAndProcessRecurrences();
      useFinanceStore.getState().checkAndProcessRecurrences();
      useFinanceStore.getState().checkAndProcessRecurrences();

      const state = useFinanceStore.getState();
      expect(state.transactions.length).toBe(1);
    });

    it('gera nova transação no mês seguinte quando atingir o dia do vencimento', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-10-10T10:00:00Z'));

      useFinanceStore.getState().addRecurringTemplate({
        amount: 250,
        type: 'expense',
        frequency: 'monthly',
        dayOfMonth: 10,
        categoryId: 'cat-fixa',
        note: 'Internet Fibra',
      });

      useFinanceStore.getState().checkAndProcessRecurrences();
      expect(useFinanceStore.getState().transactions.length).toBe(1);

      // Avança para o mês seguinte: 10 de Novembro de 2026
      jest.setSystemTime(new Date('2026-11-10T10:00:00Z'));
      useFinanceStore.getState().checkAndProcessRecurrences();

      const state = useFinanceStore.getState();
      expect(state.transactions.length).toBe(2);
      expect(state.recurringTemplates[0]!.lastProcessedDate).toBe('2026-11-10');
    });
  });

  describe('Recorrência Semanal', () => {
    it('gera transação semanal e respeita intervalo de 7 dias', () => {
      jest.useFakeTimers();
      // Dia 07
      jest.setSystemTime(new Date('2026-10-07T10:00:00Z'));

      useFinanceStore.getState().addRecurringTemplate({
        amount: 50,
        type: 'expense',
        frequency: 'weekly',
        dayOfMonth: 5, // limite mínimo de dia
        categoryId: 'cat-fixa',
        note: 'Feira Semanal',
      });

      // Primeira execução
      useFinanceStore.getState().checkAndProcessRecurrences();
      expect(useFinanceStore.getState().transactions.length).toBe(1);

      // 4 dias depois (dia 11) - Não deve disparar
      jest.setSystemTime(new Date('2026-10-11T10:00:00Z'));
      useFinanceStore.getState().checkAndProcessRecurrences();
      expect(useFinanceStore.getState().transactions.length).toBe(1);

      // 7 dias depois da primeira (dia 14) - Deve disparar
      jest.setSystemTime(new Date('2026-10-14T10:00:00Z'));
      useFinanceStore.getState().checkAndProcessRecurrences();
      expect(useFinanceStore.getState().transactions.length).toBe(2);
    });
  });

  describe('Recorrência Anual', () => {
    it('gera apenas uma vez por ano', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-10-15T10:00:00Z'));

      useFinanceStore.getState().addRecurringTemplate({
        amount: 1500,
        type: 'expense',
        frequency: 'yearly',
        dayOfMonth: 15,
        categoryId: 'cat-fixa',
        note: 'IPVA Anual',
      });

      useFinanceStore.getState().checkAndProcessRecurrences();
      expect(useFinanceStore.getState().transactions.length).toBe(1);

      // Avança um mês no mesmo ano (não deve disparar)
      jest.setSystemTime(new Date('2026-11-15T10:00:00Z'));
      useFinanceStore.getState().checkAndProcessRecurrences();
      expect(useFinanceStore.getState().transactions.length).toBe(1);

      // Avança para o ano seguinte (2027)
      jest.setSystemTime(new Date('2027-10-15T10:00:00Z'));
      useFinanceStore.getState().checkAndProcessRecurrences();
      expect(useFinanceStore.getState().transactions.length).toBe(2);
      expect(useFinanceStore.getState().recurringTemplates[0]!.lastProcessedDate).toBe('2027-10-15');
    });
  });

  describe('Status e Gerenciamento de Templates', () => {
    it('ignora templates desativados (isActive: false)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-10-10T10:00:00Z'));

      useFinanceStore.getState().addRecurringTemplate({
        amount: 100,
        type: 'expense',
        frequency: 'monthly',
        dayOfMonth: 10,
        categoryId: 'cat-fixa',
        note: 'Academia',
      });

      const templateId = useFinanceStore.getState().recurringTemplates[0]!.id;
      // Desativa
      useFinanceStore.getState().toggleRecurringTemplate(templateId);
      expect(useFinanceStore.getState().recurringTemplates[0]!.isActive).toBe(false);

      useFinanceStore.getState().checkAndProcessRecurrences();
      expect(useFinanceStore.getState().transactions.length).toBe(0);

      // Reativa
      useFinanceStore.getState().toggleRecurringTemplate(templateId);
      expect(useFinanceStore.getState().recurringTemplates[0]!.isActive).toBe(true);

      useFinanceStore.getState().checkAndProcessRecurrences();
      expect(useFinanceStore.getState().transactions.length).toBe(1);
    });

    it('permite atualizar e deletar templates', () => {
      useFinanceStore.getState().addRecurringTemplate({
        amount: 80,
        type: 'expense',
        frequency: 'monthly',
        dayOfMonth: 5,
        categoryId: 'cat-fixa',
        note: 'Streaming',
      });

      const templateId = useFinanceStore.getState().recurringTemplates[0]!.id;
      useFinanceStore.getState().updateRecurringTemplate(templateId, { amount: 90 });
      expect(useFinanceStore.getState().recurringTemplates[0]!.amount).toBe(90);

      useFinanceStore.getState().deleteRecurringTemplate(templateId);
      expect(useFinanceStore.getState().recurringTemplates.length).toBe(0);
    });
  });
});
