// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../documents/DocumentRegistry.sol";

contract SignatureManager is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant SIGNATURE_MANAGER_ROLE = keccak256("SIGNATURE_MANAGER_ROLE");
    
    DocumentRegistry public documentRegistry;
    
    struct Signature {
        address signer;
        bytes32 signatureHash;
        uint256 signedAt;
        bool isValid;
    }
    
    struct DocumentSignatures {
        uint256 documentId;
        Signature[] signatures;
        uint256 requiredSignatures;
        bool isFullySigned;
    }
    
    // Mapping: documentId => DocumentSignatures
    mapping(uint256 => DocumentSignatures) public documentSignatures;
    
    // Mapping: documentId => signerAddress => signatureIndex
    mapping(uint256 => mapping(address => uint256)) public signerSignatureIndex;
    
    // Events
    event SignatureAdded(
        uint256 indexed documentId,
        address indexed signer,
        bytes32 signatureHash,
        uint256 signedAt
    );
    
    event SignatureInvalidated(
        uint256 indexed documentId,
        address indexed signer,
        uint256 invalidatedAt
    );
    
    event DocumentFullySigned(
        uint256 indexed documentId,
        uint256 totalSignatures,
        uint256 signedAt
    );
    
    constructor(address _documentRegistry) {
        documentRegistry = DocumentRegistry(_documentRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SIGNATURE_MANAGER_ROLE, msg.sender);
    }
    
    modifier onlyDocumentOwner(uint256 documentId) {
        DocumentRegistry.Document memory doc = documentRegistry.getDocument(documentId);
        require(doc.owner == msg.sender, "Not document owner");
        _;
    }
    
    modifier onlyValidSigner(uint256 documentId, address signer) {
        DocumentRegistry.SignatureRequest memory request = documentRegistry.getSignatureRequest(documentId, signer);
        require(request.isPending, "Not a valid signer");
        _;
    }
    
    function addSignature(
        uint256 documentId,
        bytes32 signatureHash
    ) external 
        onlyValidSigner(documentId, msg.sender)
        whenNotPaused
        nonReentrant
    {
        require(signatureHash != bytes32(0), "Invalid signature hash");
        
        DocumentSignatures storage docSigs = documentSignatures[documentId];
        
        // Initialize if first signature
        if (docSigs.documentId == 0) {
            docSigs.documentId = documentId;
            docSigs.requiredSignatures = documentRegistry.getDocumentSigners(documentId).length;
        }
        
        // Check if already signed
        require(signerSignatureIndex[documentId][msg.sender] == 0, "Already signed");
        
        Signature memory newSignature = Signature({
            signer: msg.sender,
            signatureHash: signatureHash,
            signedAt: block.timestamp,
            isValid: true
        });
        
        docSigs.signatures.push(newSignature);
        signerSignatureIndex[documentId][msg.sender] = docSigs.signatures.length;
        
        emit SignatureAdded(
            documentId,
            msg.sender,
            signatureHash,
            block.timestamp
        );
        
        // Check if document is fully signed
        if (docSigs.signatures.length >= docSigs.requiredSignatures) {
            docSigs.isFullySigned = true;
            emit DocumentFullySigned(
                documentId,
                docSigs.signatures.length,
                block.timestamp
            );
        }
    }
    
    function invalidateSignature(
        uint256 documentId,
        address signer
    ) external 
        onlyDocumentOwner(documentId)
        whenNotPaused
    {
        uint256 signatureIndex = signerSignatureIndex[documentId][signer];
        require(signatureIndex > 0, "No signature found");
        
        DocumentSignatures storage docSigs = documentSignatures[documentId];
        require(signatureIndex <= docSigs.signatures.length, "Invalid signature index");
        
        // Adjust for 1-based indexing
        uint256 actualIndex = signatureIndex - 1;
        docSigs.signatures[actualIndex].isValid = false;
        
        emit SignatureInvalidated(documentId, signer, block.timestamp);
    }
    
    function verifySignature(
        uint256 documentId,
        address signer
    ) external view returns (bool) {
        uint256 signatureIndex = signerSignatureIndex[documentId][signer];
        if (signatureIndex == 0) return false;
        
        DocumentSignatures storage docSigs = documentSignatures[documentId];
        uint256 actualIndex = signatureIndex - 1;
        
        return docSigs.signatures[actualIndex].isValid;
    }
    
    function getDocumentSignatures(uint256 documentId) external view returns (Signature[] memory) {
        return documentSignatures[documentId].signatures;
    }
    
    function getDocumentSignatureStatus(uint256 documentId) external view returns (
        uint256 totalSignatures,
        uint256 requiredSignatures,
        bool isFullySigned
    ) {
        DocumentSignatures storage docSigs = documentSignatures[documentId];
        return (
            docSigs.signatures.length,
            docSigs.requiredSignatures,
            docSigs.isFullySigned
        );
    }
    
    function isDocumentFullySigned(uint256 documentId) external view returns (bool) {
        return documentSignatures[documentId].isFullySigned;
    }
    
    // Admin functions
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
} 