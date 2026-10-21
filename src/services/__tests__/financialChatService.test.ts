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
