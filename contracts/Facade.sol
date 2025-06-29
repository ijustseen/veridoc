// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VeriDocRegistry.sol";
import "./VeriDocKeyManager.sol";
import "./VeriDocVerifier.sol";

/**
 * @title VeriDocFacade
 * @dev Единая точка входа для всех операций VeriDoc
 * Упрощает взаимодействие с фронтендом, объединяет все контракты
 */
contract VeriDocFacade {
    
    VeriDocRegistry public immutable registry;
    VeriDocKeyManager public immutable keyManager;
    VeriDocVerifier public immutable verifier;
    
    // Упрощенная структура для создания документа
    struct CreateDocumentParams {
        bytes32 documentHash;           // Keccak256 хеш документа
        bool isPublic;                 // Публичный или приватный
        uint32 expiresAt;             // Время истечения (0 = без ограничений)
        address[] signers;            // Подписанты
        string[] encryptedKeys;       // Зашифрованные ключи для подписантов
        address[] accessUsers;        // Дополнительные пользователи с доступом (для приватных)
    }
    
    // Структура для полного workflow подписания
    struct SignDocumentParams {
        uint256 documentId;           // ID документа
        string signatureBase64;       // Подпись от MetaMask в base64
        string encryptedKey;         // Зашифрованный ключ для синхронизации
        bytes32 keyHash;            // Хеш ключа
    }
    
    // Агрегированная информация о документе
    struct DocumentFullInfo {
        VeriDocRegistry.Document document;              // Основная информация
        VeriDocVerifier.VerificationResult verification; // Результат верификации
        address[] signers;                              // Подписанты
        uint16 synchronizedKeysCount;                   // Количество синхронизированных ключей
        bool isFullyComplete;                          // Полностью завершен
    }
    
    // События фасада
    event DocumentWorkflowStarted(
        uint256 indexed documentId,
        address indexed owner,
        uint16 requiredSignatures
    );
    
    event DocumentWorkflowCompleted(
        uint256 indexed documentId,
        uint16 totalSignatures,
        uint16 synchronizedKeys
    );
    
    constructor(
        address _registry,
        address _keyManager,
        address _verifier
    ) {
        require(_registry != address(0), "Invalid registry address");
        require(_keyManager != address(0), "Invalid key manager address");
        require(_verifier != address(0), "Invalid verifier address");
        
        registry = VeriDocRegistry(_registry);
        keyManager = VeriDocKeyManager(_keyManager);
        verifier = VeriDocVerifier(_verifier);
    }
    
    /**
     * @dev Создает документ с полной настройкой (единая транзакция)
     * @param params Параметры создания документа
     * @return documentId ID созданного документа
     */
    function createDocument(
        CreateDocumentParams calldata params
    ) external returns (uint256 documentId) {
        // Создаем документ в основном контракте
        documentId = registry.createDocument(
            params.documentHash,
            params.isPublic,
            params.expiresAt,
            params.signers,
            params.encryptedKeys,
            params.accessUsers
        );
        
        emit DocumentWorkflowStarted(documentId, msg.sender, uint16(params.signers.length));
        
        return documentId;
    }
    
    /**
     * @dev Полный workflow подписания документа (подпись + синхронизация ключа)
     * @param params Параметры подписания
     */
    function signAndSynchronize(
        SignDocumentParams calldata params
    ) external {
        // 1. Подписываем документ
        registry.signDocument(params.documentId, params.signatureBase64);
        
        // 2. Синхронизируем ключ
        keyManager.synchronizeKey(
            params.documentId,
            params.encryptedKey,
            params.keyHash
        );
        
        // 3. Проверяем завершение workflow
        if (keyManager.isDocumentFullyComplete(params.documentId)) {
            (,uint16 totalSignatures) = registry.getDocumentInfo(params.documentId);
            (,uint16 synchronizedKeys,) = keyManager.getSynchronizationStatus(params.documentId);
            
            emit DocumentWorkflowCompleted(params.documentId, totalSignatures, synchronizedKeys);
        }
    }
    
    /**
     * @dev Получает полную информацию о документе
     * @param documentId ID документа
     * @return info Агрегированная информация
     */
    function getDocumentFullInfo(
        uint256 documentId
    ) external view returns (DocumentFullInfo memory info) {
        // Получаем основную информацию
        (VeriDocRegistry.Document memory doc, uint16 signaturesCount) = registry.getDocumentInfo(documentId);
        
        // Получаем результат верификации
        VeriDocVerifier.VerificationResult memory verification = verifier.verifyDocument(doc.documentHash);
        
        // Получаем подписантов
        (address[] memory signers,,) = registry.getDocumentSignatures(documentId);
        
        // Получаем информацию о синхронизации
        (,uint16 synchronizedKeysCount, bool isFullyComplete) = keyManager.getSynchronizationStatus(documentId);
        
        info = DocumentFullInfo({
            document: doc,
            verification: verification,
            signers: signers,
            synchronizedKeysCount: synchronizedKeysCount,
            isFullyComplete: isFullyComplete
        });
    }
    
    /**
     * @dev Получает dashboard пользователя (агрегированная информация)
     * @param user Адрес пользователя
     * @return ownedDocs Документы в собственности
     * @return pendingDocs Документы ожидающие подписи
     * @return completedDocs Завершенные документы
     */
    function getUserDashboard(
        address user
    ) external view returns (
        uint256[] memory ownedDocs,
        uint256[] memory pendingDocs,
        uint256[] memory completedDocs
    ) {
        (uint256[] memory owned, uint256[] memory invited) = registry.getUserDocuments(user);
        
        // Фильтруем документы по статусам
        uint256[] memory tempPending = new uint256[](invited.length);
        uint256[] memory tempCompleted = new uint256[](owned.length + invited.length);
        
        uint256 pendingCount = 0;
        uint256 completedCount = 0;
        
        // Проверяем приглашенные документы (ожидающие подписи)
        for (uint256 i = 0; i < invited.length; i++) {
            uint256 docId = invited[i];
            bool hasSigned = registry.hasSignedDocument(docId, user);
            (VeriDocRegistry.Document memory doc,) = registry.getDocumentInfo(docId);
            
            if (!hasSigned && !doc.isCompleted) {
                tempPending[pendingCount] = docId;
                pendingCount++;
            } else if (doc.isCompleted) {
                tempCompleted[completedCount] = docId;
                completedCount++;
            }
        }
        
        // Проверяем собственные документы (завершенные)
        for (uint256 i = 0; i < owned.length; i++) {
            uint256 docId = owned[i];
            (VeriDocRegistry.Document memory doc,) = registry.getDocumentInfo(docId);
            
            if (doc.isCompleted) {
                tempCompleted[completedCount] = docId;
                completedCount++;
            }
        }
        
        // Обрезаем массивы до нужного размера
        ownedDocs = owned;
        pendingDocs = new uint256[](pendingCount);
        completedDocs = new uint256[](completedCount);
        
        for (uint256 i = 0; i < pendingCount; i++) {
            pendingDocs[i] = tempPending[i];
        }
        
        for (uint256 i = 0; i < completedCount; i++) {
            completedDocs[i] = tempCompleted[i];
        }
    }
    
    /**
     * @dev Быстрая верификация документа по хешу (для QR кодов)
     * @param documentHash Хеш документа
     * @return isValid Валиден ли документ
     * @return isCompleted Завершен ли документ
     * @return owner Владелец документа
     * @return signers Список подписантов
     */
    function quickVerify(
        bytes32 documentHash
    ) external view returns (
        bool isValid,
        bool isCompleted,
        address owner,
        address[] memory signers
    ) {
        (bool exists, bool completed, address docOwner, uint16 currentSigs, uint16 requiredSigs) = 
            registry.verifyDocumentByHash(documentHash);
        
        if (!exists) {
            return (false, false, address(0), signers);
        }
        
        uint256 documentId = registry.hashToDocumentId(documentHash);
        (VeriDocRegistry.Document memory doc,) = registry.getDocumentInfo(documentId);
        
        // Проверяем срок действия
        isValid = (doc.expiresAt == 0 || doc.expiresAt > block.timestamp);
        isCompleted = completed;
        owner = docOwner;
        
        if (currentSigs > 0) {
            (address[] memory docSigners,,) = registry.getDocumentSignatures(documentId);
            signers = docSigners;
        }
    }
    
    /**
     * @dev Пакетная операция: создание нескольких документов
     * @param documentsParams Массив параметров документов
     * @return documentIds Массив ID созданных документов
     */
    function batchCreateDocuments(
        CreateDocumentParams[] calldata documentsParams
    ) external returns (uint256[] memory documentIds) {
        require(documentsParams.length <= 10, "Too many documents"); // Лимит для предотвращения out of gas
        
        documentIds = new uint256[](documentsParams.length);
        
        for (uint256 i = 0; i < documentsParams.length; i++) {
            documentIds[i] = registry.createDocument(
                documentsParams[i].documentHash,
                documentsParams[i].isPublic,
                documentsParams[i].expiresAt,
                documentsParams[i].signers,
                documentsParams[i].encryptedKeys,
                documentsParams[i].accessUsers
            );
            
            emit DocumentWorkflowStarted(
                documentIds[i], 
                msg.sender, 
                uint16(documentsParams[i].signers.length)
            );
        }
    }
    
    /**
     * @dev Пакетная операция: подписание нескольких документов
     * @param signingsParams Массив параметров подписания
     */
    function batchSignAndSynchronize(
        SignDocumentParams[] calldata signingsParams
    ) external {
        require(signingsParams.length <= 10, "Too many signatures"); // Лимит для предотвращения out of gas
        
        for (uint256 i = 0; i < signingsParams.length; i++) {
            SignDocumentParams memory params = signingsParams[i];
            
            // Подписываем документ
            registry.signDocument(params.documentId, params.signatureBase64);
            
            // Синхронизируем ключ
            keyManager.synchronizeKey(
                params.documentId,
                params.encryptedKey,
                params.keyHash
            );
            
            // Проверяем завершение workflow
            if (keyManager.isDocumentFullyComplete(params.documentId)) {
                (,uint16 totalSignatures) = registry.getDocumentInfo(params.documentId);
                (,uint16 synchronizedKeys,) = keyManager.getSynchronizationStatus(params.documentId);
                
                emit DocumentWorkflowCompleted(params.documentId, totalSignatures, synchronizedKeys);
            }
        }
    }
    
    /**
     * @dev Получает статус workflow для документа
     * @param documentId ID документа
     * @return stage Текущая стадия (0-Created, 1-Signing, 2-Completed, 3-FullySynchronized)
     * @return progress Прогресс в процентах (0-100)
     * @return details Детали стадии
     */
    function getWorkflowStatus(
        uint256 documentId
    ) external view returns (
        uint8 stage,
        uint8 progress,
        string memory details
    ) {
        (VeriDocRegistry.Document memory doc, uint16 currentSignatures) = registry.getDocumentInfo(documentId);
        (,uint16 synchronizedKeys, bool isFullySynchronized) = keyManager.getSynchronizationStatus(documentId);
        
        if (isFullySynchronized) {
            stage = 3; // FullySynchronized
            progress = 100;
            details = "Document fully completed with all signatures and keys synchronized";
        } else if (doc.isCompleted) {
            stage = 2; // Completed
            progress = 80 + (synchronizedKeys * 20 / doc.requiredSignatures);
            details = string(abi.encodePacked(
                "Document signed, synchronizing keys: ",
                _uint16ToString(synchronizedKeys),
                "/",
                _uint16ToString(doc.requiredSignatures)
            ));
        } else if (currentSignatures > 0) {
            stage = 1; // Signing
            progress = (currentSignatures * 80) / doc.requiredSignatures;
            details = string(abi.encodePacked(
                "Collecting signatures: ",
                _uint16ToString(currentSignatures),
                "/",
                _uint16ToString(doc.requiredSignatures)
            ));
        } else {
            stage = 0; // Created
            progress = 10;
            details = "Document created, waiting for signatures";
        }
    }
    
    /**
     * @dev Проверяет права доступа пользователя к документу
     * @param documentId ID документа
     * @param user Пользователь
     * @return permissions Детальные права доступа
     */
    function checkUserPermissions(
        uint256 documentId,
        address user
    ) external view returns (
        bool canRead,
        bool canSign,
        bool canGetKeys,
        bool isOwner,
        string memory status
    ) {
        (canRead, canSign, isOwner) = registry.checkDocumentAccess(documentId, user);
        
        // Проверяем доступ к ключам (если пользователь подписал или является владельцем)
        canGetKeys = isOwner || registry.hasSignedDocument(documentId, user);
        
        // Определяем статус пользователя
        if (isOwner) {
            status = "Owner";
        } else if (registry.hasSignedDocument(documentId, user)) {
            status = "Signed";
        } else if (canSign) {
            status = "Invited to sign";
        } else if (canRead) {
            status = "Read access";
        } else {
            status = "No access";
        }
    }
    
    /**
     * @dev Получает статистику системы
     * @return totalDocuments Общее количество документов
     * @return completedDocuments Завершенные документы
     * @return totalSignatures Общее количество подписей
     * @return totalSynchronizedKeys Общее количество синхронизированных ключей
     */
    function getSystemStats() external view returns (
        uint256 totalDocuments,
        uint256 completedDocuments,
        uint256 totalSignatures,
        uint256 totalSynchronizedKeys
    ) {
        (totalDocuments, totalSignatures) = registry.getGlobalStats();
        
        // Подсчитываем завершенные документы и синхронизированные ключи
        for (uint256 i = 1; i <= totalDocuments; i++) {
            (VeriDocRegistry.Document memory doc,) = registry.getDocumentInfo(i);
            if (doc.isCompleted) {
                completedDocuments++;
            }
            
            address[] memory syncSigners = keyManager.getSynchronizedSigners(i);
            totalSynchronizedKeys += syncSigners.length;
        }
    }
    
    /**
     * @dev Экстренная функция: отзыв доступа к приватному документу
     * @param documentId ID документа
     * @param user Пользователь
     */
    function emergencyRevokeAccess(
        uint256 documentId,
        address user
    ) external {
        // Только владелец может отзывать доступ
        (VeriDocRegistry.Document memory doc,) = registry.getDocumentInfo(documentId);
        require(doc.owner == msg.sender, "Only owner can revoke access");
        require(!doc.isPublic, "Cannot revoke access from public document");
        
        registry.revokeReadAccess(documentId, user);
        
        // Также отзываем синхронизированный ключ если есть
        if (keyManager.isKeySynchronized(documentId, user)) {
            keyManager.revokeKey(documentId, user);
        }
    }
    
    // Вспомогательные функции
    
    function _uint16ToString(uint16 value) private pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        
        uint16 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
    
    /**
     * @dev Получает адреса всех связанных контрактов
     * @return registryAddr Адрес основного реестра
     * @return keyManagerAddr Адрес менеджера ключей
     * @return verifierAddr Адрес верификатора
     */
    function getContractAddresses() external view returns (
        address registryAddr,
        address keyManagerAddr,
        address verifierAddr
    ) {
        return (address(registry), address(keyManager), address(verifier));
    }
}