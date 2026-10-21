export type WorkspaceId = string;

export type WorkspaceType = 'personal' | 'business';

export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'pix';
export type InvoiceStatus = 'open' | 'paid';

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  availableLimit: number;
  closingDay: number;
  dueDay: number;
  themeColor: string;
}

export interface Workspace {
  id: WorkspaceId;
  name: string;
  type: WorkspaceType;
  themeColor: string;
  creditCards: CreditCard[];
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  themeColor: string;
  iconName?: string;
  type: 'checking' | 'savings' | 'cash';
  workspaceId?: WorkspaceId;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  paymentMethod?: PaymentMethod;
  categoryId: string;
  date: string;
  workspaceId: WorkspaceId;
  note?: string;
  isRecurring: boolean;
  accountId?: string;
  creditCardId?: string;
  excludeFromCharts?: boolean;
  invoiceMonth?: string;
  invoiceStatus?: InvoiceStatus;
  installmentNumber?: number;
  installmentTotal?: number;
  installmentGroupId?: string;
  purchaseDate?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  workspaceId: WorkspaceId;
  budgetLimit?: number;
}

export interface RecurringTemplate {
  id: string;
  workspaceId: WorkspaceId;
  amount: number;
  type: TransactionType;
  categoryId: string;
  note: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  dayOfMonth: number;
  lastProcessedDate: string;
  isActive: boolean;
}