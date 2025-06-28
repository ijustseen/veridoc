// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract DocumentRegistry is AccessControl, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;
    
    bytes32 public constant DOCUMENT_CREATOR_ROLE = keccak256("DOCUMENT_CREATOR_ROLE");
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    
    Counters.Counter private _documentIds;
    
    struct Document {
        uint256 id;
        address owner;
        bytes32 documentHash;
        string encryptedKey;
        bool isPublic;
        bool isActive;
        uint256 createdAt;
        uint256 expiresAt;
        DocumentAccess access;
    }
    
    struct DocumentAccess {
        bool readOnly;
        bool canSign;
        bool canTransfer;
    }
    
    struct SignatureRequest {
        address signer;
        string encryptedKeyForSigner;
        bool isPending;
        bool isSigned;
        uint256 requestedAt;
        uint256 signedAt;
    }
    
    // Mapping: documentId => Document
    mapping(uint256 => Document) public documents;
    
    // Mapping: documentId => signerAddress => SignatureRequest
    mapping(uint256 => mapping(address => SignatureRequest)) public signatureRequests;
    
    // Mapping: documentId => signerAddress[]
    mapping(uint256 => address[]) public documentSigners;
    
    // Events
    event DocumentCreated(
        uint256 indexed documentId,
        address indexed owner,
        bytes32 documentHash,
        bool isPublic,
        uint256 createdAt
    );
    
    event SignatureRequested(
        uint256 indexed documentId,
        address indexed signer,
        string encryptedKey,
        uint256 requestedAt
    );
    
    event DocumentSigned(
        uint256 indexed documentId,
        address indexed signer,
        string newEncryptedKey,
        uint256 signedAt
    );
    
    event DocumentAccessUpdated(
        uint256 indexed documentId,
        bool readOnly,
        bool canSign,
        bool canTransfer
    );
    
    event DocumentTransferred(
        uint256 indexed documentId,
        address indexed from,
        address indexed to
    );
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DOCUMENT_CREATOR_ROLE, msg.sender);
    }
    
    modifier onlyDocumentOwner(uint256 documentId) {
        require(documents[documentId].owner == msg.sender, "Not document owner");
        _;
    }
    
    modifier documentExists(uint256 documentId) {
        require(documents[documentId].owner != address(0), "Document does not exist");
        _;
    }
    
    modifier documentActive(uint256 documentId) {
        require(documents[documentId].isActive, "Document is not active");
        _;
    }
    
    function createDocument(
        bytes32 documentHash,
        string calldata encryptedKey,
        bool isPublic,
        uint256 expiresAt,
        DocumentAccess calldata access
    ) external whenNotPaused returns (uint256) {
        require(documentHash != bytes32(0), "Invalid document hash");
        require(bytes(encryptedKey).length > 0, "Invalid encrypted key");
        
        _documentIds.increment();
        uint256 documentId = _documentIds.current();
        
        documents[documentId] = Document({
            id: documentId,
            owner: msg.sender,
            documentHash: documentHash,
            encryptedKey: encryptedKey,
            isPublic: isPublic,
            isActive: true,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            access: access
        });
        
        emit DocumentCreated(
            documentId,
            msg.sender,
            documentHash,
            isPublic,
            block.timestamp
        );
        
        return documentId;
    }
    
    function requestSignature(
        uint256 documentId,
        address signer,
        string calldata encryptedKeyForSigner
    ) external 
        onlyDocumentOwner(documentId)
        documentExists(documentId)
        documentActive(documentId)
        whenNotPaused
    {
        require(signer != address(0), "Invalid signer address");
        require(signer != msg.sender, "Cannot request signature from self");
        require(bytes(encryptedKeyForSigner).length > 0, "Invalid encrypted key");
        
        SignatureRequest storage request = signatureRequests[documentId][signer];
        require(!request.isPending, "Signature already requested");
        
        request.signer = signer;
        request.encryptedKeyForSigner = encryptedKeyForSigner;
        request.isPending = true;
        request.requestedAt = block.timestamp;
        
        documentSigners[documentId].push(signer);
        
        emit SignatureRequested(
            documentId,
            signer,
            encryptedKeyForSigner,
            block.timestamp
        );
    }
    
    function signDocument(
        uint256 documentId,
        string calldata newEncryptedKey
    ) external 
        documentExists(documentId)
        documentActive(documentId)
        whenNotPaused
    {
        SignatureRequest storage request = signatureRequests[documentId][msg.sender];
        require(request.isPending, "No signature request found");
        require(!request.isSigned, "Document already signed");
        require(bytes(newEncryptedKey).length > 0, "Invalid encrypted key");
        
        request.isSigned = true;
        request.signedAt = block.timestamp;
        
        emit DocumentSigned(
            documentId,
            msg.sender,
            newEncryptedKey,
            block.timestamp
        );
    }
    
    function updateDocumentAccess(
        uint256 documentId,
        DocumentAccess calldata newAccess
    ) external 
        onlyDocumentOwner(documentId)
        documentExists(documentId)
        documentActive(documentId)
        whenNotPaused
    {
        documents[documentId].access = newAccess;
        
        emit DocumentAccessUpdated(
            documentId,
            newAccess.readOnly,
            newAccess.canSign,
            newAccess.canTransfer
        );
    }
    
    function transferDocument(
        uint256 documentId,
        address newOwner
    ) external 
        onlyDocumentOwner(documentId)
        documentExists(documentId)
        documentActive(documentId)
        whenNotPaused
    {
        require(newOwner != address(0), "Invalid new owner");
        require(documents[documentId].access.canTransfer, "Transfer not allowed");
        
        address oldOwner = documents[documentId].owner;
        documents[documentId].owner = newOwner;
        
        emit DocumentTransferred(documentId, oldOwner, newOwner);
    }
    
    function deactivateDocument(uint256 documentId) external 
        onlyDocumentOwner(documentId)
        documentExists(documentId)
        documentActive(documentId)
        whenNotPaused
    {
        documents[documentId].isActive = false;
    }
    
    // View functions
    function getDocument(uint256 documentId) external view returns (Document memory) {
        return documents[documentId];
    }
    
    function getSignatureRequest(uint256 documentId, address signer) external view returns (SignatureRequest memory) {
        return signatureRequests[documentId][signer];
    }
    
    function getDocumentSigners(uint256 documentId) external view returns (address[] memory) {
        return documentSigners[documentId];
    }
    
    function getDocumentCount() external view returns (uint256) {
        return _documentIds.current();
    }
    
    // Admin functions
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
