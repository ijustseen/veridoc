import { ethers } from 'ethers';

// ABI для VeriDocRegistry контракта
const VERIDOC_REGISTRY_ABI = [
  "function createDocument(bytes32 documentHash, bool isPublic, uint32 expiresAt, address[] calldata signers, string[] calldata encryptedKeys, address[] calldata accessUsers) external returns (uint256)",
  "function signDocument(uint256 documentId, string calldata signatureBase64) external",
  "function verifyDocumentByHash(bytes32 documentHash) external view returns (bool exists, bool isCompleted, address owner, uint16 currentSignatures, uint16 requiredSignatures)",
  "function getDocumentInfo(uint256 documentId) external view returns (tuple(bytes32 documentHash, address owner, uint32 createdAt, uint32 expiresAt, uint16 requiredSignatures, uint16 currentSignatures, bool isPublic, bool isCompleted), uint16)",
  "function getDocumentSignatures(uint256 documentId) external view returns (address[] memory signers, bytes32[] memory signatureHashes, uint32[] memory signedTimes)",
  "function checkDocumentAccess(uint256 documentId, address user) external view returns (bool canRead, bool canSign, bool isOwner)",
  "function getUserDocuments(address user) external view returns (uint256[] memory ownedDocs, uint256[] memory invitedDocs)",
  "event DocumentCreated(uint256 indexed documentId, bytes32 indexed documentHash, address indexed owner, bool isPublic, uint16 requiredSignatures, uint32 expiresAt)",
  "event DocumentSigned(uint256 indexed documentId, address indexed signer, bytes32 signatureHash, uint32 signedAt, uint16 currentSignatures)",
  "event DocumentCompleted(uint256 indexed documentId, uint16 totalSignatures, uint32 completedAt)"
];

// Конфигурация сетей
const NETWORK_CONFIG = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    contractAddress: '', // Будет заполнено после деплоя
  },
  hardhat: {
    chainId: 1337,
    name: 'Hardhat',
    rpcUrl: 'http://localhost:8545',
    contractAddress: '', // Для локальных тестов
  }
};

export interface BlockchainDocument {
  documentId: number;
  documentHash: string;
  owner: string;
  createdAt: number;
  expiresAt: number;
  requiredSignatures: number;
  currentSignatures: number;
  isPublic: boolean;
  isCompleted: boolean;
}

export interface BlockchainSignature {
  signer: string;
  signatureHash: string;
  signedAt: number;
}

/**
 * Сервис для работы с блокчейном VeriDoc
 */
export class BlockchainService {
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private networkConfig: any = null;

  constructor(network: 'sepolia' | 'hardhat' = 'sepolia') {
    this.networkConfig = NETWORK_CONFIG[network];
  }

  /**
   * Инициализация сервиса с MetaMask
   */
  async initialize(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();

        // Проверяем сеть
        const network = await this.provider.getNetwork();
        if (Number(network.chainId) !== this.networkConfig.chainId) {
          await this.switchNetwork();
        }

        // Загружаем адрес контракта
        await this.loadContractAddress();

        // Инициализируем контракт
        if (this.networkConfig.contractAddress) {
          this.contract = new ethers.Contract(
            this.networkConfig.contractAddress,
            VERIDOC_REGISTRY_ABI,
            this.signer
          );
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Ошибка инициализации блокчейн сервиса:', error);
      return false;
    }
  }

