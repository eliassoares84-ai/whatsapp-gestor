import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Workspace } from '../../types/finance.types';
import { getLocalizedWorkspaceName } from '../../utils/workspaceLocalization';
import { getThemeTokens, sharedTokens } from '../../styles/themes';

interface SettingsWorkspacesSectionProps {
  workspaces: Workspace[];
  theme: 'light' | 'dark';
  onEditWorkspace: (workspace: Workspace) => void;
  onAddWorkspace: () => void;
}

export const SettingsWorkspacesSection: React.FC<SettingsWorkspacesSectionProps> = ({
  workspaces,
  theme,
  onEditWorkspace,
  onAddWorkspace,
}) => {
  const { t } = useTranslation();
  const tokens = getThemeTokens(theme);

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
          {t('settings.workspaces', { defaultValue: 'Espaços de Trabalho' })}
        </Text>
      </View>

      <View style={styles.listContainer}>
        {workspaces.map((workspace) => (
          <View
            key={workspace.id}
            style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}
          >
            <View style={[styles.colorBar, { backgroundColor: workspace.themeColor || tokens.primary }]} />
            <View style={styles.infoBlock}>
              <View style={styles.workspaceNameRow}>
                <Text style={[styles.itemName, { color: tokens.textPrimary }]}>
                  {getLocalizedWorkspaceName(workspace, t)}
                </Text>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        workspace.type === 'business' ? tokens.warningTonal : tokens.primaryTonal,
                      borderColor:
                        workspace.type === 'business' ? tokens.warningTonalBorder : tokens.primaryTonalBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      {
                        color:
                          workspace.type === 'business' ? tokens.warning : tokens.primary,
                      },
                    ]}
                  >
                    {workspace.type === 'business'
                      ? t('workspace.types.business')
                      : t('workspace.types.personal')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemSub, { color: tokens.textSecondary }]}>
                {workspace.creditCards?.length || 0} {t('settings.cards', { defaultValue: 'cartões' })}
              </Text>
            </View>
            <Pressable
              onPress={() => onEditWorkspace(workspace)}
              style={[styles.editButton, { backgroundColor: tokens.surfaceInteractive }]}
              hitSlop={6}
            >
              <MaterialCommunityIcons name="pencil-outline" size={16} color={tokens.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onAddWorkspace}
        style={[styles.addButton, { borderColor: tokens.border, backgroundColor: tokens.surfaceInteractive }]}
      >
        <MaterialCommunityIcons name="plus" size={18} color={tokens.primary} />
        <Text style={[styles.addButtonText, { color: tokens.primary }]}>
          {t('settings.addBusiness', { defaultValue: 'Novo Espaço de Trabalho' })}
        </Text>
      </Pressable>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: 10,
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  listContainer: {
    gap: 10,
    marginBottom: 10,
  },
  card: {
    borderRadius: sharedTokens.radius.card,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  infoBlock: {
    flex: 1,
  },
  workspaceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: sharedTokens.radius.control,
    borderWidth: 1,
    gap: 6,
    marginBottom: 12,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
