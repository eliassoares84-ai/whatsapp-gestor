// Dicionário de bancos com cores, ícones e logos
const BankDictionary = {
  Nubank: { themeColor: '#820AD1', iconName: 'bank' },
  Itaú: { themeColor: '#EC7000', iconName: 'bank' },
  Inter: { themeColor: '#FF7A00', iconName: 'bank' },
  Bradesco: { themeColor: '#CC092F', iconName: 'bank' },
  Santander: { themeColor: '#EC0000', iconName: 'bank' },
  'Banco do Brasil': { themeColor: '#FBE106', iconName: 'bank' },
  Caixa: { themeColor: '#005CA9', iconName: 'bank' },
  C6: { themeColor: '#222222', iconName: 'bank' },
  Dinheiro: { themeColor: '#2E7D32', iconName: 'cash' },
};

export const BANK_LOGOS: Record<string, number> = {
  nubank: require('../../assets/banks/nubank.png') as number,
  itau: require('../../assets/banks/itau.png') as number,
  inter: require('../../assets/banks/inter.png') as number,
  bradesco: require('../../assets/banks/bradesco.png') as number,
  santander: require('../../assets/banks/santander.png') as number,
  bb: require('../../assets/banks/bb.png') as number,
  'banco do brasil': require('../../assets/banks/bb.png') as number,
  caixa: require('../../assets/banks/caixa.png') as number,
  c6: require('../../assets/banks/c6.png') as number,
};

export const getBankLogo = (name: string): number | null => {
  const key = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  for (const [k, logo] of Object.entries(BANK_LOGOS)) {
    if (key.includes(k)) return logo;
  }
  return null;
};

export default BankDictionary;