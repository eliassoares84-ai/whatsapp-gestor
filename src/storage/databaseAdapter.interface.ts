import type { Account, Category, CreditCard, RecurringTemplate, Transaction, Workspace } from '../types/finance.types';

/**
 * Contrato de repositório para transações financeiras.
 * Prepara o aplicativo para consultas indexadas por mês/data no SQLite,
 * sem necessidade de carregar 10.000 itens em memória.
 */
export interface ITransactionRepository {
  findMonthly(workspaceId: string, year: number, month: number): Promise<Transaction[]>;
  findById(id: string): Promise<Transaction | null>;
  save(transaction: Transaction): Promise<void>;
  saveBatch(transactions: Transaction[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteGroup(installmentGroupId: string): Promise<void>;
}

/**
 * Contrato de repositório para contas bancárias.
 */
export interface IAccountRepository {
  findAll(workspaceId: string): Promise<Account[]>;
  findById(id: string): Promise<Account | null>;
  updateBalance(id: string, delta: number): Promise<void>;
}

/**
 * Contrato de repositório para cartões de crédito.
 */
export interface ICreditCardRepository {
  findAll(workspaceId: string): Promise<CreditCard[]>;
  updateAvailableLimit(id: string, delta: number): Promise<void>;
}

/**
 * Contrato principal do banco de dados local offline-first.
 * Garante operações atômicas (transações ACID) para transferências e faturas.
 */
export interface IOfflineDatabase {
  initialize(): Promise<void>;
  runTransaction<T>(operation: () => Promise<T>): Promise<T>;
  transactions: ITransactionRepository;
  accounts: IAccountRepository;
  creditCards: ICreditCardRepository;
}
