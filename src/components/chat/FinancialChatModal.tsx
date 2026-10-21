import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useChatStore } from '../../store/useChatStore';
import { useThemeStore } from '../../store/useFinanceStore';
import { getThemeTokens, sharedTokens } from '../../styles/themes';
import type { ChatMessage, UserFinancialContext } from '../../services/financialChatService';

interface FinancialChatModalProps {
  visible: boolean;
  onClose: () => void;
  userContext?: UserFinancialContext;
}

const QUICK_SUGGESTIONS = [
  'SAC vs Price no Financiamento',
  'Holding Familiar: quando compensa?',
  'PGBL ou VGBL para meu IR?',
  'Tesouro Selic vs CDB 110%',
  'Consórcio vs Investir o valor',
  'Financiar veículo ou comprar à vista?',
  'Como montar carteira de dividendos?',
  'Seguro de vida resgatável vale a pena?',
];

const formatMessageTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Renderizador de texto simples com suporte a negrito (**texto**) e tópicos
 */
const FormattedMessageText: React.FC<{ text: string; textColor: string }> = ({
  text,
  textColor,
}) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <Text style={[styles.messageBody, { color: textColor }]}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={index} style={styles.boldText}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

export const FinancialChatModal: React.FC<FinancialChatModalProps> = ({
  visible,
  onClose,
  userContext,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);

  const { messages, isThinking, sendMessage, clearHistory } = useChatStore();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [visible, messages.length, isThinking]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isThinking) {
      return;
    }

    setInputText('');
    Keyboard.dismiss();
    await sendMessage(query, userContext);
  };

  const handleClearChat = () => {
    Alert.alert(
      'Nova conversa',
      'Deseja reiniciar a conversa com o Consultor Financeiro CFP®?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: () => clearHistory(),
        },
      ]
    );
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAssistant,
        ]}
      >
        {!isUser && (
          <View style={[styles.avatarBubble, { backgroundColor: tokens.primaryTonal, borderColor: tokens.border }]}>
            <MaterialCommunityIcons name="headset" size={16} color={tokens.primary} />
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: tokens.primary }]
              : [styles.assistantBubble, { backgroundColor: tokens.card, borderColor: tokens.border }],
          ]}
        >
          {!isUser && (
            <View style={styles.advisorHeaderInBubble}>
              <Text style={[styles.advisorNameText, { color: tokens.primary }]}>
                Consultor CFP®
              </Text>
            </View>
          )}

          <FormattedMessageText
            text={item.text}
            textColor={isUser ? '#FFFFFF' : tokens.textPrimary}
          />

          <Text
            style={[
              styles.messageTime,
              { color: isUser ? 'rgba(255,255,255,0.7)' : tokens.textTertiary },
            ]}
          >
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: tokens.background }]}>
        {/* Header do Chat */}
        <View style={[styles.header, { backgroundColor: tokens.card, borderBottomColor: tokens.border }]}>
          <Pressable
            style={[styles.headerButton, { backgroundColor: tokens.surfaceInteractive }]}
            onPress={onClose}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="chevron-down" size={24} color={tokens.textPrimary} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <View style={styles.titleWithBadge}>
              <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
                Consultor Financeiro
              </Text>
              <View style={[styles.headerCfpBadge, { backgroundColor: tokens.primary }]}>
                <Text style={styles.headerCfpBadgeText}>CFP®</Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: tokens.positive }]} />
              <Text style={[styles.headerSubtitle, { color: tokens.textSecondary }]}>
                Especialista Online • Mercado & Patrimônio
              </Text>
            </View>
          </View>

          <Pressable
            style={[styles.headerButton, { backgroundColor: tokens.surfaceInteractive }]}
            onPress={handleClearChat}
            hitSlop={8}
            accessibilityLabel="Reiniciar conversa"
          >
            <MaterialCommunityIcons name="refresh" size={20} color={tokens.textSecondary} />
          </Pressable>
        </View>

        {/* Sugestões Rápidas de Tópicos */}
        <View style={[styles.suggestionsContainer, { borderBottomColor: tokens.divider }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {QUICK_SUGGESTIONS.map((topic, index) => (
              <Pressable
                key={index}
                style={[
                  styles.suggestionChip,
                  { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border },
                ]}
                onPress={() => void handleSend(topic)}
              >
                <MaterialCommunityIcons name="lightning-bolt" size={13} color={tokens.primary} />
                <Text style={[styles.suggestionText, { color: tokens.textPrimary }]}>
                  {topic}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Lista de Mensagens */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
          style={styles.chatArea}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={[
              styles.messagesList,
              { paddingBottom: 16 },
            ]}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={
              isThinking ? (
                <View style={[styles.messageRow, styles.messageRowAssistant]}>
                  <View style={[styles.avatarBubble, { backgroundColor: tokens.primaryTonal, borderColor: tokens.border }]}>
                    <MaterialCommunityIcons name="headset" size={16} color={tokens.primary} />
                  </View>
                  <View style={[styles.assistantBubble, styles.thinkingBubble, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
                    <ActivityIndicator size="small" color={tokens.primary} />
                    <Text style={[styles.thinkingText, { color: tokens.textSecondary }]}>
                      Consultor CFP® analisando...
                    </Text>
                  </View>
                </View>
              ) : null
            }
          />

          {/* Barra de Entrada de Texto */}
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: tokens.card,
                borderTopColor: tokens.border,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <TextInput
              style={[
                styles.inputField,
                {
                  backgroundColor: tokens.surfaceInteractive,
                  borderColor: tokens.border,
                  color: tokens.textPrimary,
                },
              ]}
              placeholder="Pergunte sobre investimentos, financiamento, IR..."
              placeholderTextColor={tokens.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />

            <Pressable
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim().length > 0 ? tokens.primary : tokens.surfaceInteractive,
                },
              ]}
              onPress={() => void handleSend()}
              disabled={inputText.trim().length === 0 || isThinking}
            >
              <MaterialCommunityIcons
                name="arrow-up"
                size={22}
                color={inputText.trim().length > 0 ? '#FFFFFF' : tokens.textTertiary}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerCfpBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  headerCfpBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  suggestionsContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  avatarBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  advisorHeaderInBubble: {
    marginBottom: 4,
  },
  advisorNameText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  boldText: {
    fontWeight: '700',
  },
  messageTime: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  thinkingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  inputField: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: sharedTokens.radius.control,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
