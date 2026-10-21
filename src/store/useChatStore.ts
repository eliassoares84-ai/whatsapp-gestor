import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { financeStorageAdapter } from '../storage/asyncStorageAdapter';
import {
  callFinancialAdvisorChat,
  type ChatMessage,
  type UserFinancialContext,
} from '../services/financialChatService';

const getInitialWelcomeMessage = (): ChatMessage => ({
  id: 'welcome-advisor-msg',
  sender: 'assistant',
  text: `Olá! Sou seu Consultor Financeiro CFP® pessoal aqui no SeuGestor.\n\nTenho ampla vivência no mercado financeiro brasileiro e em planejamento patrimonial 360°. Posso te orientar desde a seleção de investimentos em Ações e Renda Fixa até estratégias avançadas de Financiamento Imobiliário (SAC vs Price), Veículos, Consórcios, Seguros de Vida, Previdência Privada (PGBL/VGBL), Tributação de IRPF e Holding Familiar.\n\nQual decisão ou dúvida financeira você gostaria de avaliar comigo hoje?`,
  timestamp: Date.now(),
});

interface ChatState {
  messages: ChatMessage[];
  isThinking: boolean;
  sendMessage: (userText: string, context?: UserFinancialContext) => Promise<void>;
  clearHistory: () => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [getInitialWelcomeMessage()],
      isThinking: false,

      sendMessage: async (userText: string, context?: UserFinancialContext) => {
        const text = userText.trim();
        if (!text || get().isThinking) {
          return;
        }

        const userMessage: ChatMessage = {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sender: 'user',
          text,
          timestamp: Date.now(),
        };

        const currentMessages = get().messages;
        set({
          messages: [...currentMessages, userMessage],
          isThinking: true,
        });

        try {
          const assistantReplyText = await callFinancialAdvisorChat(
            [...currentMessages, userMessage],
            text,
            context
          );

          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            sender: 'assistant',
            text: assistantReplyText,
            timestamp: Date.now(),
          };

          set((state) => ({
            messages: [...state.messages, assistantMessage],
            isThinking: false,
          }));
        } catch {
          const fallbackMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: 'Tive uma instabilidade temporária na conexão para processar sua resposta. Pode tentar me perguntar novamente?',
            timestamp: Date.now(),
          };

          set((state) => ({
            messages: [...state.messages, fallbackMessage],
            isThinking: false,
          }));
        }
      },

      clearHistory: () => {
        set({
          messages: [getInitialWelcomeMessage()],
          isThinking: false,
        });
      },

      resetChat: () => {
        set({
          messages: [getInitialWelcomeMessage()],
          isThinking: false,
        });
      },
    }),
    {
      name: 'financial-advisor-chat-storage',
      storage: createJSONStorage(() => financeStorageAdapter),
    }
  )
);
