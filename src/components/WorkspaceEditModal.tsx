import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';

import type { Workspace } from '../types/finance.types';

const APP_BG = '#0A0A0A';
const CARD_BG = '#121212';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#999999';

const COLOR_PRESETS = [
  '#0A84FF', // Azul
  '#d2ff61', // Verde Neon
  '#FF9500', // Laranja
  '#AF52DE', // Roxo
  '#FF453A', // Vermelho
  '#00C7BE', // Teal
  '#FFD60A', // Amarelo
  '#FF2D55', // Rosa
];

interface WorkspaceEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  workspace?: Workspace;
  onSave: (name: string, themeColor: string, type: 'personal' | 'business') => void;
  onClose: () => void;
}

export const WorkspaceEditModal: React.FC<WorkspaceEditModalProps> = ({
  visible,
  mode,
  workspace,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PRESETS[0] || '#0A84FF');
  const [workspaceType, setWorkspaceType] = useState<'personal' | 'business'>(
    'business'
  );

  useEffect(() => {
    if (mode === 'edit' && workspace) {
      setName(workspace.name);
      setSelectedColor(workspace.themeColor || COLOR_PRESETS[0] || '#0A84FF');
      setWorkspaceType(workspace.type || 'business');
    } else {
      setName('');
      setSelectedColor(COLOR_PRESETS[0] || '#0A84FF');
      setWorkspaceType('business');
    }
  }, [visible, mode, workspace]);

  const handleSave = () => {
    if (!name.trim()) {
      return;
    }

    onSave(name, selectedColor, workspaceType);
  };

  const isValid = name.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: CARD_BG }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: TEXT_PRIMARY }]}>
              {mode === 'create' ? 'Novo Negócio' : 'Editar Ambiente'}
            </Text>
            <Pressable onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={TEXT_SECONDARY}
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* Name Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: TEXT_PRIMARY }]}>
                Nome do Ambiente
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: APP_BG,
                    color: TEXT_PRIMARY,
                    borderColor: selectedColor,
                  },
                ]}
                placeholder="Ex: Indikcon, Snackscoffee..."
                placeholderTextColor={TEXT_SECONDARY}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Workspace Type */}
            {mode === 'create' && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: TEXT_PRIMARY }]}>
                  Tipo de Ambiente
                </Text>
                <View style={styles.typeRow}>
                  <Pressable
                    onPress={() => setWorkspaceType('personal')}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor:
                          workspaceType === 'personal'
                            ? `${selectedColor}20`
                            : `${TEXT_SECONDARY}10`,
                        borderColor:
                          workspaceType === 'personal'
                            ? selectedColor
                            : 'transparent',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="account"
                      size={20}
                      color={
                        workspaceType === 'personal'
                          ? selectedColor
                          : TEXT_SECONDARY
                      }
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        {
                          color:
                            workspaceType === 'personal'
                              ? selectedColor
                              : TEXT_SECONDARY,
                        },
                      ]}
                    >
                      Pessoa Física
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setWorkspaceType('business')}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor:
                          workspaceType === 'business'
                            ? `${selectedColor}20`
                            : `${TEXT_SECONDARY}10`,
                        borderColor:
                          workspaceType === 'business'
                            ? selectedColor
                            : 'transparent',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="briefcase"
                      size={20}
                      color={
                        workspaceType === 'business'
                          ? selectedColor
                          : TEXT_SECONDARY
                      }
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        {
                          color:
                            workspaceType === 'business'
                              ? selectedColor
                              : TEXT_SECONDARY,
                        },
                      ]}
                    >
                      Pessoa Jurídica
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Color Selection */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: TEXT_PRIMARY }]}>
                Cor do Tema
              </Text>
              <View style={styles.colorGrid}>
                {COLOR_PRESETS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    style={[
                      styles.colorPill,
                      {
                        backgroundColor: color,
                        borderWidth: selectedColor === color ? 3 : 0,
                        borderColor: TEXT_PRIMARY,
                      },
                    ]}
                  >
                    {selectedColor === color && (
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color={color === '#FFD60A' ? '#000' : TEXT_PRIMARY}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              style={[
                styles.saveButton,
                {
                  backgroundColor: isValid ? selectedColor : TEXT_SECONDARY,
                  opacity: isValid ? 1 : 0.5,
                },
              ]}
              onPress={handleSave}
              disabled={!isValid}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: selectedColor === '#FFD60A' ? '#000' : '#FFF',
                }}
              >
                Salvar
              </Text>
            </Pressable>

            <Pressable
              style={[styles.cancelButton, { borderColor: TEXT_SECONDARY }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: TEXT_SECONDARY }]}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 20,
    maxHeight: '80%',
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 2,
    gap: 6,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorPill: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 10,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
