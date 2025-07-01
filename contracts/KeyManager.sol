// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Registry.sol";

/**
 * @title VeriDocKeyManager
 * @dev Управление зашифрованными ключами для VeriDoc
 * Реализует логику "синхронизации ключей" из README.md
 */
contract VeriDocKeyManager {
    
    VeriDocRegistry public immutable veriDocRegistry;
    
    // Структура синхронизированного ключа (после подписания)
    struct SynchronizedKey {
        string encryptedKey;        // Ключ, зашифрованный private key подписанта
        bytes32 keyHash;           // Хеш для верификации
        uint32 synchronizedAt;     // Время синхронизации
        bool isActive;             // Активен ли ключ
    }
    
    // Маппинги для синхронизированных ключей
    mapping(uint256 => mapping(address => SynchronizedKey)) public synchronizedKeys; // documentId => signer => key
    mapping(uint256 => address[]) public synchronizedSigners; // documentId => signers who synchronized
    
    // События
    event KeySynchronized(
        uint256 indexed documentId,
        address indexed signer,
        bytes32 keyHash,
        uint32 synchronizedAt
    );
    
    event KeyRevoked(
        uint256 indexed documentId,
        address indexed signer,
        uint32 revokedAt
    );
    
    constructor(address _veriDocRegistry) {
        require(_veriDocRegistry != address(0), "Invalid registry address");
        veriDocRegistry = VeriDocRegistry(_veriDocRegistry);
    }
    
    /**
     * @dev Синхронизирует ключ после подписания документа
     * Реализует шаг 4 из README.md: "создает новый зашифрованый ключ"
     * @param documentId ID документа
     * @param encryptedKey Ключ, зашифрованный private key подписанта
     * @param keyHash Хеш ключа для верификации
     */
    function synchronizeKey(
        uint256 documentId,
        string calldata encryptedKey,
        bytes32 keyHash
    ) external {
        // Проверяем, что пользователь подписал документ
        require(_hasSignedDocument(documentId, msg.sender), "Document not signed by user");
        require(bytes(encryptedKey).length > 0, "Invalid encrypted key");
        require(keyHash != bytes32(0), "Invalid key hash");
        require(!synchronizedKeys[documentId][msg.sender].isActive, "Key already synchronized");
        
        // Сохраняем синхронизированный ключ
        synchronizedKeys[documentId][msg.sender] = SynchronizedKey({
            encryptedKey: encryptedKey,
            keyHash: keyHash,
            synchronizedAt: uint32(block.timestamp),
            isActive: true
        });
        
        // Добавляем в список синхронизированных подписантов
        synchronizedSigners[documentId].push(msg.sender);
        
        emit KeySynchronized(documentId, msg.sender, keyHash, uint32(block.timestamp));
    }
    
    /**
     * @dev Получает синхронизированный ключ подписанта
     * @param documentId ID документа
     * @param signer Адрес подписанта
     * @return encryptedKey Зашифрованный ключ
     * @return keyHash Хеш ключа
     * @return synchronizedAt Время синхронизации
     * @return isActive Активен ли ключ
     */
    function getSynchronizedKey(
        uint256 documentId,
        address signer
    ) external view returns (
        string memory encryptedKey,
        bytes32 keyHash,
        uint32 synchronizedAt,
        bool isActive
    ) {
        require(_canAccessKey(documentId, signer, msg.sender), "Access denied");
        
        SynchronizedKey memory key = synchronizedKeys[documentId][signer];
        return (key.encryptedKey, key.keyHash, key.synchronizedAt, key.isActive);
    }
    
    /**
     * @dev Получает всех подписантов, которые синхронизировали ключи
     * @param documentId ID документа
     * @return signers Массив адресов подписантов
     */
    function getSynchronizedSigners(uint256 documentId) external view returns (address[] memory) {
        require(_documentExists(documentId), "Document does not exist");
        return synchronizedSigners[documentId];
    }
    
    /**
     * @dev Отзывает синхронизированный ключ (только владелец документа)
     * @param documentId ID документа
     * @param signer Адрес подписанта
     */
    function revokeKey(uint256 documentId, address signer) external {
        require(_documentExists(documentId), "Document does not exist");
        require(_isDocumentOwner(documentId, msg.sender), "Only owner can revoke keys");
        require(synchronizedKeys[documentId][signer].isActive, "Key not active");
        
        synchronizedKeys[documentId][signer].isActive = false;
        
        emit KeyRevoked(documentId, signer, uint32(block.timestamp));
    }
    
    /**
     * @dev Проверяет, синхронизировал ли подписант ключ
     * @param documentId ID документа
     * @param signer Адрес подписанта
     * @return synchronized Синхронизирован ли ключ
     */
    function isKeySynchronized(uint256 documentId, address signer) external view returns (bool) {
        return synchronizedKeys[documentId][signer].isActive;
    }
    
    /**
     * @dev Получает статистику синхронизации для документа
     * @param documentId ID документа
     * @return totalSigned Общее количество подписей
     * @return totalSynchronized Количество синхронизированных ключей
     * @return isFullySynchronized Все ли подписанты синхронизировали ключи
     */
    function getSynchronizationStatus(uint256 documentId) external view returns (
        uint16 totalSigned,
        uint16 totalSynchronized,
        bool isFullySynchronized
    ) {
        require(_documentExists(documentId), "Document does not exist");
        
        (,uint16 currentSignatures) = veriDocRegistry.getDocumentInfo(documentId);
        totalSigned = currentSignatures;
        totalSynchronized = uint16(synchronizedSigners[documentId].length);
        isFullySynchronized = (totalSigned > 0 && totalSigned == totalSynchronized);
    }
    
    /**
     * @dev Пакетная синхронизация ключей (для экономии газа)
     * @param documentIds Массив ID документов
     * @param encryptedKeys Массив зашифрованных ключей
     * @param keyHashes Массив хешей ключей
     */
    function batchSynchronizeKeys(
        uint256[] calldata documentIds,
        string[] calldata encryptedKeys,
        bytes32[] calldata keyHashes
    ) external {
        require(documentIds.length == encryptedKeys.length, "Array length mismatch");
        require(documentIds.length == keyHashes.length, "Array length mismatch");
        require(documentIds.length <= 10, "Too many operations"); // Лимит для предотвращения out of gas
        
        for (uint256 i = 0; i < documentIds.length; i++) {
            // Проверяем каждый документ и синхронизируем ключ
            if (_hasSignedDocument(documentIds[i], msg.sender) && 
                !synchronizedKeys[documentIds[i]][msg.sender].isActive) {
                
                synchronizedKeys[documentIds[i]][msg.sender] = SynchronizedKey({
                    encryptedKey: encryptedKeys[i],
                    keyHash: keyHashes[i],
                    synchronizedAt: uint32(block.timestamp),
                    isActive: true
                });
                
                synchronizedSigners[documentIds[i]].push(msg.sender);
                
                emit KeySynchronized(documentIds[i], msg.sender, keyHashes[i], uint32(block.timestamp));
            }
        }
    }
    
    /**
     * @dev Проверяет, что документ подписан всеми и все ключи синхронизированы
     * @param documentId ID документа
     * @return isComplete Документ полностью завершен
     */
    function isDocumentFullyComplete(uint256 documentId) external view returns (bool isComplete) {
        require(_documentExists(documentId), "Document does not exist");
        
        (VeriDocRegistry.Document memory doc,) = veriDocRegistry.getDocumentInfo(documentId);
        
        // Документ должен быть завершен (все подписи) и все ключи синхронизированы
        if (!doc.isCompleted) {
            return false;
        }
        
        uint16 synchronizedCount = uint16(synchronizedSigners[documentId].length);
        return (synchronizedCount == doc.requiredSignatures);
    }
    
    // Приватные функции для проверок
    
    function _documentExists(uint256 documentId) private view returns (bool) {
        return documentId <= veriDocRegistry.getTotalDocuments() && documentId > 0;
    }
    
    function _hasSignedDocument(uint256 documentId, address signer) private view returns (bool) {
        return veriDocRegistry.hasSignedDocument(documentId, signer);
    }
    
    function _isDocumentOwner(uint256 documentId, address user) private view returns (bool) {
        (VeriDocRegistry.Document memory doc,) = veriDocRegistry.getDocumentInfo(documentId);
        return doc.owner == user;
    }
    
    function _canAccessKey(uint256 documentId, address signer, address requester) private view returns (bool) {
        // Владелец документа может получить любой ключ
        if (_isDocumentOwner(documentId, requester)) {
            return true;
        }
        
        // Подписант может получить только свой ключ
        if (signer == requester) {
            return true;
        }
        
        // Другие подписанты могут получить ключи друг друга (для расшифровки)
        return _hasSignedDocument(documentId, requester);
    }
}