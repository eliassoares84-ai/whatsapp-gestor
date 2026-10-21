/**
 * Interface abstrata para adaptadores de armazenamento persistente.
 * Permite alternar entre AsyncStorage, SQLite, MMKV ou WatermelonDB
 * sem acoplamento direto com as telas ou com a store do Zustand.
 */
export interface IStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
