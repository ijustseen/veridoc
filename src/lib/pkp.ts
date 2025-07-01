import { getLitNodeClient } from './lit';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { ethers } from 'ethers';

export interface PKPInfo {
  tokenId: string;
  publicKey: string;
  ethAddress: string;
}

export interface EncryptionResult {
  ciphertext: string;
  dataToEncryptHash: string;
  accessControlConditions: any[];
}

export interface DecryptionParams {
  ciphertext: string;
  dataToEncryptHash: string;
  accessControlConditions: any[];
  pkpPublicKey: string;
}

/**
 * Сервис для работы с PKP (Programmable Key Pairs)
 */
export class PKPService {
  private litNodeClient = null;
  private litContracts: LitContracts | null = null;
  
  /**
   * Инициализация сервиса
   */
  async initialize() {
    this.litNodeClient = await getLitNodeClient();
    
    // Инициализируем контракты для Datil-dev testnet
    this.litContracts = new LitContracts({
      signer: this.getEthereumSigner(),
      network: 'datil-dev'
    });
    
    await this.litContracts.connect();
  }

  /**
   * Получает Ethereum signer из MetaMask
   */
  private getEthereumSigner(): ethers.Signer {
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      return provider.getSigner();
    }
    throw new Error('MetaMask не найден');
  }

  /**
   * Создает новый PKP через прямое взаимодействие с контрактами
   */
  async createPKPWithWallet(walletAddress: string): Promise<PKPInfo> {
    if (!this.litContracts) {
      await this.initialize();
    }

    try {
      // Минтим PKP напрямую через контракт
      const mintTx = await this.litContracts!.pkpNftContractUtils.write.mint();
      const mintReceipt = await mintTx.wait();

      // Извлекаем tokenId из events
      const mintedEvent = mintReceipt.logs.find(
        (log: any) => log.eventName === 'Transfer'
      );
      
      if (!mintedEvent || !mintedEvent.args) {
        throw new Error('Не удалось найти событие минтинга PKP');
      }

      const tokenId = mintedEvent.args.tokenId.toString();

      // Получаем публичный ключ PKP
      const publicKey = await this.litContracts!.pkpNftContractUtils.read.getPubkey(tokenId);
      
      // Получаем Ethereum адрес PKP
      const ethAddress = await this.litContracts!.pkpNftContractUtils.read.getEthAddress(tokenId);

      return {
        tokenId,
        publicKey: `0x${publicKey}`,
        ethAddress
      };

    } catch (error) {
      console.error('Ошибка создания PKP:', error);
      throw new Error(`Ошибка создания PKP: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Получает PKP по tokenId
   */
  async getPKPByTokenId(tokenId: string): Promise<PKPInfo | null> {
    try {
      // Здесь нужно реализовать получение PKP данных
      // Пока возвращаем null, так как нужна дополнительная логика
      return null;
    } catch (error) {
      console.error('Error getting PKP by token ID:', error);
      return null;
    }
  }

  /**
   * Шифрует данные с условиями доступа для PKP
   */
  async encryptForPKP(
    data: string,
    pkpPublicKey: string,
    accessConditions: any[]
  ): Promise<EncryptionResult> {
    if (!this.litNodeClient) {
      await this.initialize();
    }

    const { ciphertext, dataToEncryptHash } = await this.litNodeClient.encrypt({
      dataToEncrypt: new TextEncoder().encode(data),
      accessControlConditions: accessConditions
    });

    return {
      ciphertext,
      dataToEncryptHash,
      accessControlConditions: accessConditions
    };
  }

  /**
   * Инициализация только Lit Node Client без MetaMask (для сервера)
   */
  async initializeServerOnly() {
    if (!this.litNodeClient) {
      this.litNodeClient = await getLitNodeClient();
    }
  }

  /**
   * Шифрует данные с использованием authSig без необходимости подключения MetaMask
   */
  async encryptWithAuthSig(
    data: string,
    accessConditions: any[],
    authSig: any
  ): Promise<EncryptionResult> {
    if (!this.litNodeClient) {
      await this.initializeServerOnly();
    }

    const { ciphertext, dataToEncryptHash } = await this.litNodeClient.encrypt({
      dataToEncrypt: new TextEncoder().encode(data),
      accessControlConditions: accessConditions,
      authSig: authSig
    });

    return {
      ciphertext,
      dataToEncryptHash,
      accessControlConditions: accessConditions
    };
  }

  /**
   * Расшифровывает данные с помощью PKP
   */
  async decryptWithPKP(params: DecryptionParams): Promise<string> {
    if (!this.litNodeClient) {
      await this.initialize();
    }

    const decryptedData = await this.litNodeClient.decrypt({
      ciphertext: params.ciphertext,
      dataToEncryptHash: params.dataToEncryptHash,
      accessControlConditions: params.accessControlConditions,
      authSig: {
        // Здесь нужна подпись PKP
        // Реализуется через PKP wallet
      }
    });

    return new TextDecoder().decode(decryptedData.decryptedData);
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

    // Объединяем условия через OR
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
}

// Singleton instance
let pkpService: PKPService | null = null;

export function getPKPService(): PKPService {
  if (!pkpService) {
    pkpService = new PKPService();
  }
  return pkpService;
}