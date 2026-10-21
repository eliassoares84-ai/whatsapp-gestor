const DEFAULT_CATEGORY_TRANSLATION_KEY_BY_ID: Record<string, string> = {
  alimentacao: 'categoryLabels.alimentacao',
  transporte: 'categoryLabels.transporte',
  lazer: 'categoryLabels.lazer',
  saude: 'categoryLabels.saude',
  moradia: 'categoryLabels.moradia',
  outros: 'categoryLabels.outros',
  impostos: 'categoryLabels.impostos',
  marketing: 'categoryLabels.marketing',
  softwaresaas: 'categoryLabels.softwareSaas',
  'pro-labore': 'categoryLabels.proLabore',
  escritorio: 'categoryLabels.escritorio',
  'consultoria-externa': 'categoryLabels.consultoriaExterna',
  investimentos: 'categoryLabels.investimentos',
  'reserva-de-emergencia': 'categoryLabels.reservaEmergencia',
};

export const getLocalizedCategoryName = (
  categoryId: string,
  fallbackName: string,
  t: any
): string => {
  const translationKey = DEFAULT_CATEGORY_TRANSLATION_KEY_BY_ID[categoryId];

  if (!translationKey) {
    return fallbackName;
  }

  return t(translationKey, { defaultValue: fallbackName });
};
