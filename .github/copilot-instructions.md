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