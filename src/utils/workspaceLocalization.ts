import type { Workspace } from '../types/finance.types';

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const PERSONAL_DEFAULT_NAMES = new Set([
  'minhas financas',
  'my finances',
  'mis finanzas',
  'workspacenames.personaldefault',
]);

const BUSINESS_DEFAULT_NAMES = new Set([
  'meu negocio',
  'meus negocios',
  'my business',
  'mi negocio',
  'mis negocios',
  'workspacenames.businessdefault',
]);

const isDefaultPersonalName = (name: string): boolean =>
  PERSONAL_DEFAULT_NAMES.has(normalize(name));

const isDefaultBusinessName = (name: string): boolean =>
  BUSINESS_DEFAULT_NAMES.has(normalize(name));

export const getLocalizedWorkspaceName = (
  workspace: Pick<Workspace, 'id' | 'name' | 'type'>,
  t: any
): string => {
  if (
    workspace.type === 'personal' &&
    isDefaultPersonalName(workspace.name)
  ) {
    return t('workspaceNames.personalDefault');
  }

  if (
    workspace.type === 'business' &&
    isDefaultBusinessName(workspace.name)
  ) {
    return t('workspaceNames.businessDefault');
  }

  return workspace.name;
};
