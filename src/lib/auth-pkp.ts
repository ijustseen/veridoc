import { getLitNodeClient } from './lit';
import { ethers } from 'ethers';
import { generateAuthSig } from '@lit-protocol/auth-helpers';

export interface AuthPKPInfo {
  tokenId: string;
  publicKey: string;
  ethAddress: string;
  authSig: any;
}

/**
 * PKP сервис через подпись MetaMask при авторизации
 * Простой и безопасный способ создания PKP
 */
export class AuthPKPService {
  private litNodeClient: any = null;
  
  async initialize() {
    this.litNodeClient = await getLitNodeClient();
  }

  /**
   * Создает PKP через подпись MetaMask при авторизации
   */
  async createPKPWithAuthSignature(walletAddress: string): Promise<AuthPKPInfo> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask не найден');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Создаем сообщение для подписи
      const message = `Создание PKP для VeriDoc\nАдрес: ${walletAddress}\nВремя: ${new Date().toISOString()}`;
      
      // Получаем подпись от пользователя
      const signature = await signer.signMessage(message);
      
      // Создаем authSig объект
      const authSig = await generateAuthSig({
        signer: signer,
        toSign: message,
      });

      // Генерируем детерминированный PKP на основе подписи
      const pkpSeed = ethers.keccak256(ethers.toUtf8Bytes(signature + walletAddress));
      const pkpWallet = new ethers.Wallet(pkpSeed);
      const publicKey = pkpWallet.signingKey.publicKey;

      // Создаем уникальный tokenId
      const tokenId = ethers.keccak256(
        ethers.solidityPacked(
          ['address', 'string', 'uint256'],
          [walletAddress, signature, Date.now()]
        )
      );

      return {
        tokenId: tokenId,
        publicKey: publicKey,
        ethAddress: pkpWallet.address,
        authSig: authSig
      };

    } catch (error) {
      console.error('Ошибка создания PKP через подпись:', error);
      throw new Error(`Ошибка создания PKP: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Восстанавливает PKP по подписи (для последующих сессий)
   */
  async restorePKPFromSignature(walletAddress: string, signature: string): Promise<AuthPKPInfo> {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();

      // Воссоздаем authSig
      const message = `Восстановление PKP для VeriDoc\nАдрес: ${walletAddress}`;
      const authSig = await generateAuthSig({
        signer: signer,
        toSign: message,
      });

      // Восстанавливаем PKP из той же подписи
      const pkpSeed = ethers.keccak256(ethers.toUtf8Bytes(signature + walletAddress));
      const pkpWallet = new ethers.Wallet(pkpSeed);
      const publicKey = pkpWallet.signingKey.publicKey;

      const tokenId = ethers.keccak256(
        ethers.solidityPacked(
          ['address', 'string'],
          [walletAddress, signature]
        )
      );

      return {
        tokenId: tokenId,
        publicKey: publicKey,
        ethAddress: pkpWallet.address,
        authSig: authSig
      };

    } catch (error) {
      throw new Error(`Ошибка восстановления PKP: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Шифрует данные с использованием Lit Protocol
   */
  async encryptForPKP(
    data: string,
    accessConditions: any[],
    authSig: any
  ): Promise<{
    ciphertext: string;
    dataToEncryptHash: string;
    accessControlConditions: any[];
  }> {
    try {
      if (!this.litNodeClient) {
        await this.initialize();
      }

      const { ciphertext, dataToEncryptHash } = await this.litNodeClient!.encrypt({
        accessControlConditions: accessConditions,
        authSig: authSig,
        chain: 'polygon',
        dataToEncrypt: new TextEncoder().encode(data),
      });

      return {
        ciphertext,
        dataToEncryptHash,
        accessControlConditions: accessConditions
      };

    } catch (error) {
      throw new Error(`Ошибка шифрования: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Расшифровывает данные с использованием Lit Protocol
   */
  async decryptWithPKP(params: {
    ciphertext: string;
    dataToEncryptHash: string;
    accessControlConditions: any[];
    authSig: any;
  }): Promise<string> {
    try {
      if (!this.litNodeClient) {
        await this.initialize();
      }

      const { decryptedData } = await this.litNodeClient!.decrypt({
        accessControlConditions: params.accessControlConditions,
        ciphertext: params.ciphertext,
        dataToEncryptHash: params.dataToEncryptHash,
        authSig: params.authSig,
        chain: 'polygon',
      });

      return new TextDecoder().decode(decryptedData);

    } catch (error) {
      throw new Error(`Ошибка расшифрования: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Создает условия доступа для конкретного кошелька
   */
  createWalletAccessConditions(walletAddress: string) {
    return [
      {
        contractAddress: '',
        standardContractType: '',
        chain: 'polygon',
        method: '',
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '=',
          value: walletAddress.toLowerCase()
        }
      }
    ];
  }

  /**
   * Создает условия доступа для группы кошельков
   */
  createMultiWalletAccessConditions(walletAddresses: string[]) {
    const conditions = walletAddresses.map(address => ({
      contractAddress: '',
      standardContractType: '',
      chain: 'polygon',
      method: '',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '=',
        value: address.toLowerCase()
      }
    }));

    if (conditions.length === 1) {
      return conditions;
    }

    const result = [];
    for (let i = 0; i < conditions.length; i++) {
      result.push(conditions[i]);
      if (i < conditions.length - 1) {
        result.push({ operator: 'or' });
      }
    }

    return result;
  }

  /**
   * Создает временные условия доступа
   */
  createTimeBasedAccessConditions(expirationTimestamp: number) {
    return [
      {
        contractAddress: '',
        standardContractType: 'timestamp',
        chain: 'polygon',
        method: 'eth_getBlockByNumber',
        parameters: ['latest', false],
        returnValueTest: {
          comparator: '<=',
          value: expirationTimestamp.toString()
        }
      }
    ];
  }

  /**
   * Комбинирует условия доступа (кошелек + время)
   */
  combineAccessConditions(
    walletConditions: any[],
    timeConditions: any[]
  ) {
    return [
      ...walletConditions,
      { operator: 'and' },
      ...timeConditions
    ];
  }

  /**
   * Проверяет, может ли кошелек получить доступ
   */
  canWalletAccess(walletAddress: string, accessControlConditions: any[]): boolean {
    try {
      const walletLower = walletAddress.toLowerCase();
      
      return accessControlConditions.some(condition => {
        if (condition.returnValueTest && condition.returnValueTest.value) {
          return condition.returnValueTest.value === walletLower;
        }
        return false;
      });
    } catch (error) {
      console.error('Ошибка проверки доступа:', error);
      return false;
    }
  }
}

// Singleton instance
let authPKPService: AuthPKPService | null = null;

export function getAuthPKPService(): AuthPKPService {
  if (!authPKPService) {
    authPKPService = new AuthPKPService();
  }
  return authPKPService;
}