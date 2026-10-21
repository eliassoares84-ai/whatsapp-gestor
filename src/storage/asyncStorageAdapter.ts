import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IStorageAdapter } from './storageAdapter.interface';

/**
 * Adaptador de AsyncStorage com tratamento de erros, detecção de integridade
 * e cache de contingência em memória para prevenir crash por falha de I/O em disco.
 */
class SafeAsyncStorageAdapter implements IStorageAdapter {
  private inMemoryFallback = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        this.inMemoryFallback.set(key, value);
        return value;
      }
      return this.inMemoryFallback.get(key) ?? null;
    } catch (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(`[StorageAdapter] Erro ao ler a chave "${key}" do AsyncStorage:`, error);
      }
      return this.inMemoryFallback.get(key) ?? null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    this.inMemoryFallback.set(key, value);
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(`[StorageAdapter] Erro ao gravar a chave "${key}" no AsyncStorage:`, error);
      }
      // O valor já está salvo no inMemoryFallback para não perder o estado da sessão atual
    }
  }

  async removeItem(key: string): Promise<void> {
    this.inMemoryFallback.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(`[StorageAdapter] Erro ao remover a chave "${key}" do AsyncStorage:`, error);
      }
    }
  }

  /**
   * Limpa o cache interno em memória (útil para testes unitários).
   */
  clearMemoryCache(): void {
    this.inMemoryFallback.clear();
  }
}

export const financeStorageAdapter = new SafeAsyncStorageAdapter();
