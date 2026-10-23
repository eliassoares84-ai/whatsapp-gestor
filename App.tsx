import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Appearance,
  AppState,
  StatusBar,
  Text,
  View,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import { LockScreen } from './src/screens/LockScreen';
import { PremiumCopilotTooltip } from './src/components/PremiumCopilotTooltip';
import { deepLinkService } from './src/services/deepLinkService';
import './src/i18n';
import { ensureNightlyAutoBackupTaskRegistration } from './src/services/autoBackupBackgroundService';
import {
  scheduleCreditCardReminders,
  scheduleRecurringReminders,
} from './src/services/notificationService';
import './src/services/alertService';
import { FintechAlertModal } from './src/components/common/FintechAlertModal';
import { useFinanceStore, useThemeStore } from './src/store/useFinanceStore';
import { lightTheme, darkTheme, darkTokens, lightTokens } from './src/styles/themes';
import { CopilotProvider } from './src/utils/copilotSafe';

// Trava global para impedir que o Android feche o app caso ocorra erro não tratado no JS
if (typeof (global as any).ErrorUtils !== 'undefined') {
  const defaultHandler = (global as any).ErrorUtils.getGlobalHandler();
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.error('GLOBAL_ERROR_TRAPPED:', error);
    if (typeof defaultHandler === 'function') {
      defaultHandler(error, false);
    }
  });
}

class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CRASH_PREVENTED:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: '#0A0A0A',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Text style={{ color: '#FF453A', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
            Ops! Falha ao iniciar
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
            {this.state.error?.message || 'Erro inesperado na inicialização.'}
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 11, textAlign: 'left' }}>
            {this.state.error?.stack?.slice(0, 500) || ''}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const roundedSvgMaskPath = ({
  size,
  position,
  canvasSize,
}: {
  size: any;
  position: any;
  canvasSize: any;
}) => {
  const x = Number(position?.x?._value ?? 0);
  const y = Number(position?.y?._value ?? 0);
  const w = Number(size?.x?._value ?? 0);
  const h = Number(size?.y?._value ?? 0);
  const r = Math.max(0, Math.min(16, w / 2, h / 2));

  return `M0,0H${canvasSize.x}V${canvasSize.y}H0V0ZM${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x + r}Q${x},${y + h} ${x},${y + h - r}V${y + r}Q${x},${y} ${x + r},${y}Z`;
};

const LOCK_GRACE_PERIOD_MS = 3_000;

export default function App() {
  const { t } = useTranslation();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundAtRef = useRef<number | null>(null);
  
  const theme = useThemeStore((state) => state.theme);
  const syncThemeWithSystem = useThemeStore((state) => state.syncThemeWithSystem);
  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;

  // TRAVA DE HIDRATAÇÃO: Lê se o banco de dados já terminou de carregar
  const hasHydrated = useFinanceStore((state) => state.hasHydrated);
  const nightlyAutoBackupEnabled = useFinanceStore((state) => state.nightlyAutoBackupEnabled);
  const workspaces = useFinanceStore((state) => state.workspaces);
  const recurringTemplates = useFinanceStore((state) => state.recurringTemplates);

  useEffect(() => {
    deepLinkService.init();
  }, []);

  useEffect(() => {
    syncThemeWithSystem();

    const appearanceSubscription = Appearance.addChangeListener(() => {
      syncThemeWithSystem();
    });

    return () => {
      appearanceSubscription.remove();
    };
  }, [syncThemeWithSystem]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    void ensureNightlyAutoBackupTaskRegistration(nightlyAutoBackupEnabled).catch(() => {});
    void scheduleCreditCardReminders(workspaces).catch(() => {});
    void scheduleRecurringReminders(recurringTemplates).catch(() => {});
  }, [hasHydrated, nightlyAutoBackupEnabled, workspaces, recurringTemplates]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      const wasInBackground = prevState === 'background' || prevState === 'inactive';

      // Registra o momento em que o app saiu do foco (inactive = tela bloqueada ou troca de app)
      if (nextState === 'background' || nextState === 'inactive') {
        if (backgroundAtRef.current === null) {
          backgroundAtRef.current = Date.now();
        }
      }

      if (nextState === 'active') {
        const backgroundAt = backgroundAtRef.current;
        const elapsed = backgroundAt !== null ? Date.now() - backgroundAt : Number.MAX_SAFE_INTEGER;

        if (wasInBackground && elapsed > LOCK_GRACE_PERIOD_MS) {
          setIsUnlocked(false);
        }

        // Reseta o timer ao voltar ao foco
        backgroundAtRef.current = null;
      }

      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const tokens = theme === 'dark' ? darkTokens : lightTokens;
  const navTheme = theme === 'dark'
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: tokens.background, card: tokens.backgroundElevated } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: tokens.background, card: tokens.backgroundElevated } };

  // SE NÃO TERMINOU DE CARREGAR A MEMÓRIA, SEGURE A RENDERIZAÇÃO
  if (!hasHydrated) {
    return <View style={{ flex: 1, backgroundColor: tokens.background }} />;
  }

  return (
    <GlobalErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={tokens.background} />
        <View style={{ backgroundColor: tokens.background, flex: 1 }}>
          <NavigationContainer theme={navTheme}>
            <CopilotProvider
              overlay="svg"
              androidStatusBarVisible={true}
              svgMaskPath={roundedSvgMaskPath}
              animated
              backdropColor={theme === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(16, 24, 40, 0.55)'}
              arrowColor={tokens.card}
              tooltipComponent={PremiumCopilotTooltip}
              tooltipStyle={{
                backgroundColor: 'transparent',
                padding: 0,
              }}
              labels={{
                next: t('tour.tooltip.next'),
                skip: t('tour.tooltip.skip'),
                finish: t('tour.tooltip.finish'),
                previous: t('tour.tooltip.previous'),
              }}
            >
              {isUnlocked ? <AppNavigator /> : <LockScreen onUnlockSuccess={() => setIsUnlocked(true)} />}
            </CopilotProvider>
          </NavigationContainer>
          <FintechAlertModal />
        </View>
      </SafeAreaProvider>
    </GlobalErrorBoundary>
  );
}