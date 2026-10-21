jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn((title, message, buttons) => {
      // Automaticamente simula clique em 'Prosseguir' se houver diálogo de confirmação
      const proceedBtn = buttons?.find((b: any) => b.text === 'Prosseguir');
      if (proceedBtn?.onPress) {
        proceedBtn.onPress();
      } else if (buttons?.[0]?.onPress) {
        buttons[0].onPress();
      }
    }),
  },
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

describe('Credit Card Invoices - Fechamento, Limites e Quitação', () => {
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
              id: 'card-nubank',
              name: 'Nubank Roxinho',
              limit: 5000,
              availableLimit: 5000,
              closingDay: 10,
              dueDay: 17,
              themeColor: '#820AD1',
            },
          ],
        },
      ],
      accounts: [
        {
          id: 'acc-itau',
          name: 'Itaú CC',
          balance: 3000,
          themeColor: '#FF6200',
          type: 'checking',
          workspaceId: 'personal',
        },
      ],
      transactions: [],
      categories: [
        {
          id: 'cat-eletronicos',
          name: 'Eletrônicos',
          icon: 'laptop',
          color: '#0A84FF',
          workspaceId: 'personal',
        },
      ],
    });
  });

  describe('Corte de Fatura e Fechamento (closingDay)', () => {
    it('associa fatura ao mês atual se a compra for realizada até o dia de fechamento', () => {
      // Compra no dia 05 de Outubro (closingDay é 10)
      useFinanceStore.getState().addTransaction({
        amount: 350,
        type: 'expense',
        paymentMethod: 'credit',
        creditCardId: 'card-nubank',
        categoryId: 'cat-eletronicos',
        date: '2026-10-05T14:00:00Z',
        note: 'Teclado Mecânico',
        isRecurring: false,
      });

      const tx = useFinanceStore.getState().transactions[0]!;
      expect(tx.invoiceMonth).toBe('2026-10');
      expect(tx.invoiceStatus).toBe('open');
    });

    it('joga a fatura para o mês seguinte se a compra for após o dia de fechamento', () => {
      // Compra no dia 12 de Outubro (closingDay é 10)
      useFinanceStore.getState().addTransaction({
        amount: 600,
        type: 'expense',
        paymentMethod: 'credit',
        creditCardId: 'card-nubank',
        categoryId: 'cat-eletronicos',
        date: '2026-10-12T14:00:00Z',
        note: 'Monitor Gamer',
        isRecurring: false,
      });

      const tx = useFinanceStore.getState().transactions[0]!;
      expect(tx.invoiceMonth).toBe('2026-11');
      expect(tx.invoiceStatus).toBe('open');
    });

    it('distribui parcelas em faturas sucessivas com corte correto', () => {
      // Compra no dia 05 de Outubro parcelada em 3x (antes do fechamento do dia 10)
      useFinanceStore.getState().addTransaction({
        amount: 900,
        type: 'expense',
        paymentMethod: 'credit',
        creditCardId: 'card-nubank',
        categoryId: 'cat-eletronicos',
        date: '2026-10-05T10:00:00Z',
        note: 'Tablet',
        installments: 3,
        isRecurring: false,
      });

      const txs = useFinanceStore.getState().transactions;
      expect(txs.length).toBe(3);

      const p1 = txs.find((t) => t.installmentNumber === 1)!;
      const p2 = txs.find((t) => t.installmentNumber === 2)!;
      const p3 = txs.find((t) => t.installmentNumber === 3)!;

      expect(p1.amount).toBe(300);
      expect(p1.invoiceMonth).toBe('2026-10');

      expect(p2.amount).toBe(300);
      expect(p2.invoiceMonth).toBe('2026-11');

      expect(p3.amount).toBe(300);
      expect(p3.invoiceMonth).toBe('2026-12');
    });
  });

  describe('Controle de Limite do Cartão', () => {
    it('reduz o limite disponível na criação de despesa à vista', () => {
      useFinanceStore.getState().addTransaction({
        amount: 1500,
        type: 'expense',
        paymentMethod: 'credit',
        creditCardId: 'card-nubank',
        categoryId: 'cat-eletronicos',
        date: '2026-10-05T10:00:00Z',
        isRecurring: false,
      });

      const card = useFinanceStore.getState().workspaces[0]!.creditCards[0]!;
      expect(card.availableLimit).toBe(3500); // 5000 - 1500
    });

    it('reduz o limite disponível pelo total de compra parcelada', () => {
      useFinanceStore.getState().addTransaction({
        amount: 2400,
        type: 'expense',
        paymentMethod: 'credit',
        creditCardId: 'card-nubank',
        categoryId: 'cat-eletronicos',
        date: '2026-10-05T10:00:00Z',
        installments: 4,
        isRecurring: false,
      });

      const card = useFinanceStore.getState().workspaces[0]!.creditCards[0]!;
      expect(card.availableLimit).toBe(2600); // 5000 - 2400
    });
  });

  describe('Pagamento de Fatura (payInvoice)', () => {
    it('quita as transações da fatura, debita a conta bancária e restabelece o limite do cartão', async () => {
      // 1. Cria compras na fatura 2026-10
      useFinanceStore.getState().addTransaction({
        amount: 400,
        type: 'expense',
        paymentMethod: 'credit',
        creditCardId: 'card-nubank',
        categoryId: 'cat-eletronicos',
        date: '2026-10-02T10:00:00Z',
        isRecurring: false,
      });

      useFinanceStore.getState().addTransaction({
        amount: 600,
        type: 'expense',
        paymentMethod: 'credit',
        creditCardId: 'card-nubank',
        categoryId: 'cat-eletronicos',
        date: '2026-10-08T10:00:00Z',
        isRecurring: false,
      });

      // Total de 1000 na fatura 2026-10. Limite disponível caiu para 4000.
      expect(useFinanceStore.getState().workspaces[0]!.creditCards[0]!.availableLimit).toBe(4000);
      expect(useFinanceStore.getState().accounts[0]!.balance).toBe(3000);

      // 2. Efetua pagamento da fatura 2026-10
      await useFinanceStore.getState().payInvoice('card-nubank', '2026-10', 'acc-itau', 1000);

      const state = useFinanceStore.getState();

      // Saldo da conta bancária deve diminuir em 1000
      expect(state.accounts[0]!.balance).toBe(2000);

      // Limite disponível do cartão deve ser restaurado em 1000
      expect(state.workspaces[0]!.creditCards[0]!.availableLimit).toBe(5000);

      // As transações da fatura 2026-10 devem estar com status 'paid'
      const invoiceTxs = state.transactions.filter((t) => t.invoiceMonth === '2026-10');
      expect(invoiceTxs.length).toBe(2);
      expect(invoiceTxs.every((t) => t.invoiceStatus === 'paid')).toBe(true);

      // Uma transação de despesa de pagamento deve ser inserida, fora dos gráficos
      const paymentTx = state.transactions.find((t) => t.categoryId === 'pagamento-fatura');
      expect(paymentTx).toBeDefined();
      expect(paymentTx?.amount).toBe(1000);
      expect(paymentTx?.excludeFromCharts).toBe(true);
    });

    it('gera transação de ajuste quando há divergência no valor pago', async () => {
      // Compra de 500
      useFinanceStore.getState().addTransaction({
        amount: 500,
        type: 'expense',
        paymentMethod: 'credit',
        creditCardId: 'card-nubank',
        categoryId: 'cat-eletronicos',
        date: '2026-10-02T10:00:00Z',
        isRecurring: false,
      });

      // Paga 530 (com 30 reais de encargos/juros)
      await useFinanceStore.getState().payInvoice('card-nubank', '2026-10', 'acc-itau', 530);

      const state = useFinanceStore.getState();
      const adjustmentTx = state.transactions.find((t) => t.categoryId === 'ajuste-fatura');
      expect(adjustmentTx).toBeDefined();
      expect(adjustmentTx?.amount).toBe(30);
      expect(adjustmentTx?.type).toBe('expense');
      expect(adjustmentTx?.invoiceStatus).toBe('paid');
    });
  });
});
