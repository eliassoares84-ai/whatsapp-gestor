import Constants from 'expo-constants';

import type { RecurringTemplate } from '../types/finance.types';

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

  if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return Boolean(requested.granted);
};

export const scheduleRecurringReminders = async (
  templates: RecurringTemplate[]
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
            body: `Lembrete: Sua conta de ${template.note} vence hoje no valor de R$ ${template.amount
              .toFixed(2)
              .replace('.', ',')}`,
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

export const notifyRecurringDueNow = async (
  note: string,
  amount: number
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
        title: 'Lembrete de vencimento',
        body: `Lembrete: Sua conta de ${note} vence hoje no valor de R$ ${amount
          .toFixed(2)
          .replace('.', ',')}`,
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