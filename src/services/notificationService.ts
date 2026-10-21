import Constants from 'expo-constants';

import { useFinanceStore } from '../store/useFinanceStore';
import type { CreditCard, RecurringTemplate, Workspace } from '../types/finance.types';
import { formatCurrency } from '../utils/formatters';

type NotificationsModule = typeof import('expo-notifications');

let cachedNotificationsModule: NotificationsModule | null = null;

const getNotificationsModule = async (): Promise<NotificationsModule | null> => {
  if (Constants.appOwnership === 'expo') {
    return null;
  }

  if (cachedNotificationsModule) {
    return cachedNotificationsModule;
  }

  try {
    const module = await import('expo-notifications');
    cachedNotificationsModule = module;
    return module;
  } catch {
    return null;
  }
};

const ensurePermissions = async (): Promise<boolean> => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return false;
  }

  const existing = await Notifications.getPermissionsAsync();

  if (
    existing.granted ||
    (Notifications.IosAuthorizationStatus &&
      existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)
  ) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return Boolean(requested.granted);
};

export const scheduleRecurringReminders = async (
  templates: RecurringTemplate[]
): Promise<void> => {
  try {
    const { currency } = useFinanceStore.getState();
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return;
    }

    const granted = await ensurePermissions();
    if (!granted) {
      return;
    }

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const recurringScheduled = scheduled.filter(
      (item) => item.content.data?.kind === 'recurringDue'
    );

    await Promise.all(
      recurringScheduled.map((item) =>
        Notifications.cancelScheduledNotificationAsync(item.identifier)
      )
    );

    const activeTemplates = templates.filter((template) => template.isActive);

    await Promise.all(
      activeTemplates.map((template) =>
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Lembrete de vencimento',
            body: `Lembrete: Sua conta de ${template.note} vence hoje no valor de ${formatCurrency(template.amount, currency, 'pt-BR', true)}`,
            data: {
              kind: 'recurringDue',
              templateId: template.id,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
            day: Math.max(1, Math.min(31, template.dayOfMonth)),
            hour: 9,
            minute: 0,
          },
        })
      )
    );
  } catch {
    // Silent fail by design for MVP UX.
  }
};

export const scheduleCreditCardReminders = async (
  workspaces: Workspace[]
): Promise<void> => {
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return;
    }

    const granted = await ensurePermissions();
    if (!granted) {
      return;
    }

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const cardScheduled = scheduled.filter(
      (item) =>
        item.content.data?.kind === 'creditCardDue' ||
        item.content.data?.kind === 'creditCardClosing' ||
        item.content.data?.kind === 'creditCardDueSoon'
    );

    await Promise.all(
      cardScheduled.map((item) =>
        Notifications.cancelScheduledNotificationAsync(item.identifier)
      )
    );

    const allCards: Array<{ card: CreditCard; workspaceName: string }> = [];
    for (const ws of workspaces) {
      for (const card of ws.creditCards || []) {
        allCards.push({ card, workspaceName: ws.name });
      }
    }

    const promises: Promise<unknown>[] = [];

    for (const { card } of allCards) {
      // 1. Lembrete no dia do vencimento (09:00)
      if (card.dueDay >= 1 && card.dueDay <= 31) {
        promises.push(
          Notifications.scheduleNotificationAsync({
            content: {
              title: '💳 Fatura Vence Hoje!',
              body: `A fatura do cartão "${card.name}" vence hoje. Não esqueça de realizar o pagamento para evitar juros.`,
              data: {
                kind: 'creditCardDue',
                cardId: card.id,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
              day: card.dueDay,
              hour: 9,
              minute: 0,
            },
          })
        );

        // 2. Lembrete 2 dias antes do vencimento (10:00)
        const dueSoonDay = card.dueDay > 2 ? card.dueDay - 2 : (card.dueDay === 2 ? 30 : 29);
        promises.push(
          Notifications.scheduleNotificationAsync({
            content: {
              title: '⏰ Fatura Vencendo em Breve',
              body: `A fatura do cartão "${card.name}" vence em 2 dias (dia ${card.dueDay}). Prepare o pagamento!`,
              data: {
                kind: 'creditCardDueSoon',
                cardId: card.id,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
              day: dueSoonDay,
              hour: 10,
              minute: 0,
            },
          })
        );
      }

      // 3. Lembrete no dia de fechamento (08:30)
      if (card.closingDay >= 1 && card.closingDay <= 31) {
        promises.push(
          Notifications.scheduleNotificationAsync({
            content: {
              title: '📅 Fechamento de Fatura',
              body: `A fatura de "${card.name}" fecha hoje (dia ${card.closingDay}). Compras a partir de hoje caem na próxima fatura!`,
              data: {
                kind: 'creditCardClosing',
                cardId: card.id,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
              day: card.closingDay,
              hour: 8,
              minute: 30,
            },
          })
        );
      }
    }

    await Promise.all(promises);
  } catch {
    // Silent fail by design for MVP UX.
  }
};

export const notifyRecurringDueNow = async (
  note: string,
  amount: number
): Promise<void> => {
  try {
    const { currency } = useFinanceStore.getState();
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return;
    }

    const granted = await ensurePermissions();
    if (!granted) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Lembrete de vencimento',
        body: `Lembrete: Sua conta de ${note} vence hoje no valor de ${formatCurrency(amount, currency, 'pt-BR', true)}`,
        data: {
          kind: 'recurringDueNow',
        },
      },
      trigger: null,
    });
  } catch {
    // Silent fail by design for MVP UX.
  }
};

export const notifyBudgetThreshold = async (
  categoryName: string,
  threshold: 80 | 100
): Promise<void> => {
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return;
    }

    const granted = await ensurePermissions();
    if (!granted) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Atenção de orçamento',
        body: `Atenção: Você atingiu ${threshold}% do seu orçamento para ${categoryName}`,
        data: {
          kind: 'budgetThreshold',
          threshold,
        },
      },
      trigger: null,
    });
  } catch {
    // Silent fail by design for MVP UX.
  }
};