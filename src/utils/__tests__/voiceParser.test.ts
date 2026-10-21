import { parseVoiceCommand } from '../voiceParser';

describe('parseVoiceCommand', () => {
  it('interpreta cenario de receita clara', () => {
    const result = parseVoiceCommand(
      'Recebi 1500 reais de consultoria na Indikcon'
    );

    expect(result.amount).toBe(1500);
    expect(result.type).toBe('income');
    expect(result.note?.toLowerCase()).toContain('consultoria');
    expect(result.note?.toLowerCase()).toContain('indikcon');
  });

  it('interpreta cenario de despesa clara com virgula decimal', () => {
    const result = parseVoiceCommand(
      'Gastei 85,50 com insumos para a Snackscoffee'
    );

    expect(result.amount).toBe(85.5);
    expect(result.type).toBe('expense');
    expect(result.note?.toLowerCase()).toContain('insumos');
    expect(result.note?.toLowerCase()).toContain('snackscoffee');
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

  it('identifica parcelamento no padrao brasileiro', () => {
    const result = parseVoiceCommand('Comprei um celular de 2400 no cartao em 12x');

    expect(result.type).toBe('expense');
    expect(result.paymentMethod).toBe('credit');
    expect(result.installments).toBe(12);
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

    it('interpreta "X e Y" por extenso como valor decimal (reais e centavos)', () => {
      const result1 = parseVoiceCommand('Gastei vinte e oito e oitenta e quatro');
      expect(result1.amount).toBe(28.84);

      const result2 = parseVoiceCommand('Paguei trinta e cinco e cinquenta');
      expect(result2.amount).toBe(35.50);

      const result3 = parseVoiceCommand('28 e 84 no mercado');
      expect(result3.amount).toBe(28.84);

      const result4 = parseVoiceCommand('Gastei cem e noventa e nove');
      expect(result4.amount).toBe(100.99);
    });

    it('categoriza despesas comuns como mercado, farmacia, gasolina e luz', () => {
      const resMercado = parseVoiceCommand('Mercado 120 reais no pix');
      expect(resMercado.amount).toBe(120);
      expect(resMercado.categoryId).toBe('alimentacao');
      expect(resMercado.paymentMethod).toBe('pix');

      const resFarmacia = parseVoiceCommand('Comprei remédio na farmácia 45 reais');
      expect(resFarmacia.amount).toBe(45);
      expect(resFarmacia.categoryId).toBe('saude');

      const resGasolina = parseVoiceCommand('Gasolina 80 reais no debito');
      expect(resGasolina.amount).toBe(80);
      expect(resGasolina.categoryId).toBe('transporte');
      expect(resGasolina.paymentMethod).toBe('debit');

      const resLuz = parseVoiceCommand('Conta de luz 150 reais');
      expect(resLuz.amount).toBe(150);
      expect(resLuz.categoryId).toBe('moradia');
    });

    it('faz match com categorias customizadas do workspace', () => {
      const customCats = [
        { id: 'cat-academia', name: 'Academia' },
        { id: 'cat-pet', name: 'Pet Shop' },
      ];

      const resAcademia = parseVoiceCommand('Paguei a academia 90 reais', customCats);
      expect(resAcademia.categoryId).toBe('cat-academia');

      const resPet = parseVoiceCommand('Pet shop 50 reais', customCats);
      expect(resPet.categoryId).toBe('cat-pet');
    });

    it('reconhece girias monetarias brasileiras (conto, pila, pau) e correcao de pique para pix', () => {
      const resConto = parseVoiceCommand('Gastei 50 conto no mercado');
      expect(resConto.amount).toBe(50);
      expect(resConto.categoryId).toBe('alimentacao');

      const resPila = parseVoiceCommand('Paguei 30 pila de uber no cartao');
      expect(resPila.amount).toBe(30);
      expect(resPila.categoryId).toBe('transporte');
      expect(resPila.paymentMethod).toBe('credit');

      const resPique = parseVoiceCommand('Transferi 100 pau no pique');
      expect(resPique.amount).toBe(100);
      expect(resPique.paymentMethod).toBe('pix');

      const resComCentavos = parseVoiceCommand('35 com 50 na farmacia');
      expect(resComCentavos.amount).toBe(35.5);
      expect(resComCentavos.categoryId).toBe('saude');
    });

    it('preserva preposicoes internas na descricao sem poluir com metodos de pagamento', () => {
      const res = parseVoiceCommand('Paguei 45 reais de almoço no restaurante do Zé no cartão');
      expect(res.amount).toBe(45);
      expect(res.paymentMethod).toBe('credit');
      expect(res.note?.toLowerCase()).toContain('almoco no restaurante do ze');
      expect(res.note?.startsWith('A')).toBe(true); // Capitalizado
    });
  });
});
