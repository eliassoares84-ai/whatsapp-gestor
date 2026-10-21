import type { Workspace } from '../../types/finance.types';

const mockCancelScheduledNotificationAsync = jest.fn().mockResolvedValue(undefined);
const mockScheduleNotificationAsync = jest.fn().mockResolvedValue('notif-id-123');
const mockGetAllScheduledNotificationsAsync = jest.fn().mockResolvedValue([]);
const mockGetPermissionsAsync = jest.fn().mockResolvedValue({ granted: true });
const mockRequestPermissionsAsync = jest.fn().mockResolvedValue({ granted: true });

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone',
  },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'pt-BR', currencyCode: 'BRL' }],
}));

jest.mock('expo-notifications', () => ({
  __esModule: true,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  SchedulableTriggerInputTypes: {
    MONTHLY: 'monthly',
  },
}));

// Mock react-native and storage dependencies
jest.mock('react-native', () => ({
  Appearance: { getColorScheme: () => 'dark', addChangeListener: () => ({ remove: jest.fn() }) },
  Alert: { alert: jest.fn() },
}));

jest.mock('../../storage/asyncStorageAdapter', () => ({
  financeStorageAdapter: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

import {
  scheduleCreditCardReminders,
  scheduleRecurringReminders,
  notifyBudgetThreshold,
} from '../notificationService';

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([]);
  });

  describe('scheduleCreditCardReminders', () => {
    it('cancels existing card notifications and schedules due date, due soon, and closing date notifications', async () => {
      mockGetAllScheduledNotificationsAsync.mockResolvedValueOnce([
        { identifier: 'old-1', content: { data: { kind: 'creditCardDue' } } },
        { identifier: 'old-2', content: { data: { kind: 'creditCardClosing' } } },
        { identifier: 'keep-1', content: { data: { kind: 'other' } } },
      ]);

      const mockWorkspaces: Workspace[] = [
        {
          id: 'ws-1',
          name: 'Principal',
          type: 'personal',
          themeColor: '#0A84FF',
          creditCards: [
            {
              id: 'card-nubank',
              name: 'Nubank Ultravioleta',
              limit: 5000,
              availableLimit: 3000,
              closingDay: 10,
              dueDay: 17,
              themeColor: '#820AD1',
            },
          ],
        },
      ];

      await scheduleCreditCardReminders(mockWorkspaces);

      // Should cancel only credit card notifications
      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('old-1');
      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('old-2');

      // Should schedule: 1 (due day) + 1 (2 days before) + 1 (closing day) = 3 notifications
      expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(3);

      const calls = mockScheduleNotificationAsync.mock.calls;
      const scheduledKinds = calls.map((c: any) => c[0].content.data.kind);
      expect(scheduledKinds).toContain('creditCardDue');
      expect(scheduledKinds).toContain('creditCardDueSoon');
      expect(scheduledKinds).toContain('creditCardClosing');

      // Check due day trigger
      const dueCall = calls.find((c: any) => c[0].content.data.kind === 'creditCardDue');
      expect(dueCall[0].trigger).toEqual({
        type: 'monthly',
        day: 17,
        hour: 9,
        minute: 0,
      });

      // Check due soon trigger (17 - 2 = 15)
      const dueSoonCall = calls.find((c: any) => c[0].content.data.kind === 'creditCardDueSoon');
      expect(dueSoonCall[0].trigger).toEqual({
        type: 'monthly',
        day: 15,
        hour: 10,
        minute: 0,
      });

      // Check closing trigger (10)
      const closingCall = calls.find((c: any) => c[0].content.data.kind === 'creditCardClosing');
      expect(closingCall[0].trigger).toEqual({
        type: 'monthly',
        day: 10,
        hour: 8,
        minute: 30,
      });
    });

    it('does not schedule when card list is empty', async () => {
      await scheduleCreditCardReminders([]);
      expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('notifyBudgetThreshold', () => {
    it('schedules an immediate warning notification when threshold is reached', async () => {
      await notifyBudgetThreshold('Alimentação', 80);

      expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Atenção de orçamento',
            body: expect.stringContaining('80%'),
            data: { kind: 'budgetThreshold', threshold: 80 },
          }),
          trigger: null,
        })
      );
    });
  });
});
