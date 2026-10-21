import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const CARD_BG = '#121212';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#999999';
const ACCENT_BLUE = '#0A84FF';

interface ExportReportModalProps {
  visible: boolean;
  onClose: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  workspaceColor?: string;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  visible,
  onClose,
  onExportPDF,
  onExportCSV,
  workspaceColor = ACCENT_BLUE,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: CARD_BG }]}>  
          <View style={styles.header}>
            <MaterialCommunityIcons name="file-export" size={28} color={workspaceColor} />
            <Text style={[styles.title, { color: TEXT_PRIMARY }]}>{t('reports.exportReport')}</Text>
          </View>
          <Text style={[styles.subtitle, { color: TEXT_SECONDARY }]}>{t('reports.exportChooseFormat')}</Text>

          <Pressable style={[styles.button, { borderColor: workspaceColor }]} onPress={onExportPDF}>
            <Text style={[styles.buttonText, { color: workspaceColor }]}>{t('reports.exportAsPdf')}</Text>
          </Pressable>
          <Pressable style={[styles.button, { borderColor: workspaceColor }]} onPress={onExportCSV}>
            <Text style={[styles.buttonText, { color: workspaceColor }]}>{t('reports.exportAsCsv')}</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={[styles.cancelButtonText, { color: TEXT_SECONDARY }]}>{t('settings.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 14,
    marginBottom: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginTop: 2,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
