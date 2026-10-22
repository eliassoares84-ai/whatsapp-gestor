import {
  callFinancialAdvisorChat,
  generateOfflineAdvisoryResponse,
} from '../financialChatService';
import { useChatStore } from '../../store/useChatStore';

// Mock react-native and storage dependencies
jest.mock('react-native', () => ({
  Appearance: { getColorScheme: () => 'dark', addChangeListener: () => ({ remove: jest.fn() }) },
  Alert: { alert: jest.fn() },
}));

describe('financialChatService & Consultor Inteligente', () => {
  beforeEach(() => {
    useChatStore.getState().clearHistory();
  });

  describe('generateOfflineAdvisoryResponse', () => {
    it('deve fornecer orientação sobre SAC vs Price com estratégia de amortização', () => {
      const response = generateOfflineAdvisoryResponse('Qual a diferença entre SAC e Price?');
      expect(response).toContain('SAC');
      expect(response).toContain('Price');
      expect(response).toContain('amortização');
    });

    it('deve fornecer orientação técnica sobre Holding Familiar e sucessão', () => {
      const response = generateOfflineAdvisoryResponse('Vale a pena abrir uma holding familiar?');
      expect(response).toContain('Holding Familiar');
      expect(response).toContain('Inventário');
      expect(response).toContain('usufruto');
    });

    it('deve explicar a regra de ouro do PGBL vs VGBL e tabela regressiva', () => {
      const response = generateOfflineAdvisoryResponse('Devo escolher PGBL ou VGBL?');
      expect(response).toContain('PGBL');
      expect(response).toContain('VGBL');
      expect(response).toContain('Regressiva');
    });

    it('deve explicar consórcios sem viés comercial de banco', () => {
      const response = generateOfflineAdvisoryResponse('Consórcio vale a pena?');
      expect(response).toContain('Taxa de Administração');
      expect(response).toContain('lance');
    });

    it('deve orientar sobre financiamento e custo real de veículos (TCO)', () => {
      const response = generateOfflineAdvisoryResponse('Quero financiar um carro');
      expect(response).toContain('Depreciação');
      expect(response).toContain('IPVA');
    });

    it('deve orientar sobre carteira de ações e isenção tributária de 20k', () => {
      const response = generateOfflineAdvisoryResponse('Como investir em ações e dividendos?');
      expect(response).toContain('Dividendos');
      expect(response).toContain('20.000');
    });

    it('deve retornar resposta consultiva de acolhimento para dúvidas gerais', () => {
      const response = generateOfflineAdvisoryResponse('Boa tarde, preciso de ajuda');
      expect(response).toContain('Consultor Financeiro Inteligente');
      expect(response).toContain('Investimentos');
    });

    it('deve analisar os gastos do mês com diagnóstico estruturado e sugestão de investimentos', () => {
      const response = generateOfflineAdvisoryResponse('📊 Analisar meus gastos e o orçamento deste mês', {
        monthlyIncome: 8000,
        monthlyExpense: 5000,
        netSavings: 3000,
        savingsRate: 38,
        selectedMonthName: 'Outubro',
        topCategories: [
          { name: 'Alimentação', amount: 2000, percentage: 40 },
          { name: 'Moradia', amount: 1500, percentage: 30 },
        ],
      });

      expect(response).toContain('Panorama Geral do Mês');
      expect(response).toContain('8000.00');
      expect(response).toContain('5000.00');
      expect(response).toContain('3000.00');
      expect(response).toContain('Radiografia dos Maiores Gastos');
      expect(response).toContain('Alimentação');
      expect(response).toContain('Diagnóstico Estratégico & Investimentos');
      expect(response).toContain('Tesouro Selic');
      expect(response).toContain('Vamos conversar');
    });

    it('deve retornar mensagem amigável de incentivo se o mês não tiver lançamentos', () => {
      const response = generateOfflineAdvisoryResponse('📊 Analisar meus gastos e o orçamento deste mês', {
        monthlyIncome: 0,
        monthlyExpense: 0,
        selectedMonthName: 'Outubro',
      });

      expect(response).toContain('ainda não encontrei lançamentos registrados');
      expect(response).toContain('Outubro');
    });
  });

  describe('useChatStore', () => {
    it('inicia com a mensagem de boas-vindas do consultor inteligente', () => {
      const state = useChatStore.getState();
      expect(state.messages.length).toBeGreaterThanOrEqual(1);
      expect(state.messages[0]?.sender).toBe('assistant');
      expect(state.messages[0]?.text).toContain('Consultor Financeiro Inteligente');
    });

    it('permite enviar mensagens e adiciona resposta do consultor', async () => {
      await useChatStore.getState().sendMessage('Qual a diferença entre SAC e Price?');
      const state = useChatStore.getState();
      expect(state.messages.length).toBe(3); // welcome + user + assistant
      expect(state.messages[1]?.sender).toBe('user');
      expect(state.messages[1]?.text).toBe('Qual a diferença entre SAC e Price?');
      expect(state.messages[2]?.sender).toBe('assistant');
      expect(state.messages[2]?.text).toContain('SAC');
    });

    it('dispara requestMonthlyAnalysis com contexto financeiro e recebe diagnóstico', async () => {
      await useChatStore.getState().requestMonthlyAnalysis({
        monthlyIncome: 10000,
        monthlyExpense: 6000,
        netSavings: 4000,
        savingsRate: 40,
        selectedMonthName: 'Outubro',
        topCategories: [{ name: 'Moradia', amount: 3000, percentage: 50 }],
      });

      const state = useChatStore.getState();
      expect(state.messages.length).toBe(3);
      expect(state.messages[1]?.text).toContain('📊 Analisar meus gastos');
      expect(state.messages[2]?.text).toContain('Panorama Geral do Mês');
    });

    it('evita duplicidade de requestMonthlyAnalysis se chamado consecutivamente', async () => {
      const context = {
        monthlyIncome: 10000,
        monthlyExpense: 6000,
        netSavings: 4000,
        savingsRate: 40,
      };

      await useChatStore.getState().requestMonthlyAnalysis(context);
      const countAfterFirst = useChatStore.getState().messages.length;

      // Imediatamente tenta chamar novamente
      await useChatStore.getState().requestMonthlyAnalysis(context);
      const countAfterSecond = useChatStore.getState().messages.length;

      expect(countAfterSecond).toBe(countAfterFirst);
    });

    it('limpa o histórico mantendo a mensagem inicial', async () => {
      await useChatStore.getState().sendMessage('Teste 123');
      expect(useChatStore.getState().messages.length).toBe(3);

      useChatStore.getState().clearHistory();
      const state = useChatStore.getState();
      expect(state.messages.length).toBe(1);
      expect(state.messages[0]?.sender).toBe('assistant');
    });
  });
});
