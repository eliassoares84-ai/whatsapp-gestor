import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ensureNightlyAutoBackupTaskRegistration } from '../services/autoBackupBackgroundService';
import { useFinanceStore } from '../store/useFinanceStore';

interface NightlyAutoBackupControlsProps {
  accentColor: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  titleText?: string;
  subtitleText?: string;
  hourLabelText?: string;
  saveButtonText?: string;
  hourPlaceholder?: string;
  boxed?: boolean;
  boxBackgroundColor?: string;
  onInvalidHour?: (title: string, message: string) => void;
}

export const NightlyAutoBackupControls: React.FC<NightlyAutoBackupControlsProps> = ({
  accentColor,
  borderColor,
  textPrimary,
  textSecondary,
  titleText,
  subtitleText,
  hourLabelText,
  saveButtonText,
  hourPlaceholder,
  boxed = false,
  boxBackgroundColor,
  onInvalidHour,
}) => {
  const { t } = useTranslation();
  const {
    nightlyAutoBackupEnabled,
    nightlyAutoBackupHour,
    enableNightlyAutoBackup,
    disableNightlyAutoBackup,
  } = useFinanceStore();

  const [nightlyHourInput, setNightlyHourInput] = useState(String(nightlyAutoBackupHour));

  useEffect(() => {
    setNightlyHourInput(String(nightlyAutoBackupHour));
  }, [nightlyAutoBackupHour]);

  const parseNightlyHour = (value: string): number | null => {
    const parsed = Number.parseInt(value.trim(), 10);

    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 23) {
      return null;
    }

    return parsed;
  };

  const showInvalidHourError = () => {
    const title = t('settings.alerts.invalidValueTitle', { defaultValue: 'Valor inválido' });
    const message = t('settings.alerts.invalidHourMessage', {
      defaultValue: 'Informe uma hora válida entre 0 e 23.',
    });

    onInvalidHour?.(title, message);
  };

  const handleToggleNightlyAutoBackup = (enabled: boolean) => {
    void (async () => {
      if (enabled) {
        const parsedHour = parseNightlyHour(nightlyHourInput) ?? nightlyAutoBackupHour;
        enableNightlyAutoBackup(parsedHour);
        setNightlyHourInput(String(parsedHour));
        await ensureNightlyAutoBackupTaskRegistration(true);
        return;
      }

      disableNightlyAutoBackup();
      await ensureNightlyAutoBackupTaskRegistration(false);
    })();
  };

  const handleSaveNightlyHour = () => {
    const parsedHour = parseNightlyHour(nightlyHourInput);

    if (parsedHour === null) {
      showInvalidHourError();
      return;
    }

    enableNightlyAutoBackup(parsedHour);
    setNightlyHourInput(String(parsedHour));

    if (nightlyAutoBackupEnabled) {
      void ensureNightlyAutoBackupTaskRegistration(true);
    }
  };

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: textPrimary }]}>
            {titleText || t('settings.autoBackupTitle', { defaultValue: 'Backup automático noturno' })}
          </Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            {subtitleText ||
              t('settings.autoBackupSubtitle', {
                defaultValue:
                  'Executa backup diário após o horário definido, quando houver sessão Google ativa.',
              })}
          </Text>
        </View>

        <Switch
          value={nightlyAutoBackupEnabled}
          onValueChange={handleToggleNightlyAutoBackup}
          trackColor={{ false: borderColor, true: `${accentColor}55` }}
          thumbColor={nightlyAutoBackupEnabled ? accentColor : textSecondary}
          ios_backgroundColor={borderColor}
        />
      </View>

      <View style={styles.timeRow}>
        <Text style={[styles.hourLabel, { color: textSecondary }]}>
          {hourLabelText || t('settings.autoBackupHourLabel', { defaultValue: 'Hora (0-23)' })}
        </Text>

        <TextInput
          value={nightlyHourInput}
          onChangeText={setNightlyHourInput}
          keyboardType="numeric"
          maxLength={2}
          style={[styles.hourInput, { color: textPrimary, borderColor }]}
          placeholder={hourPlaceholder || '22'}
          placeholderTextColor={textSecondary}
        />

        <Pressable
          style={[
            styles.saveButton,
            {
              backgroundColor: `${accentColor}22`,
              borderColor: `${accentColor}55`,
            },
          ]}
          onPress={handleSaveNightlyHour}
        >
          <Text style={[styles.saveText, { color: accentColor }]}>
            {saveButtonText || t('settings.saveLimit', { defaultValue: 'Salvar' })}
          </Text>
        </Pressable>
      </View>
    </>
  );

  if (!boxed) {
    return content;
  }

  return (
    <View
      style={[
        styles.box,
        {
          borderColor,
          backgroundColor: boxBackgroundColor,
        },
      ]}
    >
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  hourLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  hourInput: {
    width: 56,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 13,
    fontWeight: '800',
  },
});

export default NightlyAutoBackupControls;