  /**
   * Переключение на нужную сеть
   */
  private async switchNetwork(): Promise<void> {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${this.networkConfig.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // Если сеть не добавлена, добавляем её
      if (switchError.code === 4902 && this.networkConfig.chainId === 11155111) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia Test Network',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          }],
        });
      }
    }
  }

  /**
   * Загрузка адреса контракта из файла
   */
  private async loadContractAddress(): Promise<void> {
    try {
      const response = await fetch('/contract-addresses.json');
      const addresses = await response.json();
      
      if (this.networkConfig.chainId === 11155111 && addresses.sepolia) {
        this.networkConfig.contractAddress = addresses.sepolia.registry;
      }
    } catch (error) {
      console.warn('Не удалось загрузить адреса контрактов:', error);
    }
  }

  /**
   * Создание документа в блокчейне
   */
  async createDocument(
    documentHash: string,
    isPublic: boolean,
    signers: string[] = [],
    encryptedKeys: string[] = [],
    expiresAt: number = 0
  ): Promise<{ success: boolean; documentId?: number; txHash?: string; error?: string }> {
    try {
      if (!this.contract) {
        throw new Error('Контракт не инициализирован');
      }

      // Конвертируем хеш в bytes32
      const hashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(documentHash));

      console.log('🔹 Создаем документ в блокчейне...');
      console.log('Hash:', hashBytes32);
      console.log('IsPublic:', isPublic);
      console.log('Signers:', signers);

      const tx = await this.contract.createDocument(
        hashBytes32,
        isPublic,
        expiresAt,
        signers,
        encryptedKeys,
        [] // accessUsers - пока пустой
      );

      console.log('🔹 Транзакция отправлена:', tx.hash);
      const receipt = await tx.wait();
      console.log('🔹 Транзакция подтверждена');

      // Извлекаем ID документа из событий
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract!.interface.parseLog(log);
          return parsed?.name === 'DocumentCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        const documentId = Number(parsed!.args.documentId);
        
        return {
          success: true,
          documentId,
          txHash: tx.hash
        };
      }

      throw new Error('Не удалось получить ID документа из события');

    } catch (error) {
      console.error('Ошибка создания документа в блокчейне:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Подписание документа в блокчейне
   */
  async signDocument(
    documentId: number,
    documentHash: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Контракт или signer не инициализирован');
      }

      // Создаем подпись документа
      const message = `Signing document with hash: ${documentHash}`;
      const signature = await this.signer.signMessage(message);

      console.log('🔹 Подписываем документ в блокчейне...');
      console.log('Document ID:', documentId);
      console.log('Signature:', signature);

      const tx = await this.contract.signDocument(documentId, signature);
      console.log('🔹 Транзакция подписи отправлена:', tx.hash);
      
      await tx.wait();
      console.log('🔹 Подпись подтверждена в блокчейне');

      return {
        success: true,
        txHash: tx.hash
      };

    } catch (error) {
      console.error('Ошибка подписания документа в блокчейне:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Верификация документа по хешу
   */
  async verifyDocument(documentHash: string): Promise<{
    exists: boolean;
    isCompleted: boolean;
    owner: string;
    currentSignatures: number;
    requiredSignatures: number;
  }> {
    try {
      if (!this.contract) {
        throw new Error('Контракт не инициализирован');
      }

      const hashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(documentHash));
      const result = await this.contract.verifyDocumentByHash(hashBytes32);

      return {
        exists: result.exists,
        isCompleted: result.isCompleted,
        owner: result.owner,
        currentSignatures: Number(result.currentSignatures),
        requiredSignatures: Number(result.requiredSignatures)
      };

    } catch (error) {
      console.error('Ошибка верификации документа:', error);
      return {
        exists: false,
        isCompleted: false,
        owner: '',
        currentSignatures: 0,
        requiredSignatures: 0
      };
    }
  }

  /**
   * Получение информации о документе
   */
  async getDocumentInfo(documentId: number): Promise<BlockchainDocument | null> {
    try {
      if (!this.contract) {
        throw new Error('Контракт не инициализирован');
      }

      const result = await this.contract.getDocumentInfo(documentId);
      const doc = result[0]; // Первый элемент - структура документа

      return {
        documentId,
        documentHash: doc.documentHash,
        owner: doc.owner,
        createdAt: Number(doc.createdAt),
        expiresAt: Number(doc.expiresAt),
        requiredSignatures: Number(doc.requiredSignatures),
        currentSignatures: Number(doc.currentSignatures),
        isPublic: doc.isPublic,
        isCompleted: doc.isCompleted
      };

    } catch (error) {
      console.error('Ошибка получения информации о документе:', error);
      return null;
    }
  }

  /**
   * Получение подписей документа
   */
  async getDocumentSignatures(documentId: number): Promise<BlockchainSignature[]> {
    try {
      if (!this.contract) {
        throw new Error('Контракт не инициализирован');
      }

      const result = await this.contract.getDocumentSignatures(documentId);
      const [signers, signatureHashes, signedTimes] = result;

      const signatures: BlockchainSignature[] = [];
      for (let i = 0; i < signers.length; i++) {
        signatures.push({
          signer: signers[i],
          signatureHash: signatureHashes[i],
          signedAt: Number(signedTimes[i])
        });
      }

      return signatures;

    } catch (error) {
      console.error('Ошибка получения подписей документа:', error);
      return [];
    }
  }

  /**
   * Получение документов пользователя
   */
  async getUserDocuments(userAddress: string): Promise<{
    ownedDocs: number[];
    invitedDocs: number[];
  }> {
    try {
      if (!this.contract) {
        throw new Error('Контракт не инициализирован');
      }

      const result = await this.contract.getUserDocuments(userAddress);
      
      return {
        ownedDocs: result.ownedDocs.map((id: any) => Number(id)),
        invitedDocs: result.invitedDocs.map((id: any) => Number(id))
      };

    } catch (error) {
      console.error('Ошибка получения документов пользователя:', error);
      return {
        ownedDocs: [],
        invitedDocs: []
      };
    }
  }

  /**
   * Проверка прав доступа к документу
   */
  async checkDocumentAccess(documentId: number, userAddress: string): Promise<{
    canRead: boolean;
    canSign: boolean;
    isOwner: boolean;
  }> {
    try {
      if (!this.contract) {
        throw new Error('Контракт не инициализирован');
      }

      const result = await this.contract.checkDocumentAccess(documentId, userAddress);
      
      return {
        canRead: result.canRead,
        canSign: result.canSign,
        isOwner: result.isOwner
      };

    } catch (error) {
      console.error('Ошибка проверки прав доступа:', error);
      return {
        canRead: false,
        canSign: false,
        isOwner: false
      };
    }
  }

  /**
   * Получение адреса контракта
   */
  getContractAddress(): string | null {
    return this.networkConfig?.contractAddress || null;
  }

  /**
   * Получение текущей сети
   */
  getNetworkInfo() {
    return this.networkConfig;
  }
}

// Синглтон экземпляр
let blockchainServiceInstance: BlockchainService | null = null;

export function getBlockchainService(): BlockchainService {
  if (!blockchainServiceInstance) {
    blockchainServiceInstance = new BlockchainService();
  }
  return blockchainServiceInstance;
}