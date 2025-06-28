// SPDX-License-Identifier: GPL-3.0
        
pragma solidity >=0.4.22 <0.9.0;

// This import is automatically injected by Remix
import "remix_tests.sol"; 

// This import is required to use custom transaction context
// Although it may fail compilation in 'Solidity Compiler' plugin
// But it will work fine in 'Solidity Unit Testing' plugin
import "remix_accounts.sol";
import "../documents/DocumentRegistry.sol";

// File name has to end with '_test.sol', this file can contain more than one testSuite contracts
contract DocumentRegistryTestSuite {
    
    DocumentRegistry documentRegistry;
    address owner;
    address user1;
    address user2;
    
    bytes32 testDocumentHash;
    string testEncryptedKey;
    uint256 testExpiresAt;

    /// 'beforeAll' runs before all other tests
    function beforeAll() public {
        owner = TestsAccounts.getAccount(0);
        user1 = TestsAccounts.getAccount(1);
        user2 = TestsAccounts.getAccount(2);
        
        documentRegistry = new DocumentRegistry();
        
        testDocumentHash = keccak256(abi.encodePacked("test document content"));
        testEncryptedKey = "encrypted_key_123";
        testExpiresAt = block.timestamp + 86400; // 24 hours from now
    }

    function testDocumentCreation() public {
        // Test successful document creation
        DocumentRegistry.DocumentAccess memory access = DocumentRegistry.DocumentAccess({
            readOnly: true,
            canSign: true,
            canTransfer: false
        });
        
        uint256 documentId = documentRegistry.createDocument(
            testDocumentHash,
            testEncryptedKey,
            false, // isPublic
            testExpiresAt,
            access
        );
        
        Assert.equal(documentId, 1, "Document ID should be 1");
        
        DocumentRegistry.Document memory doc = documentRegistry.getDocument(1);
        Assert.equal(doc.owner, owner, "Document owner should be correct");
        Assert.equal(doc.documentHash, testDocumentHash, "Document hash should match");
        Assert.equal(doc.encryptedKey, testEncryptedKey, "Encrypted key should match");
        Assert.equal(doc.isActive, true, "Document should be active");
    }

    function testInvalidDocumentHash() public {
        // Test document creation with invalid hash
        DocumentRegistry.DocumentAccess memory access = DocumentRegistry.DocumentAccess({
            readOnly: true,
            canSign: true,
            canTransfer: false
        });
        
        try documentRegistry.createDocument(
            bytes32(0), // Invalid hash
            testEncryptedKey,
            false,
            testExpiresAt,
            access
        ) {
            Assert.ok(false, "Should have failed with invalid hash");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Invalid document hash", "Should fail with correct error message");
        }
    }

    function testSignatureRequest() public {
        // Test signature request
        string memory encryptedKeyForSigner = "encrypted_key_for_signer";
        
        documentRegistry.requestSignature(1, user1, encryptedKeyForSigner);
        
        DocumentRegistry.SignatureRequest memory request = documentRegistry.getSignatureRequest(1, user1);
        Assert.equal(request.isPending, true, "Signature request should be pending");
        Assert.equal(request.encryptedKeyForSigner, encryptedKeyForSigner, "Encrypted key should match");
    }

    function testSelfSignatureRequest() public {
        // Test requesting signature from self (should fail)
        string memory encryptedKeyForSigner = "encrypted_key_for_signer";
        
        try documentRegistry.requestSignature(1, owner, encryptedKeyForSigner) {
            Assert.ok(false, "Should have failed when requesting signature from self");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Cannot request signature from self", "Should fail with correct error message");
        }
    }

    function testDocumentSigning() public {
        // Test document signing
        string memory newEncryptedKey = "new_encrypted_key";
        
        // Switch to user1 context
        // Note: In Remix, you would need to use custom transaction context
        // For this test, we'll assume the signature request exists
        
        documentRegistry.signDocument(1, newEncryptedKey);
        
        DocumentRegistry.SignatureRequest memory request = documentRegistry.getSignatureRequest(1, user1);
        Assert.equal(request.isSigned, true, "Document should be signed");
    }

    function testDocumentTransfer() public {
        // Test document transfer
        documentRegistry.transferDocument(1, user2);
        
        DocumentRegistry.Document memory doc = documentRegistry.getDocument(1);
        Assert.equal(doc.owner, user2, "Document should be transferred to new owner");
    }

    function testDocumentDeactivation() public {
        // Test document deactivation
        documentRegistry.deactivateDocument(1);
        
        DocumentRegistry.Document memory doc = documentRegistry.getDocument(1);
        Assert.equal(doc.isActive, false, "Document should be deactivated");
    }

    function testDocumentCount() public {
        // Test document count
        uint256 count = documentRegistry.getDocumentCount();
        Assert.greaterThan(count, 0, "Document count should be greater than 0");
    }
} 