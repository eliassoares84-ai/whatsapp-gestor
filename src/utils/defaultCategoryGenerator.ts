import type { Category, WorkspaceId, WorkspaceType } from '../types/finance.types';

interface DefaultCategoryTemplate {
  name: string;
  icon: string;
  color: string;
}

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  alimentacao: '#FF9500',
  transporte: '#34C759',
  lazer: '#FF2D55',
  saude: '#00C7BE',
  moradia: '#8B5CF6',
  outros: '#A2845E',
  
  impostos: '#FF453A',
  marketing: '#FF9500',
  software: '#00B4D8',
  proLabore: '#0A84FF',
  escritorio: '#5AC8FA',
  consultoriaExterna: '#4F46E5',
  
  insumos: '#32CD32',
  manutencao: '#FFB6C1',
  logistica: '#87CEEB',
  aluguelPonto: '#D2B48C',
  energia: '#FFD700',
  perdas: '#CD5C5C',
  
  investimentos: '#42C882',
  reservaEmergencia: '#FF6B6B',
};

const DEFAULT_CATEGORIES: Record<WorkspaceType, DefaultCategoryTemplate[]> = {
  personal: [
    { name: 'Alimentação', icon: 'food', color: DEFAULT_CATEGORY_COLORS.alimentacao },
    { name: 'Transporte', icon: 'car', color: DEFAULT_CATEGORY_COLORS.transporte },
    { name: 'Lazer', icon: 'gamepad-variant', color: DEFAULT_CATEGORY_COLORS.lazer },
    { name: 'Saúde', icon: 'hospital-box', color: DEFAULT_CATEGORY_COLORS.saude },
    { name: 'Moradia', icon: 'home', color: DEFAULT_CATEGORY_COLORS.moradia },
    { name: 'Outros', icon: 'dots-horizontal', color: DEFAULT_CATEGORY_COLORS.outros },
  ],
  business: [
    { name: 'Impostos', icon: 'file-document', color: DEFAULT_CATEGORY_COLORS.impostos },
    { name: 'Marketing', icon: 'bullhorn', color: DEFAULT_CATEGORY_COLORS.marketing },
    { name: 'Software/SaaS', icon: 'cloud-download', color: DEFAULT_CATEGORY_COLORS.software },
    { name: 'Pró-labore', icon: 'account-cash', color: DEFAULT_CATEGORY_COLORS.proLabore },
    { name: 'Escritório', icon: 'briefcase', color: DEFAULT_CATEGORY_COLORS.escritorio },
    { name: 'Consultoria Externa', icon: 'headset', color: DEFAULT_CATEGORY_COLORS.consultoriaExterna },
  ],
};

const WILDCARD_CATEGORIES: DefaultCategoryTemplate[] = [
  { name: 'Investimentos', icon: 'trending-up', color: DEFAULT_CATEGORY_COLORS.investimentos },
  { name: 'Reserva de Emergência', icon: 'shield-lock', color: DEFAULT_CATEGORY_COLORS.reservaEmergencia },
];

const toCategoryId = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

export const generateDefaultCategories = (
  workspaceId: WorkspaceId,
  workspaceType: WorkspaceType
): Category[] => {
  const baseCategories = DEFAULT_CATEGORIES[workspaceType] || [];
  const allTemplates = [...baseCategories, ...WILDCARD_CATEGORIES];

  return allTemplates.map((template) => ({
    id: toCategoryId(template.name),
    name: template.name,
    icon: template.icon,
    color: template.color,
    workspaceId,
  }));
};

export const generateWildcardCategories = (workspaceId: WorkspaceId): Category[] => {
  return WILDCARD_CATEGORIES.map((template) => ({
    id: toCategoryId(template.name),
    name: template.name,
    icon: template.icon,
    color: template.color,
    workspaceId,
  }));
};
