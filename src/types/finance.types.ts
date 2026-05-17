export type WorkspaceId = string;

export type WorkspaceType = 'personal' | 'business';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Workspace {
  id: WorkspaceId;
  name: string;
  type: WorkspaceType;
  themeColor: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string;
  workspaceId: WorkspaceId;
  note?: string;
  isRecurring: boolean;
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