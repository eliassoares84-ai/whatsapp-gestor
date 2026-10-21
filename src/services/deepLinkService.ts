import { Linking } from 'react-native';

export type DeepLinkAction =
  | { type: 'voice' }
  | {
      type: 'quick-add';
      amount?: number;
      entryType?: 'income' | 'expense';
      note?: string;
      text?: string;
    }
  | { type: 'navigate'; screen: 'Home' | 'Transactions' | 'Reports' | 'Settings' };

type ActionCallback = (action: DeepLinkAction) => void;

class DeepLinkManager {
  private listeners: Set<ActionCallback> = new Set();
  private pendingAction: DeepLinkAction | null = null;
  private isInitialized = false;

  public parseUrl(url: string | null): DeepLinkAction | null {
    if (!url) return null;

    try {
      // Normalize meugestor://path?query
      const cleanUrl = url.trim();
      const withoutScheme = cleanUrl.replace(/^meugestor:\/\//i, '');
      const [path, queryString] = withoutScheme.split('?');

      const params = new URLSearchParams(queryString || '');
      const feature = params.get('feature')?.toLowerCase();

      // Voice shortcuts / Assistant voice
      if (
        path === 'voice-entry' ||
        path === 'voice' ||
        feature === 'voice'
      ) {
        return { type: 'voice' };
      }

      // Quick add / Transaction entry
      if (
        path === 'quick-add' ||
        path === 'transaction' ||
        feature === 'transaction'
      ) {
        const rawAmount = params.get('amount');
        const rawType = params.get('type')?.toLowerCase();
        const note = params.get('note') || undefined;
        const text = params.get('text') || undefined;

        let amount: number | undefined;
        if (rawAmount) {
          const parsed = parseFloat(rawAmount.replace(',', '.'));
          if (!isNaN(parsed) && parsed > 0) {
            amount = parsed;
          }
        }

        let entryType: 'income' | 'expense' | undefined;
        if (rawType === 'income' || rawType === 'receita') {
          entryType = 'income';
        } else if (rawType === 'expense' || rawType === 'despesa') {
          entryType = 'expense';
        }

        return {
          type: 'quick-add',
          amount,
          entryType,
          note,
          text,
        };
      }

      // Reports
      if (path === 'reports' || feature === 'reports') {
        return { type: 'navigate', screen: 'Reports' };
      }

      // Transactions
      if (path === 'transactions' || feature === 'transactions') {
        return { type: 'navigate', screen: 'Transactions' };
      }

      // Home / Dashboard
      if (path === 'home' || path === 'dashboard') {
        return { type: 'navigate', screen: 'Home' };
      }

      return null;
    } catch (e) {
      console.warn('[DeepLinkService] Erro ao analisar URL:', e);
      return null;
    }
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Ouvir chamadas com o app aberto ou em background
    Linking.addEventListener('url', ({ url }) => {
      const action = this.parseUrl(url);
      if (action) {
        this.dispatchOrStore(action);
      }
    });

    // 2. Verificar chamada de abertura (cold start / app fechado)
    void Linking.getInitialURL().then((url) => {
      const action = this.parseUrl(url);
      if (action) {
        this.dispatchOrStore(action);
      }
    }).catch(() => {});
  }

  public dispatchOrStore(action: DeepLinkAction) {
    if (this.listeners.size > 0) {
      this.listeners.forEach((cb) => {
        try {
          cb(action);
        } catch (e) {
          console.error('[DeepLinkService] Erro ao disparar listener:', e);
        }
      });
    } else {
      // Nenhum componente ativo para processar agora (ex: tela de bloqueio ativa)
      this.pendingAction = action;
    }
  }

  public subscribe(cb: ActionCallback): () => void {
    this.listeners.add(cb);

    // Se havia uma ação pendente aguardando montagem do app
    if (this.pendingAction) {
      const action = this.pendingAction;
      this.pendingAction = null;
      setTimeout(() => {
        cb(action);
      }, 300);
    }

    return () => {
      this.listeners.delete(cb);
    };
  }

  public getPendingAction(): DeepLinkAction | null {
    return this.pendingAction;
  }

  public clearPendingAction() {
    this.pendingAction = null;
  }
}

export const deepLinkService = new DeepLinkManager();
