// SPDX-License-Identifier: GPL-3.0
        
pragma solidity >=0.4.22 <0.9.0;

// This import is automatically injected by Remix
import "remix_tests.sol"; 

// This import is required to use custom transaction context
// Although it may fail compilation in 'Solidity Compiler' plugin
// But it will work fine in 'Solidity Unit Testing' plugin
import "remix_accounts.sol";
import "../documents/DocumentRegistry.sol";
import "../signatures/SignatureManager.sol";
import "../access/DocumentAccessControl.sol";

// File name has to end with '_test.sol', this file can contain more than one testSuite contracts
contract IntegrationTestSuite {
    
    DocumentRegistry documentRegistry;
    SignatureManager signatureManager;
    DocumentAccessControl accessControl;
    
    address owner;
    address user1;
    address user2;
    address user3;
    
    bytes32 testDocumentHash;
    string testEncryptedKey;
    uint256 testExpiresAt;
    uint256 documentId;

    /// 'beforeAll' runs before all other tests
    function beforeAll() public {
        owner = TestsAccounts.getAccount(0);
        user1 = TestsAccounts.getAccount(1);
        user2 = TestsAccounts.getAccount(2);
        user3 = TestsAccounts.getAccount(3);
        
        // Deploy contracts
        documentRegistry = new DocumentRegistry();
        signatureManager = new SignatureManager(address(documentRegistry));
        accessControl = new DocumentAccessControl();
        
        testDocumentHash = keccak256(abi.encodePacked("integration test document"));
        testEncryptedKey = "encrypted_key_integration_test";
        testExpiresAt = block.timestamp + 86400; // 24 hours
    }

    function testCompleteDocumentWorkflow() public {
        // 1. Create document
        DocumentRegistry.DocumentAccess memory access = DocumentRegistry.DocumentAccess({
            readOnly: true,
            canSign: true,
            canTransfer: false
        });
        
        documentId = documentRegistry.createDocument(
            testDocumentHash,
            testEncryptedKey,
            false, // isPublic
            testExpiresAt,
            access
        );
        
        Assert.equal(documentId, 1, "Document should be created with ID 1");
        
        // 2. Grant access to users
        uint256 accessExpiresAt = block.timestamp + 86400;
        accessControl.grantAccess(
            documentId,
            user1,
            true,  // canRead
            true,  // canSign
            false, // canTransfer
            false, // canManageAccess
            accessExpiresAt
        );
        
        accessControl.grantAccess(
            documentId,
            user2,
            true,  // canRead
            true,  // canSign
            false, // canTransfer
            false, // canManageAccess
            accessExpiresAt
        );
        
        // 3. Request signatures
        string memory encryptedKeyForUser1 = "encrypted_key_for_user1";
        string memory encryptedKeyForUser2 = "encrypted_key_for_user2";
        
        documentRegistry.requestSignature(documentId, user1, encryptedKeyForUser1);
        documentRegistry.requestSignature(documentId, user2, encryptedKeyForUser2);
        
        // 4. Add signatures
        bytes32 signature1 = keccak256(abi.encodePacked("signature_user1"));
        bytes32 signature2 = keccak256(abi.encodePacked("signature_user2"));
        
        signatureManager.addSignature(documentId, signature1);
        signatureManager.addSignature(documentId, signature2);
        
        // 5. Verify complete workflow
        DocumentRegistry.Document memory doc = documentRegistry.getDocument(documentId);
        Assert.equal(doc.owner, owner, "Document owner should be correct");
        Assert.equal(doc.isActive, true, "Document should be active");
        
        // Check signatures
        (uint256 totalSignatures, uint256 requiredSignatures, bool isFullySigned) = 
            signatureManager.getDocumentSignatureStatus(documentId);
        Assert.equal(totalSignatures, 2, "Should have 2 signatures");
        Assert.equal(requiredSignatures, 2, "Should require 2 signatures");
        Assert.equal(isFullySigned, true, "Document should be fully signed");
        
        // Check access
        bool user1HasAccess = accessControl.hasDocumentAccess(
            documentId,
            user1,
            accessControl.DOCUMENT_READER_ROLE()
        );
        Assert.equal(user1HasAccess, true, "User1 should have read access");
        
        bool user2HasAccess = accessControl.hasDocumentAccess(
            documentId,
            user2,
            accessControl.DOCUMENT_SIGNER_ROLE()
        );
        Assert.equal(user2HasAccess, true, "User2 should have sign access");
    }

    function testDocumentTransferWithAccessControl() public {
        // Create a new document for transfer test
        DocumentRegistry.DocumentAccess memory access = DocumentRegistry.DocumentAccess({
            readOnly: true,
            canSign: true,
            canTransfer: true // Enable transfer
        });
        
        uint256 transferDocumentId = documentRegistry.createDocument(
            keccak256(abi.encodePacked("transfer test document")),
            "encrypted_key_transfer_test",
            false,
            testExpiresAt,
            access
        );
        
        // Grant transfer access to user1
        accessControl.grantAccess(
            transferDocumentId,
            user1,
            true,  // canRead
            true,  // canSign
            true,  // canTransfer
            false, // canManageAccess
            testExpiresAt
        );
        
        // Transfer document
        documentRegistry.transferDocument(transferDocumentId, user1);
        
        // Verify transfer
        DocumentRegistry.Document memory doc = documentRegistry.getDocument(transferDocumentId);
        Assert.equal(doc.owner, user1, "Document should be transferred to user1");
    }

    function testAccessExpirationWorkflow() public {
        // Create document with short expiration
        uint256 shortExpiration = block.timestamp + 1; // 1 second
        
        DocumentRegistry.DocumentAccess memory access = DocumentRegistry.DocumentAccess({
            readOnly: true,
            canSign: true,
            canTransfer: false
        });
        
        uint256 expiringDocumentId = documentRegistry.createDocument(
            keccak256(abi.encodePacked("expiring document")),
            "encrypted_key_expiring",
            false,
            shortExpiration,
            access
        );
        
        // Grant access with short expiration
        accessControl.grantAccess(
            expiringDocumentId,
            user3,
            true,
            true,
            false,
            false,
            shortExpiration
        );
        
        // Wait for expiration (in real scenario, this would be time-based)
        // For testing, we'll check the expiration logic
        (bool isExpired,) = accessControl.checkAccessExpiration(expiringDocumentId, user3);
        
        // Note: In a real blockchain environment, you'd need to mine blocks to advance time
        // For this test, we're just verifying the expiration check logic works
        Assert.equal(isExpired, false, "Access should not be expired immediately");
    }

    function testMultiSignatureWorkflow() public {
        // Create document requiring multiple signatures
        DocumentRegistry.DocumentAccess memory access = DocumentRegistry.DocumentAccess({
            readOnly: true,
            canSign: true,
            canTransfer: false
        });
        
        uint256 multiSigDocumentId = documentRegistry.createDocument(
            keccak256(abi.encodePacked("multi-sig document")),
            "encrypted_key_multisig",
            false,
            testExpiresAt,
            access
        );
        
        // Request signatures from all users
        documentRegistry.requestSignature(multiSigDocumentId, user1, "key1");
        documentRegistry.requestSignature(multiSigDocumentId, user2, "key2");
        documentRegistry.requestSignature(multiSigDocumentId, user3, "key3");
        
        // Add signatures
        signatureManager.addSignature(multiSigDocumentId, keccak256(abi.encodePacked("sig1")));
        signatureManager.addSignature(multiSigDocumentId, keccak256(abi.encodePacked("sig2")));
        signatureManager.addSignature(multiSigDocumentId, keccak256(abi.encodePacked("sig3")));
        
        // Verify multi-signature completion
        (uint256 totalSignatures, uint256 requiredSignatures, bool isFullySigned) = 
            signatureManager.getDocumentSignatureStatus(multiSigDocumentId);
        
        Assert.equal(totalSignatures, 3, "Should have 3 signatures");
        Assert.equal(requiredSignatures, 3, "Should require 3 signatures");
        Assert.equal(isFullySigned, true, "Document should be fully signed");
        
        // Verify all signatures are valid
        Assert.equal(signatureManager.verifySignature(multiSigDocumentId, user1), true, "User1 signature should be valid");
        Assert.equal(signatureManager.verifySignature(multiSigDocumentId, user2), true, "User2 signature should be valid");
        Assert.equal(signatureManager.verifySignature(multiSigDocumentId, user3), true, "User3 signature should be valid");
    }

    function testDocumentDeactivation() public {
        // Create document
        DocumentRegistry.DocumentAccess memory access = DocumentRegistry.DocumentAccess({
            readOnly: true,
            canSign: true,
            canTransfer: false
        });
        
        uint256 deactivationDocumentId = documentRegistry.createDocument(
            keccak256(abi.encodePacked("deactivation test")),
            "encrypted_key_deactivation",
            false,
            testExpiresAt,
            access
        );
        
        // Deactivate document
        documentRegistry.deactivateDocument(deactivationDocumentId);
        
        // Verify deactivation
        DocumentRegistry.Document memory doc = documentRegistry.getDocument(deactivationDocumentId);
        Assert.equal(doc.isActive, false, "Document should be deactivated");
        
        // Try to request signature on deactivated document (should fail)
        try documentRegistry.requestSignature(deactivationDocumentId, user1, "key") {
            Assert.ok(false, "Should have failed on deactivated document");
        } catch {
            // Expected to fail
            Assert.ok(true, "Correctly failed on deactivated document");
        }
    }
} 