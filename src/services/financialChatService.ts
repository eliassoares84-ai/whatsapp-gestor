import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface UserFinancialContext {
  currentBalance?: number;
  monthlyIncome?: number;
  monthlyExpense?: number;
  currency?: string;
  localeTag?: string;
  workspaceType?: 'personal' | 'business';
  topCategories?: { name: string; amount: number }[];
}

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash',
];

const SYSTEM_PROMPT = `Você é o Consultor Financeiro CFP® (Certified Financial Planner) oficial do aplicativo SeuGestor.
Você é um especialista sênior de alto nível no mercado financeiro brasileiro e global, com sólida formação e autoridade prática nos seguintes pilares:

1. MERCADO DE AÇÕES E RENDA VARIÁVEL:
   - Ações da B3 (Small caps, Blue chips, Dividendos, Crescimento), BDRs, ETFs (ex: IVVB11, WRLD11, BOVA11).
   - Análise fundamentalista: P/L, P/VP, EV/EBITDA, Dividend Yield, ROE, Dívida Líquida/EBITDA.
   - Estratégias de renda com opções (venda coberta de Call para remuneração de carteira, venda de Put para compra com desconto, travas de hedge).
   - Alocação estratégica e balanceamento periódico de risco.

2. INVESTIMENTOS EM RENDA FIXA E TÍTULOS PÚBLICOS:
   - Tesouro Direto: Tesouro Selic (reserva de emergência), Tesouro IPCA+ (proteção de poder de compra), Tesouro Prefixado, RendA+ e Educa+.
   - Crédito Bancário: CDBs, LCIs, LCAs (isenção de IR para PF), LCs. Regras e teto de garantia do FGC (R$ 250.000 por CPF/instituição até o limite global de R$ 1.000.000).
   - Crédito Privado: CRIs, CRAs, Debêntures incentivadas (Lei 12.431/11, isenção de IR).
   - Marcação a Mercado (MtM), duration, curva de juros (DI futuro), spread de crédito e alíquotas regressivas de IR (22,5% a 15%).

3. MERCADO IMOBILIÁRIO & FINANCIAMENTO HABITACIONAL:
   - Sistemas de amortização: Tabela SAC (parcelas decrescentes, menor custo total de juros) vs Tabela Price / Sistema Francês (parcelas constantes, amortização mais lenta do saldo devedor).
   - Estratégias de amortização extraordinária (reduzir prazo gera economia massiva de juros vs reduzir valor da parcela para desafogar fluxo de caixa).
   - Uso de FGTS (amortização extraordinária, liquidação ou abatimento de até 80% das prestações).
   - Custos de fechamento: ITBI, escritura pública, registro de imóveis (RGI) e taxa de avaliação bancária.
   - Análise matemática e de custo de oportunidade: Compra financiada vs Aluguel inteligente com investimento do capital no CDI/IPCA+.
   - Fundos de Investimento Imobiliário (FIIs): Tijolo, Papel (CRI), FOFS, Fiagros. Isenção de rendimentos mensais para PF e tributação de 20% no ganho de capital da cota.

4. FINANCIAMENTO DE VEÍCULOS & MOBILIDADE:
   - CDC (Crédito Direto ao Consumidor), Leasing, Assinatura de veículos (carro por assinatura).
   - Custo Efetivo Total (CET), taxas ocultas, TAC e IOF financiado.
   - Custo Total de Posse (TCO): depreciação média anual (10-15%), IPVA, seguro total, combustível e manutenção preventiva.
   - Estratégia de entrada: quanto maior a entrada, menor o spread de juros cobrado pela financeira.

5. CONSÓRCIOS (ANÁLISE MATEMÁTICA E REALISTA):
   - Estrutura de grupos: Taxa de administração total e anualizada, fundo de reserva e seguro prestamista.
   - Formas de contemplação: Sorteio, lance livre e lance embutido.
   - Correção do crédito: INCC (imóveis) ou IPCA/FIPE (veículos).
   - Comparação realista: quando vale a pena (disciplina financeira forçada para quem não consegue poupar, ou contemplação rápida planejada com lance) vs quando NÃO vale a pena (custo de oportunidade severo comparado ao investimento do valor das parcelas a juros compostos).

6. GESTÃO DE RISCOS & SEGUROS PATRIMONIAIS:
   - Seguro de Vida: Term Life (temporário, puro risco, alta cobertura por custo acessível) vs Whole Life (vida inteira resgatável, custo nivelado).
   - DIT (Diária por Incapacidade Temporária) essencial para autônomos e liberais.
   - Seguro contra Doenças Graves e Invalidez Permanente.
   - Blindagem e Sucessão: Art. 794 do Código Civil — indenização de seguro de vida NÃO entra em inventário, NÃO responde por dívidas do falecido, é isenta de ITCMD e possui liquidez em até 30 dias para os herdeiros.

7. PREVIDÊNCIA PRIVADA & APOSENTADORIA:
   - Planos: PGBL (recomendado para quem faz declaração completa do IR e contribui para o INSS/RPPS, permitindo deduzir até 12% da renda bruta tributável anual) vs VGBL (tributação apenas sobre a rentabilidade no resgate, ideal para declaração simplificada ou excedente aos 12%).
   - Regimes de tributação: Tabela Regressiva (inicia em 35% e atinge alíquota mínima de 10% após 10 anos; Lei 14.803/24 permite a opção definitiva no ato do resgate) vs Tabela Progressiva.
   - Vantagens estratégicas: ausência de come-cotas semestral, portabilidade ilimitada sem incidência de IR e agilidade na sucessão patrimonial.

8. TRIBUTAÇÃO NACIONAL & CONTABILIDADE:
   - IRPF: tabela progressiva mensal e anual, carnê-leão e livro-caixa para médicos, advogados e autônomos.
   - Renda Variável: isenção de R$ 20.000 no mês para venda de ações à vista (exceto day trade e FIIs); alíquota de 15% em swing trade e 20% em day trade e FIIs; emissão de DARF código 6015 e compensação de prejuízos passados da mesma modalidade.
   - Estruturação PJ para prestadores de serviços: MEI, Simples Nacional (Anexo III vs Anexo V com regra do Fator R de 28%), Lucro Presumido e distribuição de lucros isenta.

9. HOLDING FAMILIAR & PLANEJAMENTO SUCESSÓRIO:
   - Estruturação societária: Holding Pura de Participações (para concentrar empresas operacionais) e Holding Patrimonial / Imobiliária (para locação e venda de imóveis).
   - Eficiência tributária na locação de imóveis: alíquota efetiva de ~11,33% no Lucro Presumido vs até 27,5% no IRPF da pessoa física.
   - Sucessão em vida: Doação de quotas aos filhos com reserva de usufruto vitalício, mantendo os pais na administração exclusiva e com poder de voto.
   - Cláusulas essenciais de proteção: Inalienabilidade, Impenhorabilidade, Incomunicabilidade e Reversão (as quotas voltam aos pais se o filho falecer antes).
   - Economia brutal: previne o desgaste e os custos devastadores do inventário judicial (que costuma drenar de 10% a 20% do patrimônio com honorários, custas e ITCMD progressivo).

DIRETRIZES DE PERSONA E COMUNICAÇÃO:
- Fale como um consultor humano experiente, caloroso, parceiro, ágil e altamente didático. NUNCA soe como um robô, atendente padrão ou FAQ de banco.
- NÃO coloque disclaimers burocráticos ou avisos de isenção em todas as respostas. Trate o usuário com naturalidade e respeito, orientando caminhos reais, riscos e vantagens práticas.
- Vá direto ao ponto. Use parágrafos fluidos, tópicos limpos quando comparar opções e negrito para destacar valores ou conclusões fundamentais.
- Utilize números e simulações didáticas sempre que puder para ilustrar a matemática da decisão (ex: "Se você amortizar R$ 500 no SAC hoje...").
- Quando a dúvida for ampla, forneça uma visão geral de valor imediato e faça 1 ou 2 perguntas inteligentes para aprofundar a personalização do caso.
- Se o usuário perguntar sobre a própria situação e houver dados de contexto disponíveis (saldo, gastos do mês), integre essas informações de forma fluida e natural.
- Responda sempre em português do Brasil (pt-BR).`;

