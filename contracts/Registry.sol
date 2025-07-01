// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VeriDocRegistry
 * @dev Газ-оптимизированный контракт для VeriDoc системы
 * Хранит только критически важные данные: ID, хеши, подписи
 * Все файлы и метаданные в S3, шифрование на клиенте
 */
contract VeriDocRegistry is ReentrancyGuard {
    
    // Упакованная структура документа (экономия газа)
    struct Document {
        bytes32 documentHash;        // Keccak256 хеш документа
        address owner;               // Владелец документа
        uint32 createdAt;           // Время создания
        uint32 expiresAt;           // Время истечения подписей (0 = вечность)
        uint16 requiredSignatures;  // Количество требуемых подписей
        uint16 currentSignatures;   // Текущее количество подписей
        bool isPublic;              // Публичный или приватный
        bool isCompleted;           // Все ли подписи получены
    }
    
    // Структура подписи (EIP-712)
    struct Signature {
        address signer;             // Адрес подписанта
        bytes32 signatureHash;      // EIP-712 хеш подписи от MetaMask
        uint32 signedAt;           // Время подписания
    }
    
    // Счетчик документов (автоинкремент)
    uint256 private _documentIdCounter;
    
    // Основные маппинги
    mapping(uint256 => Document) public documents;
    mapping(uint256 => mapping(uint256 => Signature)) public signatures; // documentId => signatureIndex => Signature
    mapping(uint256 => mapping(address => bool)) public hasSignedDocument; // documentId => signer => signed
    mapping(uint256 => mapping(address => bool)) public isInvitedToSign; // documentId => signer => invited
    mapping(uint256 => mapping(address => string)) public encryptedKeysForSigners; // documentId => signer => encryptedKey
    
    // Приватные документы: доступ к чтению
    mapping(uint256 => mapping(address => bool)) public hasReadAccess; // documentId => user => hasAccess
    
    // Быстрый поиск
    mapping(bytes32 => uint256) public hashToDocumentId; // хеш => ID документа
    mapping(address => uint256[]) public userOwnedDocuments; // владелец => документы
    mapping(address => uint256[]) public userInvitedDocuments; // приглашенный => документы
    
    // События
    event DocumentCreated(
        uint256 indexed documentId,
        bytes32 indexed documentHash,
        address indexed owner,
        bool isPublic,
        uint16 requiredSignatures,
        uint32 expiresAt
    );
    
    event SignatureInvited(
        uint256 indexed documentId,
        address indexed signer,
        uint32 invitedAt
    );
    
    event DocumentSigned(
        uint256 indexed documentId,
        address indexed signer,
        bytes32 signatureHash,
        uint32 signedAt,
        uint16 currentSignatures
    );
    
    event DocumentCompleted(
        uint256 indexed documentId,
        uint16 totalSignatures,
        uint32 completedAt
    );
    
    event ReadAccessGranted(
        uint256 indexed documentId,
        address indexed user,
        address indexed grantedBy
    );
    
    event ReadAccessRevoked(
        uint256 indexed documentId,
        address indexed user,
        address indexed revokedBy
    );
    
    /**
     * @dev Создает новый документ
     * @param documentHash Keccak256 хеш документа
     * @param isPublic Публичный или приватный документ
     * @param expiresAt Время истечения возможности подписания (0 = без ограничений)
     * @param signers Массив адресов приглашенных подписантов
     * @param encryptedKeys Массив зашифрованных ключей для каждого подписанта
     * @param accessUsers Массив адресов с доступом к приватному документу
     * @return documentId ID созданного документа
     */
    function createDocument(
        bytes32 documentHash,
        bool isPublic,
        uint32 expiresAt,
        address[] calldata signers,
        string[] calldata encryptedKeys,
        address[] calldata accessUsers
    ) external nonReentrant returns (uint256) {
        require(documentHash != bytes32(0), "Invalid document hash");
        require(hashToDocumentId[documentHash] == 0, "Document already exists");
        require(signers.length > 0, "At least one signer required");
        require(signers.length == encryptedKeys.length, "Signers and keys length mismatch");
        require(signers.length <= type(uint16).max, "Too many signers");
        require(expiresAt == 0 || expiresAt > block.timestamp, "Invalid expiration time");
        
        // Проверяем уникальность подписантов и что владелец не приглашает себя
        for (uint256 i = 0; i < signers.length; i++) {
            require(signers[i] != address(0), "Invalid signer address");
            require(signers[i] != msg.sender, "Cannot invite yourself to sign");
            require(bytes(encryptedKeys[i]).length > 0, "Invalid encrypted key");
            
            // Проверка уникальности подписантов
            for (uint256 j = i + 1; j < signers.length; j++) {
                require(signers[i] != signers[j], "Duplicate signer");
            }
        }
        
        _documentIdCounter++;
        uint256 documentId = _documentIdCounter;
        
        // Создаем документ
        documents[documentId] = Document({
            documentHash: documentHash,
            owner: msg.sender,
            createdAt: uint32(block.timestamp),
            expiresAt: expiresAt,
            requiredSignatures: uint16(signers.length),
            currentSignatures: 0,
            isPublic: isPublic,
            isCompleted: false
        });
        
        // Связываем хеш с ID
        hashToDocumentId[documentHash] = documentId;
        
        // Добавляем в список документов владельца
        userOwnedDocuments[msg.sender].push(documentId);
        
        // Приглашаем подписантов и сохраняем зашифрованные ключи
        for (uint256 i = 0; i < signers.length; i++) {
            isInvitedToSign[documentId][signers[i]] = true;
            encryptedKeysForSigners[documentId][signers[i]] = encryptedKeys[i];
            userInvitedDocuments[signers[i]].push(documentId);
            
            emit SignatureInvited(documentId, signers[i], uint32(block.timestamp));
        }
        
        // Для приватных документов устанавливаем доступы к чтению
        if (!isPublic) {
            // Владелец всегда имеет доступ
            hasReadAccess[documentId][msg.sender] = true;
            
            // Все подписанты имеют доступ к чтению
            for (uint256 i = 0; i < signers.length; i++) {
                hasReadAccess[documentId][signers[i]] = true;
            }
            
            // Добавляем дополнительных пользователей с доступом
            for (uint256 i = 0; i < accessUsers.length; i++) {
                require(accessUsers[i] != address(0), "Invalid access user address");
                hasReadAccess[documentId][accessUsers[i]] = true;
                
                emit ReadAccessGranted(documentId, accessUsers[i], msg.sender);
            }
        }
        
        emit DocumentCreated(
            documentId,
            documentHash,
            msg.sender,
            isPublic,
            uint16(signers.length),
            expiresAt
        );
        
        return documentId;
    }
    
    /**
     * @dev Подписывает документ (MetaMask возвращает base64)
     * @param documentId ID документа
     * @param signatureBase64 Подпись в формате base64 от MetaMask
     */
    function signDocument(
        uint256 documentId,
        string calldata signatureBase64
    ) external nonReentrant {
        require(_documentExists(documentId), "Document does not exist");
        require(isInvitedToSign[documentId][msg.sender], "Not invited to sign");
        require(!hasSignedDocument[documentId][msg.sender], "Already signed");
        require(bytes(signatureBase64).length > 0, "Invalid signature");
        
        // Конвертируем base64 подпись в хеш для хранения
        bytes32 signatureHash = keccak256(bytes(signatureBase64));
        
        Document storage doc = documents[documentId];
        require(!doc.isCompleted, "Document already completed");
        require(doc.expiresAt == 0 || doc.expiresAt > block.timestamp, "Signature period expired");
        
        // Добавляем подпись
        signatures[documentId][doc.currentSignatures] = Signature({
            signer: msg.sender,
            signatureHash: signatureHash,
            signedAt: uint32(block.timestamp)
        });
        
        hasSignedDocument[documentId][msg.sender] = true;
        doc.currentSignatures++;
        
        emit DocumentSigned(
            documentId,
            msg.sender,
            signatureHash,
            uint32(block.timestamp),
            doc.currentSignatures
        );
        
        // Проверяем завершение документа
        if (doc.currentSignatures >= doc.requiredSignatures) {
            doc.isCompleted = true;
            emit DocumentCompleted(documentId, doc.currentSignatures, uint32(block.timestamp));
        }
    }
    
    /**
     * @dev Предоставляет доступ к чтению приватного документа
     * @param documentId ID документа
     * @param user Пользователь
     */
    function grantReadAccess(
        uint256 documentId,
        address user
    ) external {
        require(_documentExists(documentId), "Document does not exist");
        require(documents[documentId].owner == msg.sender, "Only owner can grant access");
        require(!documents[documentId].isPublic, "Cannot grant access to public document");
        require(user != address(0), "Invalid user address");
        require(!hasReadAccess[documentId][user], "User already has access");
        
        hasReadAccess[documentId][user] = true;
        
        emit ReadAccessGranted(documentId, user, msg.sender);
    }
    
    /**
     * @dev Отзывает доступ к чтению приватного документа
     * @param documentId ID документа
     * @param user Пользователь
     */
    function revokeReadAccess(
        uint256 documentId,
        address user
    ) external {
        require(_documentExists(documentId), "Document does not exist");
        require(documents[documentId].owner == msg.sender, "Only owner can revoke access");
        require(!documents[documentId].isPublic, "Cannot revoke access from public document");
        require(user != msg.sender, "Cannot revoke access from owner");
        require(hasReadAccess[documentId][user], "User does not have access");
        
        hasReadAccess[documentId][user] = false;
        
        emit ReadAccessRevoked(documentId, user, msg.sender);
    }
    
    /**
     * @dev Верификация документа по хешу
     * @param documentHash Хеш документа
     * @return exists Существует ли документ
     * @return isCompleted Все ли подписи получены
     * @return owner Владелец документа
     * @return currentSignatures Текущее количество подписей
     * @return requiredSignatures Требуемое количество подписей
     */
    function verifyDocumentByHash(
        bytes32 documentHash
    ) external view returns (
        bool exists,
        bool isCompleted,
        address owner,
        uint16 currentSignatures,
        uint16 requiredSignatures
    ) {
        uint256 documentId = hashToDocumentId[documentHash];
        
        if (documentId == 0) {
            return (false, false, address(0), 0, 0);
        }
        
        Document memory doc = documents[documentId];
        return (
            true,
            doc.isCompleted,
            doc.owner,
            doc.currentSignatures,
            doc.requiredSignatures
        );
    }
    
    /**
     * @dev Получает зашифрованный ключ для подписанта
     * @param documentId ID документа
     * @param signer Адрес подписанта
     * @return encryptedKey Зашифрованный ключ
     */
    function getEncryptedKeyForSigner(
        uint256 documentId,
        address signer
    ) external view returns (string memory encryptedKey) {
        require(_documentExists(documentId), "Document does not exist");
        require(
            isInvitedToSign[documentId][signer] || 
            documents[documentId].owner == msg.sender || 
            signer == msg.sender,
            "Access denied"
        );
        
        return encryptedKeysForSigners[documentId][signer];
    }
    
    /**
     * @dev Получает все подписи документа
     * @param documentId ID документа
     * @return signers Массив адресов подписантов
     * @return signatureHashes Массив хешей подписей
     * @return signedTimes Массив времен подписания
     */
    function getDocumentSignatures(
        uint256 documentId
    ) external view returns (
        address[] memory signers,
        bytes32[] memory signatureHashes,
        uint32[] memory signedTimes
    ) {
        require(_documentExists(documentId), "Document does not exist");
        
        Document memory doc = documents[documentId];
        uint16 count = doc.currentSignatures;
        
        signers = new address[](count);
        signatureHashes = new bytes32[](count);
        signedTimes = new uint32[](count);
        
        for (uint256 i = 0; i < count; i++) {
            Signature memory sig = signatures[documentId][i];
            signers[i] = sig.signer;
            signatureHashes[i] = sig.signatureHash;
            signedTimes[i] = sig.signedAt;
        }
    }
    
    /**
     * @dev Проверяет права доступа к документу
     * @param documentId ID документа
     * @param user Пользователь
     * @return canRead Может ли читать
     * @return canSign Может ли подписывать
     * @return isOwner Является ли владельцем
     */
    function checkDocumentAccess(
        uint256 documentId,
        address user
    ) external view returns (
        bool canRead,
        bool canSign,
        bool isOwner
    ) {
        if (!_documentExists(documentId)) {
            return (false, false, false);
        }
        
        Document memory doc = documents[documentId];
        
        isOwner = (doc.owner == user);
        canSign = isInvitedToSign[documentId][user] && !hasSignedDocument[documentId][user] && !doc.isCompleted;
        
        if (doc.isPublic) {
            canRead = true;
        } else {
            canRead = hasReadAccess[documentId][user];
        }
    }
    
    /**
     * @dev Получает документы пользователя
     * @param user Адрес пользователя
     * @return ownedDocs Документы в собственности
     * @return invitedDocs Документы для подписания
     */
    function getUserDocuments(
        address user
    ) external view returns (
        uint256[] memory ownedDocs,
        uint256[] memory invitedDocs
    ) {
        return (userOwnedDocuments[user], userInvitedDocuments[user]);
    }
    
    /**
     * @dev Получает статистику документа
     * @param documentId ID документа
     * @return doc Структура документа
     * @return signaturesCount Количество подписей
     */
    function getDocumentInfo(
        uint256 documentId
    ) external view returns (
        Document memory doc,
        uint16 signaturesCount
    ) {
        require(_documentExists(documentId), "Document does not exist");
        
        doc = documents[documentId];
        signaturesCount = doc.currentSignatures;
    }
    
    /**
     * @dev Получает общую статистику контракта
     * @return totalDocuments Общее количество документов
     * @return totalSignatures Общее количество подписей
     */
    function getGlobalStats() external view returns (
        uint256 totalDocuments,
        uint256 totalSignatures
    ) {
        totalDocuments = _documentIdCounter;
        
        // Подсчитываем общее количество подписей
        for (uint256 i = 1; i <= _documentIdCounter; i++) {
            totalSignatures += documents[i].currentSignatures;
        }
    }
    
    /**
     * @dev Пакетная верификация документов по хешам
     * @param documentHashes Массив хешей документов
     * @return results Массив результатов верификации
     */
    function batchVerifyDocuments(
        bytes32[] calldata documentHashes
    ) external view returns (
        bool[] memory exists,
        bool[] memory isCompleted
    ) {
        uint256 length = documentHashes.length;
        exists = new bool[](length);
        isCompleted = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 documentId = hashToDocumentId[documentHashes[i]];
            if (documentId != 0) {
                exists[i] = true;
                isCompleted[i] = documents[documentId].isCompleted;
            }
        }
    }
    
    // Приватные функции
    
    function _documentExists(uint256 documentId) private view returns (bool) {
        return documentId > 0 && documentId <= _documentIdCounter;
    }
    
    /**
     * @dev Получает общее количество документов
     */
    function getTotalDocuments() external view returns (uint256) {
        return _documentIdCounter;
    }
}