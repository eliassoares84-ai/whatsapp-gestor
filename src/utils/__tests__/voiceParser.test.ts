import { parseVoiceCommand } from '../voiceParser';

describe('parseVoiceCommand', () => {
  it('interpreta cenario de receita clara', () => {
    const result = parseVoiceCommand(
      'Recebi 1500 reais de consultoria na Indikcon'
    );

    expect(result.amount).toBe(1500);
    expect(result.type).toBe('income');
    expect(result.note).toContain('consultoria');
    expect(result.note).toContain('indikcon');
  });

  it('interpreta cenario de despesa clara com virgula decimal', () => {
    const result = parseVoiceCommand(
      'Gastei 85,50 com insumos para a Snackscoffee'
    );

    expect(result.amount).toBe(85.5);
    expect(result.type).toBe('expense');
    expect(result.note).toContain('insumos');
    expect(result.note).toContain('snackscoffee');
  });

  it('interpreta cenario com decimais quebrados', () => {
    const result = parseVoiceCommand('Paguei 4.99 num cafe');

    expect(result.amount).toBe(4.99);
    expect(result.type).toBe('expense');
  });

  it('aplica fallback de despesa e sugere alimentacao para ifood', () => {
    const result = parseVoiceCommand('Ifood de 45 reais');

    expect(result.type).toBe('expense');
    expect(result.amount).toBe(45);
    expect(result.categoryId).toBe('alimentacao');
  });

  it('sugere categoria de transporte para uber', () => {
    const result = parseVoiceCommand('Gastei 30 de uber');

    expect(result.type).toBe('expense');
    expect(result.amount).toBe(30);
    expect(result.categoryId).toBe('transporte');
  });

  describe('casos de borda', () => {
    it('trata texto vazio graciosamente', () => {
      const emptyResult = parseVoiceCommand('   ');
      const noValueResult = parseVoiceCommand(
        'apenas conversando sem valores'
      );

      expect(emptyResult.type).toBe('expense');
      expect(emptyResult.amount).toBeUndefined();

      expect(noValueResult.type).toBe('expense');
      expect(noValueResult.amount).toBeUndefined();
    });

    it('captura o primeiro numero em multiplos numeros', () => {
      const result = parseVoiceCommand(
        'Gastei 50 de uber e depois mais 20 no ifood'
      );

      expect(result.amount).toBe(50);
      expect(result.type).toBe('expense');
      expect(result.categoryId).toBe('transporte');
    });

    it('normaliza milhares com pontuacao complexa', () => {
      const result1500 = parseVoiceCommand('Recebi 1.500,00 reais');
      const result2500 = parseVoiceCommand('Ganhei 2,500.50');

      expect(result1500.amount).toBe(1500);
      expect(result1500.type).toBe('income');

      expect(result2500.amount).toBe(2500.5);
      expect(result2500.type).toBe('income');
    });

    it('aplica fallback de expense para termos ambiguos', () => {
      const resultTransferi = parseVoiceCommand('Transferi 100 reais');
      const resultDei = parseVoiceCommand('Dei 50 pro fulano');

      expect(resultTransferi.type).toBe('expense');
      expect(resultTransferi.amount).toBe(100);

      expect(resultDei.type).toBe('expense');
      expect(resultDei.amount).toBe(50);
    });
  });
});