const getApiKey = (): string | null => {
  return process.env.EXPO_PUBLIC_GEMINI_API_KEY || null;
};

export const callFinancialAdvisorChat = async (
  messagesHistory: ChatMessage[],
  newMessage: string,
  userContext?: UserFinancialContext
): Promise<string> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    return generateOfflineAdvisoryResponse(newMessage, userContext);
  }

  // Prepara o contexto financeiro se disponível
  let contextSnippet = '';
  if (userContext) {
    const parts: string[] = [];
    if (userContext.currentBalance !== undefined) {
      parts.push(`Saldo atual em conta: R$ ${userContext.currentBalance.toFixed(2)}`);
    }
    if (userContext.monthlyIncome !== undefined) {
      parts.push(`Receitas registradas este mês: R$ ${userContext.monthlyIncome.toFixed(2)}`);
    }
    if (userContext.monthlyExpense !== undefined) {
      parts.push(`Despesas registradas este mês: R$ ${userContext.monthlyExpense.toFixed(2)}`);
    }
    if (userContext.workspaceType) {
      parts.push(`Perfil da carteira: ${userContext.workspaceType === 'business' ? 'Pessoa Jurídica / Negócio' : 'Pessoa Física / Pessoal'}`);
    }
    if (userContext.topCategories && userContext.topCategories.length > 0) {
      const topStr = userContext.topCategories
        .slice(0, 3)
        .map((c) => `${c.name}: R$ ${c.amount.toFixed(2)}`)
        .join(', ');
      parts.push(`Principais categorias de gastos: ${topStr}`);
    }

    if (parts.length > 0) {
      contextSnippet = `\n\n[CONTEXTO FINANCEIRO ATUAL DO USUÁRIO NO APP]:\n${parts.join('\n')}\nUtilize esses dados se forem relevantes para responder de forma personalizada.`;
    }
  }

  const fullSystemInstruction = `${SYSTEM_PROMPT}${contextSnippet}`;

  // Tenta modelos disponíveis com fallback em cascata
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({
        model: modelName,
        systemInstruction: fullSystemInstruction,
      });

      // Monta o histórico recente de mensagens (até 12 mensagens para contexto enxuto)
      const recentHistory = messagesHistory.slice(-12).map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      const chat = model.startChat({
        history: recentHistory,
      });

      const result = await chat.sendMessage(newMessage);
      const responseText = result.response.text();

      if (responseText && responseText.trim().length > 0) {
        return responseText.trim();
      }
    } catch (err: any) {
      const errMsg = String(err?.message || err);
      // Se for erro de cota ou modelo indisponível, tenta o próximo modelo
      if (
        errMsg.includes('not found') ||
        errMsg.includes('404') ||
        errMsg.includes('quota') ||
        errMsg.includes('resource_exhausted')
      ) {
        continue;
      }
    }
  }

  // Fallback caso a API externa falhe temporariamente ou esteja offline
  return generateOfflineAdvisoryResponse(newMessage, userContext);
};

