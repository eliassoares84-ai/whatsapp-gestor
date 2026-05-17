import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FastEntryModal } from '../components/FastEntryModal';
import { TransferModal } from '../components/TransferModal';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { useFinanceStore } from '../store/useFinanceStore';

const APP_BG = '#0A0A0A';
const CARD_BG = '#121212';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#999999';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const getCategoryIcon = (categoryId: string): IconName => {
  if (categoryId.includes('alimentacao')) return 'food';
  if (categoryId.includes('transporte')) return 'car';
  if (categoryId.includes('transfer')) return 'swap-horizontal';
  return 'tag';
};

export const DashboardScreen: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [fabLayout, setFabLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [workspaceSelectorLayout, setWorkspaceSelectorLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const insets = useSafeAreaInsets();
  const workspaceSelectorRef = useRef<View>(null);

  const fabBottomOffset = 110 + insets.bottom;
  const scrollBottomPadding = fabBottomOffset + 32;

  const {
    currentWorkspaceId,
    workspaces,
    transactions,
    setWorkspace,
    hasCompletedOnboarding,
    hasSeenTutorial,
  } = useFinanceStore();

  const currentWorkspace = workspaces.find((ws) => ws.id === currentWorkspaceId);
  const workspaceColor = currentWorkspace?.themeColor || '#0A84FF';
  const canTransferBetweenWorkspaces = workspaces.length > 1;

  // Compute FAB position from state
  const fabPosition = {
    x: Dimensions.get('window').width - 54,
    y: Dimensions.get('window').height - fabBottomOffset - 30,
    size: 60,
  };

  const shouldShowTutorial = hasCompletedOnboarding && !hasSeenTutorial;

  // Filter transactions by workspace
  const workspaceTransactions = useMemo(() => {
    return transactions.filter((t) => t.workspaceId === currentWorkspaceId);
  }, [transactions, currentWorkspaceId]);

  // Calculate balance
  const { balance, expenses } = useMemo(() => {
    const income = workspaceTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = workspaceTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const transferNet = workspaceTransactions
      .filter((t) => t.type === 'transfer')
      .reduce((sum, t) => {
        const isIncomingTransfer = t.note?.startsWith('Origem:');
        return sum + (isIncomingTransfer ? t.amount : -t.amount);
      }, 0);

    return {
      balance: income - expense + transferNet,
      expenses: expense,
    };
  }, [workspaceTransactions]);

  // Sort transactions by date (most recent first)
  const sortedTransactions = useMemo(() => {
    return [...workspaceTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [workspaceTransactions]);

  const formatCurrency = (value: number): string => {
    return `R$ ${Math.abs(value).toFixed(2).replace('.', ',')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View
        style={[styles.emptyIcon, { backgroundColor: `${workspaceColor}15` }]}
      >
        <MaterialCommunityIcons
          name="wallet-outline"
          size={56}
          color={workspaceColor}
        />
      </View>

      <Text style={[styles.emptyTitle, { color: TEXT_PRIMARY }]}>
        Nenhuma movimentação ainda
      </Text>

      <Text style={[styles.emptySubtitle, { color: TEXT_SECONDARY }]}>
        Toque no botão + abaixo para registrar seu primeiro recebimento ou
        despesa usando texto ou voz.
      </Text>
    </View>
  );

  const renderTransactionItem = ({
    item,
  }: {
    item: typeof workspaceTransactions[0];
  }) => {
    const isTransfer = item.type === 'transfer';
    const isIncome = item.type === 'income';
    const color = isTransfer ? '#E6E6E6' : isIncome ? '#d2ff61' : '#FF453A';
    const sign = isTransfer ? '' : isIncome ? '+' : '−';
    const categoryIcon = isTransfer
      ? 'swap-horizontal'
      : getCategoryIcon(item.categoryId);
    const transferLabel = item.note?.startsWith('Origem:')
      ? item.note
      : item.note?.startsWith('Transferência:')
        ? item.note
        : 'Transferência interna';
    const primaryLabel = isTransfer
      ? transferLabel
      : item.note || item.categoryId;

    return (
      <View
        style={[styles.transactionItem, { backgroundColor: CARD_BG }]}
      >
        <View
          style={[
            styles.categoryIconBg,
            { backgroundColor: `${color}15` },
          ]}
        >
          <MaterialCommunityIcons
            name={categoryIcon}
            size={20}
            color={color}
          />
        </View>

        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionLabel, { color: TEXT_PRIMARY }]}>
            {primaryLabel}
          </Text>
          <Text style={[styles.transactionDate, { color: TEXT_SECONDARY }]}>
            {formatDate(item.date)}
          </Text>
        </View>

        <Text style={[styles.transactionAmount, { color }]}>
          {sign}
          {formatCurrency(item.amount)}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: APP_BG, paddingTop: insets.top }]}>
      {/* Header: Workspace Selector */}
      <View
        ref={workspaceSelectorRef}
        onLayout={(event) => {
          setWorkspaceSelectorLayout(event.nativeEvent.layout);
        }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.workspacePills}
            style={styles.workspaceScroll}
          >
            {workspaces.map((ws) => {
              const isActive = ws.id === currentWorkspaceId;
              return (
                <Pressable
                  key={ws.id}
                  onPress={() => setWorkspace(ws.id)}
                  style={[
                    styles.workspacePill,
                    {
                      backgroundColor: isActive ? ws.themeColor : CARD_BG,
                      borderColor: isActive ? ws.themeColor : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.workspacePillText,
                      {
                        color: isActive
                          ? ws.themeColor === '#FFD60A'
                            ? '#000'
                            : '#FFF'
                          : TEXT_SECONDARY,
                      },
                    ]}
                  >
                    {ws.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {canTransferBetweenWorkspaces ? (
            <Pressable
              onPress={() => setIsTransferModalVisible(true)}
              style={styles.transferButton}
            >
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={22}
                color={workspaceColor}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Scroll Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomPadding },
        ]}
      >
        {/* Liquidity Panel */}
        <View style={styles.liquidityPanel}>
          {/* Current Balance Card */}
          <View
            style={[
              styles.liquidityCard,
              {
                backgroundColor: CARD_BG,
                borderColor: workspaceColor,
              },
            ]}
          >
            <Text style={[styles.cardLabel, { color: TEXT_SECONDARY }]}>
              Saldo Atual
            </Text>
            <View style={styles.amountRow}>
              <Text
                style={[
                  styles.largeAmount,
                  {
                    color: balance >= 0 ? '#d2ff61' : '#FF453A',
                  },
                ]}
              >
                {balance >= 0 ? '+' : '−'}
              </Text>
              <Text
                style={[
                  styles.largeAmount,
                  {
                    color: balance >= 0 ? '#d2ff61' : '#FF453A',
                  },
                ]}
              >
                {formatCurrency(balance)}
              </Text>
            </View>
          </View>

          {/* Next Due Card */}
          <View
            style={[
              styles.liquidityCard,
              {
                backgroundColor: CARD_BG,
                borderColor: workspaceColor,
              },
            ]}
          >
            <Text style={[styles.cardLabel, { color: TEXT_SECONDARY }]}>
              Despesas Próximos 15d
            </Text>
            <View style={styles.amountRow}>
              <Text style={[styles.largeAmount, { color: '#FF453A' }]}>
                −
              </Text>
              <Text style={[styles.largeAmount, { color: '#FF453A' }]}>
                {formatCurrency(expenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* Transactions or Empty State */}
        {sortedTransactions.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.transactionsSection}>
            <Text style={[styles.sectionTitle, { color: TEXT_PRIMARY }]}>
              Últimas Movimentações
            </Text>

            <FlatList
              data={sortedTransactions}
              renderItem={renderTransactionItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.transactionsList}
            />
          </View>
        )}
      </ScrollView>

      {/* FAB (Floating Action Button) */}
      <Pressable
        style={[
          styles.fab,
          {
            backgroundColor: workspaceColor,
            bottom: fabBottomOffset,
          },
        ]}
        onPress={() => setIsModalVisible(true)}
      >
        <MaterialCommunityIcons
          name="plus"
          size={28}
          color={workspaceColor === '#FFD60A' ? '#000' : '#FFF'}
        />
      </Pressable>

      {/* FastEntryModal */}
      <FastEntryModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />

      <TransferModal
        visible={isTransferModalVisible}
        onClose={() => setIsTransferModalVisible(false)}
      />

      {/* Tutorial Overlay */}
      {shouldShowTutorial && (
        <TutorialOverlay
          fabPosition={fabPosition}
          workspaceSelectorPosition={workspaceSelectorLayout}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workspaceScroll: {
    flex: 1,
  },
  workspacePills: {
    gap: 10,
  },
  workspacePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  workspacePillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  transferButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  liquidityPanel: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  liquidityCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  largeAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  transactionsSection: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  transactionsList: {
    gap: 10,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  categoryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    fontWeight: '400',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    marginBottom: 0,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
