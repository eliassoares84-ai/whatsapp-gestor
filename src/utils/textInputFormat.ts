export const uppercaseFirstLetter = (value: string): string => {
  if (!value) {
    return value;
  }

  const chars = Array.from(value);
  const index = chars.findIndex((char) => /\p{L}/u.test(char));

  if (index === -1) {
    return value;
  }

  const target = chars[index];
  if (!target) {
    return value;
  }
  chars[index] = target.toLocaleUpperCase('pt-BR');
  return chars.join('');
};