/**
 * Motor consultivo de contingência com respostas de alta fidelidade
 * formuladas pela persona CFP caso a IA online esteja indisponível.
 */
export const generateOfflineAdvisoryResponse = (
  userQuery: string,
  _userContext?: UserFinancialContext
): string => {
  const query = userQuery
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (query.includes('sac') || query.includes('price') || query.includes('financiamento imobiliario') || query.includes('amortizar')) {
    return (
      `Ótima pergunta! Como consultor CFP, acompanho isso diariamente com meus clientes:\n\n` +
      `**SAC vs Tabela Price no Financiamento:**\n\n` +
      `• **Tabela SAC (Sistema de Amortização Constante):** A amortização da dívida é igual todo mês, e os juros caem progressivamente. As parcelas começam mais altas e vão caindo. Ao final do contrato, você paga **muito menos juros totais** (geralmente entre 15% e 25% a menos que na Price).\n\n` +
      `• **Tabela Price:** Parcelas fixas do início ao fim. No começo, quase 80% da parcela é só juro puro e amortiza pouquíssimo o saldo devedor. Só vale a pena se a sua renda inicial não comportar a primeira parcela do SAC.\n\n` +
      `**Estratégia de Ouro:** Se já tem o financiamento, faça **amortizações extraordinárias com foco em REDUZIR PRAZO** (e não valor da parcela). Cada R$ 1.000 amortizado no prazo corta de 2 a 4 parcelas do final do contrato, eliminando todos os juros futuros embutidos nessas parcelas!`
    );
  }

  if (query.includes('holding') || query.includes('heranca') || query.includes('sucessao') || query.includes('inventario')) {
    return (
      `Excelente ponto! Planejamento sucessório e patrimonial é um dos temas mais estratégicos para famílias no Brasil:\n\n` +
      `**Por que a Holding Familiar é tão poderosa?**\n\n` +
      `1. **Adeus ao Inventário Judicial:** Um inventário tradicional pode consumir de **10% a 20% de todo o patrimônio familiar** entre honorários advocatícios, custas judiciais e ITCMD, além de demorar anos e paralisar bens. Com a holding, a sucessão ocorre de forma imediata e administrativa.\n\n` +
      `2. **Eficiência Fiscal com Imóveis:** Se você aluga imóveis na pessoa física, a alíquota de IRPF chega a **27,5%**. Na holding patrimonial optante pelo Lucro Presumido, a tributação federal total sobre os aluguéis gira em torno de **11,33% a 14,53%**, gerando uma economia tributária gigante.\n\n` +
      `3. **Poder e Controle dos Pais:** Os pais doam as quotas aos filhos com **reserva de usufruto vitalício** e direito de voto exclusivo. Isso significa que os pais continuam mandando 100% no patrimônio, recebendo todos os rendimentos e decidindo compras e vendas, enquanto os filhos só assumem plenamente após o falecimento.\n\n` +
      `4. **Cláusulas de Blindagem:** Cláusulas de *inalienabilidade* (filhos não podem vender), *impenhorabilidade* (dívidas dos filhos não afetam o patrimônio) e *incomunicabilidade* (genros e noras não têm direito em divórcios).\n\n` +
      `Vale a pena estruturar quando a família possui a partir de R$ 1 milhão a R$ 2 milhões em bens ou imóveis geradores de renda.`
    );
  }

  if (query.includes('pgbl') || query.includes('vgbl') || query.includes('previdencia')) {
    return (
      `Vamos desmistificar a Previdência Privada de forma prática e sem rodeios:\n\n` +
      `**A Regra Fundamental: PGBL ou VGBL?**\n\n` +
      `• **PGBL:** Indicado exclusivamente para quem declara o Imposto de Renda no **Modelo Completo** e contribui para a previdência oficial (INSS ou RPPS). Você pode abater até **12% da sua renda bruta anual** do cálculo do IR hoje! No resgate futuro, o imposto incidirá sobre o valor total (capital + rendimento).\n\n` +
      `• **VGBL:** Para quem faz declaração simplificada ou já estourou o limite de 12% no PGBL. No resgate, o IR incide **apenas sobre os rendimentos**.\n\n` +
      `**Tabela Regressiva vs Progressiva:**\n` +
      `Com a Lei 14.803 sancionada recentemente, você pode escolher o regime de tributação só na hora do resgate! Na **Tabela Regressiva**, a alíquota começa em 35% e cai 5% a cada 2 anos, atingindo **10% após 10 anos** — a menor alíquota de investimento financeiro do Brasil!\n\n` +
      `**Super Vantagem:** Fundos de previdência **NÃO têm come-cotas** em maio e novembro, deixando os juros compostos renderem 100% livres ao longo dos anos.`
    );
  }

  if (query.includes('consorcio') || query.includes('consorcio vale a pena')) {
    return (
      `Vou te dar a visão honesta de consultor CFP sobre consórcio, sem o discurso comercial dos bancos:\n\n` +
      `**Como funciona na prática?**\n` +
      `O consórcio não cobra juros, mas cobra **Taxa de Administração** (geralmente entre 14% e 25% no período), além de fundo de reserva e seguro prestamista. Além disso, a carta de crédito e as parcelas são reajustadas anualmente pela FIPE (veículos) ou INCC (imóveis).\n\n` +
      `**Quando VALE A PENA?**\n` +
      `• Se você tem dinheiro para dar um **lance forte (livre ou embutido)** de 40% a 60% e precisa do bem em curto prazo com custo financeiro menor que um CDC/financiamento tradicional.\n` +
      `• Como ferramenta de disciplina forçada para quem simplesmente não consegue guardar dinheiro na conta.\n\n` +
      `**Quando NÃO VALE A PENA?**\n` +
      `• Se você pretende pagar a parcela e esperar apenas a sorte do sorteio. Você pode esperar anos sem ser contemplado enquanto o valor do bem sobe e suas parcelas encarecem.\n` +
      `• Se você tem disciplina: aplicar o mesmo valor da parcela em um Tesouro Selic ou CDB rende juros sobre juros a seu favor, permitindo comprar à vista com desconto e sem pagar taxa de administração para ninguém.`
    );
  }

  if (query.includes('carro') || query.includes('veiculo') || query.includes('financiar carro')) {
    return (
      `Financiamento de veículos é um dos maiores ralos de riqueza da classe média. Vamos aos números reais:\n\n` +
      `**O Custo Real de um Veículo (TCO - Total Cost of Ownership):**\n` +
      `Quando você financia um carro, a parcela é apenas metade do gasto. Você precisa somar:\n` +
      `1. **Depreciação Real:** Em média 10% a 15% ao ano sobre o valor de tabela.\n` +
      `2. **IPVA + Licenciamento:** Cerca de 4% ao ano em SP e outros estados.\n` +
      `3. **Seguro Total:** De 3% a 6% ao ano dependendo do perfil.\n` +
      `4. **Juros do CDC:** Em um financiamento sem entrada ou com entrada baixa, ao final de 48 meses você costuma pagar **quase dois carros** para ter um só.\n\n` +
      `**Direcionamento Estratégico:**\n` +
      `• Se precisar comprar agora: dê no mínimo **50% de entrada** e parcele no máximo em 24 a 36 meses para mitigar a taxa de juros.\n` +
      `• Avalie carro por assinatura apenas se você troca de veículo a cada 1 ou 2 anos e roda bastante (acima de 15.000 km/ano), pois o custo de depreciação e manutenção fica com a locadora.`
    );
  }

  if (query.includes('acoes') || query.includes('bolsa') || query.includes('dividendos') || query.includes('renda variavel')) {
    return (
      `Vamos estruturar sua visão sobre Renda Variável com mentalidade de longo prazo:\n\n` +
      `**Os 3 Pilares de uma Carteira de Ações Sólida:**\n\n` +
      `1. **Empresas Pagadoras de Dividendos (Vaca Leiteira):** Empresas de setores perenes e previsíveis (Bancos, Energia Elétrica, Saneamento, Telecom e Seguros — o famoso acrônimo B.E.S.T.). Elas geram caixa constante e pagam proventos que você reinveste para acelerar a bola de neve.\n\n` +
      `2. **Empresas de Crescimento (Growth):** Companhias com alto potencial de valorização que reinvestem a maior parte dos lucros na expansão do próprio negócio.\n\n` +
      `3. **Exposição Global:** Nunca deixe 100% do seu patrimônio em risco-Brasil. Ter ETFs globais (como WRLD11 ou IVVB11) protege seu patrimônio contra a desvalorização do Real frente ao Dólar.\n\n` +
      `**Regra de Ouro Tributária:** Vendas de ações no mercado à vista de até **R$ 20.000 dentro do mesmo mês civil são ISENTAS de IR** sobre o ganho de capital (não se aplica a Day Trade nem a FIIs)!`
    );
  }

  // Resposta padrão consultiva
  return (
    `Olá! Como seu Consultor Financeiro CFP®, estou à sua disposição para analisar qualquer frente da sua vida financeira:\n\n` +
    `• **Investimentos:** Renda Fixa (CDB, Tesouro, LCI/LCA, Debêntures) e Renda Variável (Ações, FIIs, ETFs).\n` +
    `• **Crédito & Financiamentos:** Habitação (SAC vs Price, FGTS, quitação acelerada) e Veículos.\n` +
    `• **Planejamento Patrimonial:** Previdência Privada (PGBL/VGBL), Seguros de Vida resgatáveis, Holding Familiar e Sucessão.\n` +
    `• **Tributação:** Otimização de IRPF, ganho de capital e contabilidade PJ.\n\n` +
    `Como posso te orientar especificamente hoje? Me conte um pouco sobre o seu objetivo ou a decisão que você está avaliando!`
  );
};
