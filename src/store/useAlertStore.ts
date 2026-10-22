import { create } from 'zustand';

export interface AlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
  isPreferred?: boolean;
}

export type AlertType = 'default' | 'success' | 'destructive' | 'warning' | 'info';

export interface AlertConfig {
  title: string;
  message?: string;
  type?: AlertType;
  icon?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

interface AlertState {
  visible: boolean;
  config: AlertConfig | null;
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  config: null,
  showAlert: (config: AlertConfig) => {
    set({
      visible: true,
      config: {
        ...config,
        buttons:
          config.buttons && config.buttons.length > 0
            ? config.buttons.map((b) => ({ ...b, text: b.text || 'OK' }))
            : [{ text: 'OK', style: 'default' }],
      },
    });
  },
  hideAlert: () => {
    set({ visible: false, config: null });
  },
}));
