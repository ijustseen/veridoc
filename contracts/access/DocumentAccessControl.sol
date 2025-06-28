// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract DocumentAccessControl is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant DOCUMENT_OWNER_ROLE = keccak256("DOCUMENT_OWNER_ROLE");
    bytes32 public constant DOCUMENT_SIGNER_ROLE = keccak256("DOCUMENT_SIGNER_ROLE");
    bytes32 public constant DOCUMENT_READER_ROLE = keccak256("DOCUMENT_READER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    struct AccessLevel {
        bool canRead;
        bool canSign;
        bool canTransfer;
        bool canManageAccess;
        uint256 grantedAt;
        uint256 expiresAt;
    }
    
    // Mapping: documentId => userAddress => AccessLevel
    mapping(uint256 => mapping(address => AccessLevel)) public documentAccess;
    
    // Mapping: documentId => address[] (users with access)
    mapping(uint256 => address[]) public documentUsers;
    
    // Events
    event AccessGranted(
        uint256 indexed documentId,
        address indexed user,
        bool canRead,
        bool canSign,
        bool canTransfer,
        bool canManageAccess,
        uint256 expiresAt
    );
    
    event AccessRevoked(
        uint256 indexed documentId,
        address indexed user,
        uint256 revokedAt
    );
    
    event AccessExpired(
        uint256 indexed documentId,
        address indexed user,
        uint256 expiredAt
    );
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    modifier onlyDocumentOwner(uint256 documentId) {
        require(hasRole(DOCUMENT_OWNER_ROLE, msg.sender), "Not document owner");
        _;
    }
    
    modifier hasAccess(uint256 documentId, bytes32 permission) {
        require(hasDocumentAccess(documentId, msg.sender, permission), "Access denied");
        _;
    }
    
    function grantAccess(
        uint256 documentId,
        address user,
        bool canRead,
        bool canSign,
        bool canTransfer,
        bool canManageAccess,
        uint256 expiresAt
    ) external 
        onlyDocumentOwner(documentId)
        whenNotPaused
    {
        require(user != address(0), "Invalid user address");
        require(expiresAt > block.timestamp, "Expiration must be in future");
        
        AccessLevel storage access = documentAccess[documentId][user];
        
        access.canRead = canRead;
        access.canSign = canSign;
        access.canTransfer = canTransfer;
        access.canManageAccess = canManageAccess;
        access.grantedAt = block.timestamp;
        access.expiresAt = expiresAt;
        
        // Add to document users if not already present
        bool userExists = false;
        for (uint256 i = 0; i < documentUsers[documentId].length; i++) {
            if (documentUsers[documentId][i] == user) {
                userExists = true;
                break;
            }
        }
        
        if (!userExists) {
            documentUsers[documentId].push(user);
        }
        
        // Grant appropriate roles
        if (canRead) _grantRole(DOCUMENT_READER_ROLE, user);
        if (canSign) _grantRole(DOCUMENT_SIGNER_ROLE, user);
        if (canManageAccess) _grantRole(DOCUMENT_OWNER_ROLE, user);
        
        emit AccessGranted(
            documentId,
            user,
            canRead,
            canSign,
            canTransfer,
            canManageAccess,
            expiresAt
        );
    }
    
    function revokeAccess(uint256 documentId, address user) external 
        onlyDocumentOwner(documentId)
        whenNotPaused
    {
        AccessLevel storage access = documentAccess[documentId][user];
        require(access.grantedAt > 0, "No access to revoke");
        
        // Remove from document users
        address[] storage users = documentUsers[documentId];
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == user) {
                users[i] = users[users.length - 1];
                users.pop();
                break;
            }
        }
        
        // Revoke roles
        _revokeRole(DOCUMENT_READER_ROLE, user);
        _revokeRole(DOCUMENT_SIGNER_ROLE, user);
        _revokeRole(DOCUMENT_OWNER_ROLE, user);
        
        // Clear access
        delete documentAccess[documentId][user];
        
        emit AccessRevoked(documentId, user, block.timestamp);
    }
    
    function hasDocumentAccess(
        uint256 documentId,
        address user,
        bytes32 permission
    ) public view returns (bool) {
        AccessLevel storage access = documentAccess[documentId][user];
        
        // Check if access has expired
        if (access.expiresAt > 0 && access.expiresAt <= block.timestamp) {
            return false;
        }
        
        if (permission == DOCUMENT_READER_ROLE) return access.canRead;
        if (permission == DOCUMENT_SIGNER_ROLE) return access.canSign;
        if (permission == DOCUMENT_OWNER_ROLE) return access.canManageAccess;
        
        return false;
    }
    
    function getDocumentAccess(uint256 documentId, address user) external view returns (AccessLevel memory) {
        return documentAccess[documentId][user];
    }
    
    function getDocumentUsers(uint256 documentId) external view returns (address[] memory) {
        return documentUsers[documentId];
    }
    
    function checkAccessExpiration(uint256 documentId, address user) external view returns (bool isExpired, uint256 expiresAt) {
        AccessLevel storage access = documentAccess[documentId][user];
        isExpired = access.expiresAt > 0 && access.expiresAt <= block.timestamp;
        expiresAt = access.expiresAt;
    }
    
    // Admin functions
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
} 