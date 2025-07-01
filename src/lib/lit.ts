import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_CHAINS } from '@lit-protocol/constants';

export interface LitConfig {
  network: string;
  debug: boolean;
}

// Конфигурация Lit Protocol
export const litConfig: LitConfig = {
  network: 'datil-dev', // testnet для разработки
  debug: process.env.NODE_ENV === 'development'
};

// Singleton instance Lit Node Client
let litNodeClient: LitNodeClient | null = null;

/**
 * Получает или создает Lit Node Client
 */
export async function getLitNodeClient(): Promise<LitNodeClient> {
  if (!litNodeClient) {
    litNodeClient = new LitNodeClient({
      litNetwork: litConfig.network as any,
      debug: litConfig.debug
    });
    
    await litNodeClient.connect();
  }
  
  return litNodeClient;
}


/**
 * Отключает Lit clients
 */
export async function disconnectLit(): Promise<void> {
  if (litNodeClient) {
    await litNodeClient.disconnect();
    litNodeClient = null;
  }
}

/**
 * Проверяет подключение к Lit Network
 */
export async function checkLitConnection(): Promise<boolean> {
  try {
    const client = await getLitNodeClient();
    return client.ready;
  } catch (error) {
    console.error('Lit connection error:', error);
    return false;
  }
}

/**
 * Получает поддерживаемые цепочки
 */
export function getSupportedChains() {
  return LIT_CHAINS;
}