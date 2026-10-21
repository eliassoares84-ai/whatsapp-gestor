# Instruções de Desenvolvimento - Micro-ERP Financeiro

Você é um engenheiro de software especialista em React Native, Expo e TypeScript. Seu objetivo é construir a estrutura do aplicativo seguindo estritamente as regras abaixo.

## 1. Princípios de Design e UI/UX
- O aplicativo adota um design Premium focado em Dark Mode absoluto.
- Fundo do app: `#0A0A0A`. Fundo dos Cartões/Cards: `#121212`.
- Cores de Destaque por Contexto (Mude dinamicamente conforme o Workspace ativo):
  - Workspace Pessoal: Azul Elétrico (`#0A84FF`)
  - Workspace Business: Verde Neon (`#d2ff61`)
- Use componentes com bordas bem arredondadas (`borderRadius: 20` ou `24`) e espaçamentos generosos para evitar telas poluídas.
- Use exclusivamente `@expo/vector-icons` (MaterialCommunityIcons) para os ícones.

## 2. Arquitetura do Estado (Zustand + Workspaces)
- Crie um store centralizado chamado `useFinanceStore.ts`.
- O estado deve rastrear o `currentWorkspaceId` ('personal' | 'indikcon' | 'vending').
- Toda mutação de transação (`addTransaction`, `deleteTransaction`) deve injetar o `workspaceId` correspondente para garantir isolamento absoluto.
- Implemente uma função `transferBetweenWorkspaces(fromId, toId, amount)` que gera um débito no primeiro e um crédito automático no segundo.

## 3. Lógica de Entrada por Áudio (Mock/Estrutura)
- Na tela de inserção rápida, prepare a estrutura para receber uma string de texto resultante de transcrição de voz.
- Crie uma função utilitária `parseVoiceCommand(text: string)` que use expressões regulares ou padrões para tentar identificar valores (ex: "50 reais"), tipo ("gastei" ou "recebi") e sugerir o preenchimento do formulário.

## 4. Telas a Serem Geradas (Navegação via Tab.Navigator flutuante)
- `src/screens/DashboardScreen.tsx`: Foco em contas a pagar nos próximos dias, saldos isolados e botão flutuante de entrada rápida.
- `src/screens/ExtratoScreen.tsx`: Lista cronológica filtrável.
- `src/screens/ReportsScreen.tsx`: Renderização de DRE, fluxo projetado, metas de caixa e margem de produtos.
- `src/screens/SettingsScreen.tsx`: Gerenciamento de categorias, assinaturas recorrentes e transferências entre caixas.

## 5. Restrições Estritas
- Não utilize bibliotecas de terceiros para gráficos sem aprovação. Monte os gráficos usando componentes nativos do React Native (`View` estilizadas para barras/sparklines).
- Garanta que todas as labels passem pelo hook `useTranslation()`.
- Respeite a separação de pastas: `/src/screens`, `/src/components`, `/src/store`, `/src/utils`, `/src/types`.
- Evite qualquer lógica de negócios diretamente nos componentes. Use funções utilitárias ou o store para isso.
- Mantenha o código limpo, com comentários explicativos apenas onde necessário. Evite comentários óbvios.
- Use TypeScript rigorosamente, definindo tipos para estados, props e funções.
- Implemente testes unitários para as funções de manipulação de transações e parsing de comandos de voz.
- O código deve ser modular, reutilizável e fácil de manter, seguindo as melhores práticas de desenvolvimento React Native e TypeScript.
- Execute alterações de funcionalidade ou correção de bugs sem comprometer a estrutura e a qualidade do código existente, sem alterar a configuração, aparência ou comportamento esperado do aplicativo, faça apenas quando solicitado.

## 6. Entrega
- O código deve ser entregue em um repositório GitHub privado, com commits claros e descritivos.
- Inclua um README.md detalhado explicando a estrutura do projeto, como rodar o aplicativo e como executar os testes.
- Certifique-se de que o aplicativo esteja funcional e sem erros antes da entrega final.
- O prazo para entrega é de 4 semanas a partir da data de início do projeto.

## 7. Comunicação
- Mantenha uma comunicação clara e regular com a equipe, fornecendo atualizações de progresso e solicitando feedback quando necessário.
- Use ferramentas de comunicação designadas (ex: Slack, email) para discussões relacionadas ao projeto.
- Documente quaisquer decisões importantes ou mudanças de escopo no repositório para referência futura. 
- Esteja aberto a revisões de código e feedback construtivo para garantir a qualidade do produto final.
- Priorize a colaboração e o trabalho em equipe para alcançar os melhores resultados possíveis.

## 8. Manutenção e Suporte
- Após a entrega, esteja disponível para corrigir quaisquer bugs ou problemas que possam surgir durante o uso do aplicativo.
- Forneça suporte para atualizações futuras, incluindo melhorias de funcionalidade e adaptações as mudanças nas dependências ou no ambiente de desenvolvimento.
- Documente claramente o processo de manutenção e suporte para garantir que a equipe possa continuar a desenvolver o aplicativo de forma eficaz após a entrega inicial.
- Considere a implementação de um sistema de feedback dentro do aplicativo para que os usuários possam reportar problemas ou sugerir melhorias diretamente.
- Mantenha o código atualizado com as melhores práticas e padrões de desenvolvimento para garantir a longevidade e a escalabilidade do aplicativo.

