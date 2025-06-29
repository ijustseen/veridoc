// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VeriDocRegistry.sol";
import "./VeriDocKeyManager.sol";

/**
 * @title VeriDocVerifier
 * @dev Верификация документов и подписей VeriDoc
 * Работает с MetaMask подписями в формате base64
 */
contract VeriDocVerifier {
    
    VeriDocRegistry public immutable veriDocRegistry;
    VeriDocKeyManager public immutable keyManager;
    
    // Структура результата верификации
    struct VerificationResult {
        bool exists;                    // Существует ли документ
        bool isValid;                   // Валиден ли документ
        bool isCompleted;              // Завершен ли документ
        bool isFullySynchronized;      // Синхронизированы ли все ключи
        address owner;                 // Владелец
        uint16 totalSignatures;        // Общее количество подписей
        uint16 requiredSignatures;     // Требуемое количество
        uint32 createdAt;             // Время создания
        uint32 completedAt;           // Время завершения (0 если не завершен)
        address[] signers;             // Список подписантов
    }
    
    // Структура детальной информации о подписи
    struct SignatureDetails {
        address signer;                // Подписант
        string signatureBase64;        // Подпись в base64 (от MetaMask)
        bytes32 signatureHash;         // Keccak256 хеш подписи
        uint32 signedAt;              // Время подписания
        bool hasKey;                  // Синхронизирован ли ключ
        string encryptedKey;          // Зашифрованный ключ (если доступен)
    }
    
    // События для верификации
    event DocumentVerified(
        uint256 indexed documentId,
        bytes32 indexed documentHash,
        address indexed verifier,
        bool isValid,
        uint32 verifiedAt
    );
    
    event SignatureVerified(
        uint256 indexed documentId,
        address indexed signer,
        bool isValid,
        uint32 verifiedAt
    );
    
    constructor(address _veriDocRegistry, address _keyManager) {
        require(_veriDocRegistry != address(0), "Invalid registry address");
        require(_keyManager != address(0), "Invalid key manager address");
        
        veriDocRegistry = VeriDocRegistry(_veriDocRegistry);
        keyManager = VeriDocKeyManager(_keyManager);
    }
    
    /**
     * @dev Полная верификация документа по хешу
     * @param documentHash Keccak256 хеш документа
     * @return result Результат верификации
     */
    function verifyDocument(bytes32 documentHash) external returns (VerificationResult memory result) {
        require(documentHash != bytes32(0), "Invalid document hash");
        
        // Получаем базовую информацию о документе
        (bool exists, bool isCompleted, address owner, uint16 currentSignatures, uint16 requiredSignatures) = 
            veriDocRegistry.verifyDocumentByHash(documentHash);
        
        if (!exists) {
            emit DocumentVerified(0, documentHash, msg.sender, false, uint32(block.timestamp));
            return result; // Возвращаем пустую структуру
        }
        
        uint256 documentId = _getDocumentIdByHash(documentHash);
        
        // Получаем детальную информацию
        (VeriDocRegistry.Document memory doc,) = veriDocRegistry.getDocumentInfo(documentId);
        
        // Проверяем срок действия
        bool isValid = (doc.expiresAt == 0 || doc.expiresAt > block.timestamp);
        
        // Получаем подписантов
        (address[] memory signers,,) = veriDocRegistry.getDocumentSignatures(documentId);
        
        // Проверяем синхронизацию ключей
        bool isFullySynchronized = keyManager.isDocumentFullyComplete(documentId);
        
        // Время завершения (ищем последнюю подпись)
        uint32 completedAt = 0;
        if (isCompleted && signers.length > 0) {
            (,, uint32[] memory signedTimes) = veriDocRegistry.getDocumentSignatures(documentId);
            for (uint256 i = 0; i < signedTimes.length; i++) {
                if (signedTimes[i] > completedAt) {
                    completedAt = signedTimes[i];
                }
            }
        }
        
        result = VerificationResult({
            exists: true,
            isValid: isValid,
            isCompleted: isCompleted,
            isFullySynchronized: isFullySynchronized,
            owner: owner,
            totalSignatures: currentSignatures,
            requiredSignatures: requiredSignatures,
            createdAt: doc.createdAt,
            completedAt: completedAt,
            signers: signers
        });
        
        emit DocumentVerified(documentId, documentHash, msg.sender, isValid, uint32(block.timestamp));
    }
    
    /**
     * @dev Верификация конкретной подписи в документе
     * @param documentId ID документа
     * @param signer Адрес подписанта
     * @return isValid Валидна ли подпись
     * @return signatureHash Хеш подписи
     * @return signedAt Время подписания
     */
    function verifySignature(
        uint256 documentId,
        address signer
    ) external returns (
        bool isValid,
        bytes32 signatureHash,
        uint32 signedAt
    ) {
        require(_documentExists(documentId), "Document does not exist");
        require(signer != address(0), "Invalid signer address");
        
        // Проверяем, что подписант действительно подписал
        bool hasSigned = veriDocRegistry.hasSignedDocument(documentId, signer);
        
        if (hasSigned) {
            // Получаем детали подписи
            (address[] memory signers, bytes32[] memory signatureHashes, uint32[] memory signedTimes) = 
                veriDocRegistry.getDocumentSignatures(documentId);
            
            // Ищем подпись конкретного подписанта
            for (uint256 i = 0; i < signers.length; i++) {
                if (signers[i] == signer) {
                    isValid = true;
                    signatureHash = signatureHashes[i];
                    signedAt = signedTimes[i];
                    break;
                }
            }
        }
        
        emit SignatureVerified(documentId, signer, isValid, uint32(block.timestamp));
    }
    
    /**
     * @dev Получает детальную информацию о всех подписях документа
     * @param documentId ID документа
     * @return signatures Массив детальной информации о подписях
     */
    function getSignatureDetails(
        uint256 documentId
    ) external view returns (SignatureDetails[] memory signatures) {
        require(_documentExists(documentId), "Document does not exist");
        require(_canAccessSignatures(documentId, msg.sender), "Access denied");
        
        // Получаем подписи из основного контракта
        (address[] memory signers, bytes32[] memory signatureHashes, uint32[] memory signedTimes) = 
            veriDocRegistry.getDocumentSignatures(documentId);
        
        signatures = new SignatureDetails[](signers.length);
        
        for (uint256 i = 0; i < signers.length; i++) {
            // Конвертируем хеш обратно в base64 (приблизительно, для отображения)
            string memory signatureBase64 = _hashToBase64Representation(signatureHashes[i]);
            
            // Проверяем синхронизацию ключа
            bool hasKey = keyManager.isKeySynchronized(documentId, signers[i]);
            string memory encryptedKey = "";
            
            if (hasKey) {
                try keyManager.getSynchronizedKey(documentId, signers[i]) returns (
                    string memory key, bytes32, uint32, bool isActive
                ) {
                    if (isActive) {
                        encryptedKey = key;
                    }
                } catch {
                    // Если нет доступа к ключу, оставляем пустым
                }
            }
            
            signatures[i] = SignatureDetails({
                signer: signers[i],
                signatureBase64: signatureBase64,
                signatureHash: signatureHashes[i],
                signedAt: signedTimes[i],
                hasKey: hasKey,
                encryptedKey: encryptedKey
            });
        }
    }
    
    /**
     * @dev Пакетная верификация нескольких документов
     * @param documentHashes Массив хешей документов
     * @return results Массив результатов верификации
     */
    function batchVerifyDocuments(
        bytes32[] calldata documentHashes
    ) external view returns (VerificationResult[] memory results) {
        require(documentHashes.length <= 50, "Too many documents"); // Лимит для предотвращения out of gas
        
        results = new VerificationResult[](documentHashes.length);
        
        for (uint256 i = 0; i < documentHashes.length; i++) {
            bytes32 hash = documentHashes[i];
            
            // Получаем базовую информацию
            (bool exists, bool isCompleted, address owner, uint16 currentSignatures, uint16 requiredSignatures) = 
                veriDocRegistry.verifyDocumentByHash(hash);
            
            if (exists) {
                uint256 documentId = _getDocumentIdByHash(hash);
                (VeriDocRegistry.Document memory doc,) = veriDocRegistry.getDocumentInfo(documentId);
                
                bool isValid = (doc.expiresAt == 0 || doc.expiresAt > block.timestamp);
                bool isFullySynchronized = keyManager.isDocumentFullyComplete(documentId);
                
                (address[] memory signers,,) = veriDocRegistry.getDocumentSignatures(documentId);
                
                results[i] = VerificationResult({
                    exists: true,
                    isValid: isValid,
                    isCompleted: isCompleted,
                    isFullySynchronized: isFullySynchronized,
                    owner: owner,
                    totalSignatures: currentSignatures,
                    requiredSignatures: requiredSignatures,
                    createdAt: doc.createdAt,
                    completedAt: 0, // Для экономии газа не вычисляем в batch
                    signers: signers
                });
            }
            // Если документ не существует, остается дефолтная пустая структура
        }
    }
    
    /**
     * @dev Проверяет подлинность MetaMask подписи (упрощенная версия)
     * @param documentId ID документа
     * @param signer Адрес подписанта
     * @param signatureBase64 Подпись в base64 от MetaMask
     * @return isValid Соответствует ли подпись записанной в блокчейне
     */
    function validateMetaMaskSignature(
        uint256 documentId,
        address signer,
        string calldata signatureBase64
    ) external view returns (bool isValid) {
        require(_documentExists(documentId), "Document does not exist");
        require(signer != address(0), "Invalid signer address");
        require(bytes(signatureBase64).length > 0, "Invalid signature");
        
        // Конвертируем base64 подпись в хеш
        bytes32 providedHash = keccak256(bytes(signatureBase64));
        
        // Получаем записанную подпись
        (address[] memory signers, bytes32[] memory signatureHashes,) = 
            veriDocRegistry.getDocumentSignatures(documentId);
        
        // Ищем совпадение
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer && signatureHashes[i] == providedHash) {
                isValid = true;
                break;
            }
        }
    }
    
    /**
     * @dev Получает полную информацию о документе для публичной верификации
     * @param documentHash Хеш документа
     * @return basicInfo Базовая информация
     * @return signatureDetails Детали подписей (только публичная часть)
     */
    function getPublicVerificationInfo(
        bytes32 documentHash
    ) external view returns (
        VerificationResult memory basicInfo,
        SignatureDetails[] memory signatureDetails
    ) {
        // Получаем базовую информацию
        (bool exists, bool isCompleted, address owner, uint16 currentSignatures, uint16 requiredSignatures) = 
            veriDocRegistry.verifyDocumentByHash(documentHash);
        
        if (!exists) {
            return (basicInfo, signatureDetails); // Возвращаем пустые структуры
        }
        
        uint256 documentId = _getDocumentIdByHash(documentHash);
        (VeriDocRegistry.Document memory doc,) = veriDocRegistry.getDocumentInfo(documentId);
        
        // Проверяем, что документ публичный или у нас есть доступ
        if (!doc.isPublic) {
            (bool canRead,,) = veriDocRegistry.checkDocumentAccess(documentId, msg.sender);
            if (!canRead) {
                // Возвращаем только базовую информацию без деталей подписей
                basicInfo.exists = true;
                basicInfo.isValid = false; // Показываем как недоступный
                return (basicInfo, signatureDetails);
            }
        }
        
        bool isValid = (doc.expiresAt == 0 || doc.expiresAt > block.timestamp);
        bool isFullySynchronized = keyManager.isDocumentFullyComplete(documentId);
        
        (address[] memory signers, bytes32[] memory signatureHashes, uint32[] memory signedTimes) = 
            veriDocRegistry.getDocumentSignatures(documentId);
        
        // Заполняем базовую информацию
        basicInfo = VerificationResult({
            exists: true,
            isValid: isValid,
            isCompleted: isCompleted,
            isFullySynchronized: isFullySynchronized,
            owner: owner,
            totalSignatures: currentSignatures,
            requiredSignatures: requiredSignatures,
            createdAt: doc.createdAt,
            completedAt: 0,
            signers: signers
        });
        
        // Заполняем детали подписей (без зашифрованных ключей для публичного доступа)
        signatureDetails = new SignatureDetails[](signers.length);
        for (uint256 i = 0; i < signers.length; i++) {
            signatureDetails[i] = SignatureDetails({
                signer: signers[i],
                signatureBase64: _hashToBase64Representation(signatureHashes[i]),
                signatureHash: signatureHashes[i],
                signedAt: signedTimes[i],
                hasKey: keyManager.isKeySynchronized(documentId, signers[i]),
                encryptedKey: "" // Не показываем ключи в публичном API
            });
        }
    }
    
    // Приватные вспомогательные функции
    
    function _documentExists(uint256 documentId) private view returns (bool) {
        return documentId <= veriDocRegistry.getTotalDocuments() && documentId > 0;
    }
    
    function _getDocumentIdByHash(bytes32 documentHash) private view returns (uint256) {
        return veriDocRegistry.hashToDocumentId(documentHash);
    }
    
    function _canAccessSignatures(uint256 documentId, address user) private view returns (bool) {
        (bool canRead,, bool isOwner) = veriDocRegistry.checkDocumentAccess(documentId, user);
        return canRead || isOwner;
    }
    
    function _hashToBase64Representation(bytes32 hash) private pure returns (string memory) {
        // Упрощенное представление хеша как base64 (для отображения)
        // В реальности нужна полная библиотека base64
        return string(abi.encodePacked("hash:", _bytes32ToString(hash)));
    }
    
    function _bytes32ToString(bytes32 data) private pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            str[i*2] = alphabet[uint8(data[i] >> 4)];
            str[1+i*2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}