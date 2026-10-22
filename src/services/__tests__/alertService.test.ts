const mockAlert = { alert: jest.fn() };
jest.mock('react-native', () => ({
  Alert: mockAlert,
}));

import { Alert } from 'react-native';
import { useAlertStore } from '../../store/useAlertStore';
import { showFintechAlert, hideFintechAlert, setupFintechAlert } from '../alertService';

describe('alertService & useAlertStore (Fintech Premium Popups)', () => {
  beforeEach(() => {
    useAlertStore.getState().hideAlert();
    setupFintechAlert();
  });

  it('exibe alerta customizado via showFintechAlert', () => {
    showFintechAlert({
      title: 'Bem-vindo ao SeuGestor PRO!',
      message: 'Seu acesso foi liberado com sucesso.',
      type: 'success',
      icon: 'crown-outline',
      buttons: [{ text: 'OK' }],
    });

    const state = useAlertStore.getState();
    expect(state.visible).toBe(true);
    expect(state.config?.title).toBe('Bem-vindo ao SeuGestor PRO!');
    expect(state.config?.type).toBe('success');
    expect(state.config?.buttons?.length).toBe(1);
  });

  it('fecha o alerta ao chamar hideFintechAlert', () => {
    showFintechAlert({
      title: 'Teste',
      message: 'Mensagem',
    });

    expect(useAlertStore.getState().visible).toBe(true);
    hideFintechAlert();
    expect(useAlertStore.getState().visible).toBe(false);
  });

  it('intercepta chamadas de Alert.alert e redireciona para a modal Fintech', () => {
    Alert.alert('🌟 Bem-vindo ao SeuGestor PRO!', 'Acesso liberado com sucesso.');

    const state = useAlertStore.getState();
    expect(state.visible).toBe(true);
    expect(state.config?.title).toContain('SeuGestor PRO');
    expect(state.config?.type).toBe('success');
  });

  it('detecta alertas de exclusão como destrutivos', () => {
    Alert.alert('Excluir movimentação', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive' },
    ]);

    const state = useAlertStore.getState();
    expect(state.visible).toBe(true);
    expect(state.config?.type).toBe('destructive');
    expect(state.config?.buttons?.length).toBe(2);
  });

  it('detecta alertas de erro/atenção como warning', () => {
    Alert.alert('Atenção', 'Preencha o valor corretamente.');

    const state = useAlertStore.getState();
    expect(state.visible).toBe(true);
    expect(state.config?.type).toBe('warning');
  });
});
