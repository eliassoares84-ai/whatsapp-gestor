import {
  Alert,
  type AlertButton as RNAlertButton,
  type AlertOptions as RNAlertOptions,
} from 'react-native';

import {
  useAlertStore,
  type AlertConfig,
  type AlertType,
} from '../store/useAlertStore';

export const showFintechAlert = (config: AlertConfig): void => {
  useAlertStore.getState().showAlert(config);
};

export const hideFintechAlert = (): void => {
  useAlertStore.getState().hideAlert();
};

/**
 * Redireciona o Alert.alert nativo do React Native para renderizar o popup Fintech Premium
 */
export const setupFintechAlert = (): void => {
  Alert.alert = (
    title: string,
    message?: string,
    buttons?: RNAlertButton[],
    _options?: RNAlertOptions
  ) => {
    let type: AlertType = 'default';
    const lowerTitle = (title || '').toLowerCase();
    const lowerMsg = (message || '').toLowerCase();

    const hasDestructive = buttons?.some((b) => b.style === 'destructive');

    if (
      hasDestructive ||
      lowerTitle.includes('excluir') ||
      lowerTitle.includes('apagar') ||
      lowerTitle.includes('remover') ||
      lowerTitle.includes('limpar')
    ) {
      type = 'destructive';
    } else if (
      lowerTitle.includes('bem-vindo') ||
      lowerTitle.includes('sucesso') ||
      lowerTitle.includes('restaurado') ||
      lowerTitle.includes('pro') ||
      lowerTitle.includes('parabéns') ||
      lowerMsg.includes('liberado')
    ) {
      type = 'success';
    } else if (
      lowerTitle.includes('erro') ||
      lowerTitle.includes('atenção') ||
      lowerTitle.includes('aviso') ||
      lowerTitle.includes('inválid') ||
      lowerTitle.includes('permiss')
    ) {
      type = 'warning';
    }

    useAlertStore.getState().showAlert({
      title: title || '',
      message,
      type,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' }],
    });
  };
};

// Executa o setup automaticamente quando o arquivo é carregado
setupFintechAlert();
