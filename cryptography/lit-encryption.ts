import { getAuthPKPService } from '@/lib/auth-pkp';

export interface LitEncryptionResult {
  success: boolean;
  data?: {
    ciphertext: string;
    dataToEncryptHash: string;
    accessControlConditions: any[];
  };
  error?: string;
}

export interface LitDecryptionResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Шифрует данные с использованием Lit Protocol для группы кошельков
 */
export async function encryptForWallets(
  data: string,
  walletAddresses: string[],
  authSig: any,
  expirationTimestamp?: number
): Promise<LitEncryptionResult> {
  try {
    if (!data || !walletAddresses || walletAddresses.length === 0) {
      throw new Error('Данные и список кошельков обязательны');
    }

    const authPKPService = getAuthPKPService();
    await authPKPService.initialize();

    // Создаем условия доступа для кошельков
    let accessConditions = authPKPService.createMultiWalletAccessConditions(walletAddresses);
    
    // Добавляем временные ограничения если указаны
    if (expirationTimestamp) {
      const timeConditions = authPKPService.createTimeBasedAccessConditions(expirationTimestamp);
      accessConditions = authPKPService.combineAccessConditions(accessConditions, timeConditions);
    }

    // Шифруем данные
    const encryptionResult = await authPKPService.encryptForPKP(
      data,
      accessConditions,
      authSig
    );

    return {
      success: true,
      data: encryptionResult
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка шифрования'
    };
  }
}

/**
 * Расшифровывает данные с использованием PKP
 */
export async function decryptWithPKP(
  ciphertext: string,
  dataToEncryptHash: string,
  accessControlConditions: any[],
  authSig: any
): Promise<LitDecryptionResult> {
  try {
    if (!ciphertext || !dataToEncryptHash || !accessControlConditions || !authSig) {
      throw new Error('Все параметры расшифрования обязательны');
    }

    const authPKPService = getAuthPKPService();
    await authPKPService.initialize();

    const decryptedData = await authPKPService.decryptWithPKP({
      ciphertext,
      dataToEncryptHash,
      accessControlConditions,
      authSig
    });

    return {
      success: true,
      data: decryptedData
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка расшифрования'
    };
  }
}

/**
 * Шифрует AES ключ для документа с использованием Lit Protocol
 */
export async function encryptAESKeyForDocument(
  aesKey: string,
  signerWallets: string[],
  authSig: any,
  expirationTimestamp?: number
): Promise<LitEncryptionResult> {
  return encryptForWallets(aesKey, signerWallets, authSig, expirationTimestamp);
}

/**
 * Расшифровывает AES ключ документа с использованием PKP
 */
export async function decryptAESKeyWithPKP(
  ciphertext: string,
  dataToEncryptHash: string,
  accessControlConditions: any[],
  authSig: any
): Promise<LitDecryptionResult> {
  return decryptWithPKP(ciphertext, dataToEncryptHash, accessControlConditions, authSig);
}

/**
 * Проверяет, может ли кошелек получить доступ к зашифрованным данным
 */
export function canWalletAccess(
  walletAddress: string,
  accessControlConditions: any[]
): boolean {
  try {
    const authPKPService = getAuthPKPService();
    return authPKPService.canWalletAccess(walletAddress, accessControlConditions);
  } catch (error) {
    console.error('Ошибка проверки доступа:', error);
    return false;
  }
}