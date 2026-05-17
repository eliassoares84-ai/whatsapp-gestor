# Tutorial Visual - Guia de Implementação

## Visão Geral

Um guia visual interativo (onboarding) que aparece na primeira vez que o usuário chega ao Dashboard após completar o onboarding inicial.

## Componentes Criados

### 1. `TutorialOverlay.tsx`
**Localização**: `src/components/TutorialOverlay.tsx`

Um overlay com spotlight que destaca áreas específicas da tela com um balão de dica.

**Props**:
- `fabPosition`: Posição do botão flutuante (FAB) `{ x, y, size }`
- `workspaceSelectorPosition`: Posição do seletor de workspaces `{ x, y, width, height }`

**Interface Interna**:
```typescript
interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetArea?: { x, y, width, height };
  balloonPosition?: 'top' | 'bottom' | 'left' | 'right';
}
```

**3 Passos do Tutorial**:

1. **Entrada por Voz** 🎤
   - Destaca o botão "+"
   - Instrução: "Diga algo como: 'Gastei 50 reais com café na Snackscoffee' e eu cuido do resto."
   - Ajuda o usuário a entender a função de entrada rápida por voz

2. **Troca de Contexto** 🏢
   - Destaca o seletor de workspaces
   - Instrução: "Separe sua vida pessoal das suas empresas com um toque. Cada workspace tem suas transações isoladas."
   - Mostra como isolar dados por context

3. **Confirmação** ✅
   - Balão centralizado
   - Instrução: "Eu sempre vou te perguntar se entendi direito antes de salvar. Nada é salvo sem sua aprovação."
   - Estabelece confiança no sistema

**Recursos**:
- ✨ Animações suaves com `Animated` do React Native
- 🎯 Spotlight com fundo semi-transparente
- 📍 Balão flutuante com seta apontando para o target
- ⏭️ Indicadores de progresso (dots)
- ⏭️ Botão "Próximo" / "Começar"
- ⏭️ Botão "Pular Tudo"

### 2. Alterações no Store (`useFinanceStore.ts`)

**Novo Flag**:
```typescript
hasSeenTutorial: boolean; // Default: false
```

**Nova Ação**:
```typescript
markTutorialAsSeen: () => void; // Marca tutorial como visto
```

A interface `FinanceBackupState` foi atualizada para incluir `hasSeenTutorial?.

### 3. Integração no `DashboardScreen.tsx`

**Lógica de Exibição**:
```typescript
const shouldShowTutorial = hasCompletedOnboarding && !hasSeenTutorial;
```

O tutorial aparece APENAS quando:
- ✅ Usuário completou o onboarding (`hasCompletedOnboarding === true`)
- ✅ E nunca viu o tutorial antes (`hasSeenTutorial === false`)

**Captura de Posições**:
- Usa `onLayout` no header para obter `workspaceSelectorLayout`
- Calcula `fabPosition` a partir das dimensões da window e offset

**Renderização Condicional**:
```jsx
{shouldShowTutorial && (
  <TutorialOverlay
    fabPosition={fabPosition}
    workspaceSelectorPosition={workspaceSelectorLayout}
  />
)}
```

## Fluxo de Uso

### Primeira Vez (Novo Usuário)
```
Onboarding Completo → hasCompletedOnboarding = true
                    ↓
              Dashboard Renderizado
                    ↓
           TutorialOverlay Aparece (hasSeenTutorial = false)
                    ↓
            Usuário vê 3 passos interativos
                    ↓
       Clica "Começar" no último passo OU "Pular Tudo"
                    ↓
            markTutorialAsSeen() chamado
                    ↓
         hasSeenTutorial = true (persistido no store)
                    ↓
        Dashboard sem tutorial para próximas visitas
```

### Usuários Retornantes
- Tutorial não aparece (já foi visto)
- Experiência fluida do Dashboard

## Estilos e Animações

### Tema
- **Overlay**: Fundo `rgba(0, 0, 0, 0.85)` semi-transparente
- **Spotlight**: Feito com `borderRadius` dinâmico
- **Balão**: Estilo card premium `#1A1A1A` com borda `#333`
- **Seta**: Triângulo apontando para o target

### Animações
- **Fade In/Out**: 400ms no entrada, 200ms na saída
- **Slide Up**: Movimento sutil de 50px
- **Transição entre Passos**: Suave com timing sincronizado

## Integração Futura

### Próximo Passo: Parseamento de Voz
Na tela `FastEntryModal`, a função `parseVoiceCommand(text: string)` usará este tutorial como base para orientar o usuário:

```typescript
// Exemplo de transcrição
"Gastei 50 reais com café"
    ↓ parseVoiceCommand()
{
  type: 'expense',
  amount: 50,
  categoryId: 'alimentacao',
  note: 'café'
}
```

## Boas Práticas Implementadas

✅ **Persistência**: Flag salvo no Zustand com AsyncStorage middleware
✅ **Responsividade**: Calcula posições dinamicamente
✅ **Acessibilidade**: Botões claros, texto grande, cores contrastantes
✅ **Performance**: Componente leve, sem bibliotecas externas de animação
✅ **UX**: Loop rápido sem bloquear o app
✅ **Tipo-segurança**: TypeScript com tipos precisos

## Testando Localmente

1. Novo usuário: Limpe asyncstorage ou delete app data
2. Complete o onboarding (DefineProfileScreen)
3. Chegue ao Dashboard → Tutorial aparece automaticamente
4. Clique em "Próximo" para navegar entre os 3 passos
5. Clique "Começar" no último passo
6. Retorne ao Dashboard → Tutorial não aparece mais
