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

// File name has to end with '_test.sol', this file can contain more than one testSuite contracts
contract SignatureManagerTestSuite {
    
    DocumentRegistry documentRegistry;
    SignatureManager signatureManager;
    address owner;
    address user1;
    address user2;
    
    bytes32 testDocumentHash;
    string testEncryptedKey;
    uint256 testExpiresAt;
    uint256 documentId;

    /// 'beforeAll' runs before all other tests
    function beforeAll() public {
        owner = TestsAccounts.getAccount(0);
        user1 = TestsAccounts.getAccount(1);
        user2 = TestsAccounts.getAccount(2);
        
        documentRegistry = new DocumentRegistry();
        signatureManager = new SignatureManager(address(documentRegistry));
        
        testDocumentHash = keccak256(abi.encodePacked("test document content"));
        testEncryptedKey = "encrypted_key_123";
        testExpiresAt = block.timestamp + 86400; // 24 hours from now
        
        // Create a test document
        DocumentRegistry.DocumentAccess memory access = DocumentRegistry.DocumentAccess({
            readOnly: true,
            canSign: true,
            canTransfer: false
        });
        
        documentId = documentRegistry.createDocument(
            testDocumentHash,
            testEncryptedKey,
            false,
            testExpiresAt,
            access
        );
    }

    function testSignatureManagerDeployment() public {
        Assert.equal(
            address(signatureManager.documentRegistry()),
            address(documentRegistry),
            "DocumentRegistry address should be set correctly"
        );
    }

    function testAddSignature() public {
        // First, request signature from user1
        string memory encryptedKeyForSigner = "encrypted_key_for_signer";
        documentRegistry.requestSignature(documentId, user1, encryptedKeyForSigner);
        
        // Add signature
        bytes32 signatureHash = keccak256(abi.encodePacked("signature_data"));
        signatureManager.addSignature(documentId, signatureHash);
        
        // Verify signature was added
        bool isValid = signatureManager.verifySignature(documentId, user1);
        Assert.equal(isValid, true, "Signature should be valid");
    }

    function testDuplicateSignature() public {
        bytes32 signatureHash = keccak256(abi.encodePacked("signature_data_2"));
        
        try signatureManager.addSignature(documentId, signatureHash) {
            Assert.ok(false, "Should have failed with duplicate signature");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Already signed", "Should fail with correct error message");
        }
    }

    function testInvalidSignatureHash() public {
        // Request signature for user2
        string memory encryptedKeyForSigner = "encrypted_key_for_user2";
        documentRegistry.requestSignature(documentId, user2, encryptedKeyForSigner);
        
        try signatureManager.addSignature(documentId, bytes32(0)) {
            Assert.ok(false, "Should have failed with invalid signature hash");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Invalid signature hash", "Should fail with correct error message");
        }
    }

    function testSignatureInvalidation() public {
        // Invalidate signature
        signatureManager.invalidateSignature(documentId, user1);
        
        // Verify signature is invalid
        bool isValid = signatureManager.verifySignature(documentId, user1);
        Assert.equal(isValid, false, "Signature should be invalid after invalidation");
    }

    function testDocumentSignatureStatus() public {
        // Add another signature
        string memory encryptedKeyForSigner = "encrypted_key_for_user2";
        documentRegistry.requestSignature(documentId, user2, encryptedKeyForSigner);
        
        bytes32 signatureHash = keccak256(abi.encodePacked("signature_data_3"));
        signatureManager.addSignature(documentId, signatureHash);
        
        // Check signature status
        (uint256 totalSignatures, uint256 requiredSignatures, bool isFullySigned) = 
            signatureManager.getDocumentSignatureStatus(documentId);
        
        Assert.greaterThan(totalSignatures, 0, "Total signatures should be greater than 0");
        Assert.equal(requiredSignatures, 2, "Required signatures should be 2");
        Assert.equal(isFullySigned, true, "Document should be fully signed");
    }

    function testGetDocumentSignatures() public {
        SignatureManager.Signature[] memory signatures = signatureManager.getDocumentSignatures(documentId);
        Assert.greaterThan(signatures.length, 0, "Should have signatures");
    }

    function testIsDocumentFullySigned() public {
        bool isFullySigned = signatureManager.isDocumentFullySigned(documentId);
        Assert.equal(isFullySigned, true, "Document should be fully signed");
    }
} 