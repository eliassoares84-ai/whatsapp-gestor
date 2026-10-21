jest.mock('@react-native-async-storage/async-storage', () => {
  let mockStore: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStore[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockStore[key];
    }),
    __clearMockStore: () => {
      mockStore = {};
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { financeStorageAdapter } from '../asyncStorageAdapter';

describe('SafeAsyncStorageAdapter', () => {
  beforeEach(() => {
    (AsyncStorage as any).__clearMockStore();
    financeStorageAdapter.clearMemoryCache();
    jest.clearAllMocks();
  });

  it('salva e recupera dados com sucesso', async () => {
    await financeStorageAdapter.setItem('teste-key', JSON.stringify({ saldo: 1500 }));
    const result = await financeStorageAdapter.getItem('teste-key');

    expect(result).toBe(JSON.stringify({ saldo: 1500 }));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'teste-key',
      JSON.stringify({ saldo: 1500 })
    );
  });

  it('remove itens corretamente', async () => {
    await financeStorageAdapter.setItem('chave-remocao', 'valor');
    await financeStorageAdapter.removeItem('chave-remocao');

    const result = await financeStorageAdapter.getItem('chave-remocao');
    expect(result).toBeNull();
  });

  it('utiliza fallback em memória se o AsyncStorage falhar', async () => {
    // Simula erro de disco no AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Disk read error'));

    // Grava primeiro
    await financeStorageAdapter.setItem('fallback-key', 'dados-seguros');

    // Tenta ler com erro do AsyncStorage
    const result = await financeStorageAdapter.getItem('fallback-key');

    // Deve resgatar da memória sem quebrar a aplicação
    expect(result).toBe('dados-seguros');
  });

  it('não quebra a aplicação se o setItem do AsyncStorage lançar exceção', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Disk write error'));

    // Não deve lançar erro
    await expect(
      financeStorageAdapter.setItem('key-write-fail', 'valor-resiliente')
    ).resolves.not.toThrow();

    // O valor continua preservado no cache em memória
    const result = await financeStorageAdapter.getItem('key-write-fail');
    expect(result).toBe('valor-resiliente');
  });
});
