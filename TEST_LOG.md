# TEST_LOG - Stress & Stability

## Como usar este roteiro
- Marque cada item com [x] quando validado.
- Execute os testes em dispositivo fisico quando possivel.
- Registre observacoes no campo "Resultado real".

## Ambiente de teste
- App build: __________________________
- Plataforma: Android ( ) iOS ( )
- Data/hora: __________________________
- Responsavel: ________________________

## Tarefa 1 - Injecao de dados massivos (1000 transacoes / 6 meses)
- [ ] Executar `injectMassiveTransactions(1000, 6)` de [src/utils/stressTestUtils.ts](src/utils/stressTestUtils.ts).
- [ ] Confirmar retorno com `inserted: 1000`.
- [ ] Abrir Dashboard e rolar lista de transacoes por 30s.
- [ ] Abrir Reports e alternar meses rapidamente por 30s.
- [ ] Validar que nao ha travamento, freeze longo (> 2s) ou crash.

Resultado real:
- FPS percebido / fluidez: __________________________________________
- Anomalias observadas: _____________________________________________

## Tarefa 2 - Falha de conexao e API Gemini
- [ ] Simular offline com `runGeminiFailureSimulation("gastei 50 no uber", "offline")`.
- [ ] Validar mensagem amigavel retornada.
- [ ] Simular chave invalida com `runGeminiFailureSimulation("recebi 1200", "invalid-key")`.
- [ ] Validar mensagem amigavel retornada.
- [ ] Simular timeout com `runGeminiFailureSimulation("paguei internet 200", "timeout")`.
- [ ] Validar que o modal sai do estado "Carregando..." (sem loop infinito).

Resultado real:
- Mensagens exibidas: ________________________________________________
- Estado do loading apos erro: ______________________________________

## Tarefa 3 - Concorrencia e troca rapida de workspaces
- [ ] Garantir 3 workspaces ativos (exemplo: personal, indikcon, snackscoffee).
- [ ] Executar `runWorkspaceSwitchRace()` de [src/utils/stressTestUtils.ts](src/utils/stressTestUtils.ts).
- [ ] Validar resultado com `leaked: 0`.
- [ ] Revisar transacoes geradas com prefixo `[RACE:<workspace>]`.
- [ ] Confirmar que cada transacao ficou no workspace correto.

Resultado real:
- Total criado: ___________________
- Vazamentos detectados: ___________________
- IDs com vazamento (se houver): ____________________________________

## Tarefa 4 - Importacao corrompida
- [ ] Executar `runCorruptedImportGuardTest()` de [src/utils/stressTestUtils.ts](src/utils/stressTestUtils.ts).
- [ ] Validar `safe: true`.
- [ ] Validar que dados existentes continuam identicos apos cada tentativa invalida.
- [ ] Confirmar exibicao de alerta amigavel para JSON malformado/invalido.

Resultado real:
- Estado preservado apos erro: Sim ( ) Nao ( )
- Alertas exibidos corretamente: Sim ( ) Nao ( )

## Tarefa 5 - Permissoes negadas
- [ ] Negar biometria no SO e tentar desbloquear app.
- [ ] Validar fallback/explicacao sem crash.
- [ ] Negar notificacoes no SO.
- [ ] Criar/editar recorrencia e validar que app continua funcional sem notificacao.
- [ ] Coletar snapshot com `getPermissionFallbackSnapshot()`.

Resultado real:
- Comportamento da biometria negada: ________________________________
- Comportamento das notificacoes negadas: ___________________________

## Criterios de aprovacao final
- [ ] Nenhum crash em todos os cenarios acima.
- [ ] Nenhum loading infinito.
- [ ] Nenhum vazamento entre workspaces.
- [ ] Nenhuma sobrescrita por backup corrompido.
- [ ] Fallbacks de permissao funcionando com UX clara.

Status geral: Aprovado ( ) Reprovado ( )
Observacoes finais:
_____________________________________________________________________
_____________________________________________________________________
