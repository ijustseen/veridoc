// SPDX-License-Identifier: GPL-3.0
        
pragma solidity >=0.4.22 <0.9.0;

// This import is automatically injected by Remix
import "remix_tests.sol"; 

// This import is required to use custom transaction context
// Although it may fail compilation in 'Solidity Compiler' plugin
// But it will work fine in 'Solidity Unit Testing' plugin
import "remix_accounts.sol";
import "../access/DocumentAccessControl.sol";

// File name has to end with '_test.sol', this file can contain more than one testSuite contracts
contract DocumentAccessControlTestSuite {
    
    DocumentAccessControl accessControl;
    address owner;
    address user1;
    address user2;
    address user3;
    
    uint256 testDocumentId;

    /// 'beforeAll' runs before all other tests
    function beforeAll() public {
        owner = TestsAccounts.getAccount(0);
        user1 = TestsAccounts.getAccount(1);
        user2 = TestsAccounts.getAccount(2);
        user3 = TestsAccounts.getAccount(3);
        
        accessControl = new DocumentAccessControl();
        testDocumentId = 1;
    }

    function testAccessControlDeployment() public {
        Assert.equal(
            accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), owner),
            true,
            "Owner should have admin role"
        );
    }

    function testGrantAccess() public {
        uint256 expiresAt = block.timestamp + 86400; // 24 hours
        
        accessControl.grantAccess(
            testDocumentId,
            user1,
            true,  // canRead
            true,  // canSign
            false, // canTransfer
            false, // canManageAccess
            expiresAt
        );
        
        // Check if access was granted
        DocumentAccessControl.AccessLevel memory access = accessControl.getDocumentAccess(testDocumentId, user1);
        Assert.equal(access.canRead, true, "User should have read access");
        Assert.equal(access.canSign, true, "User should have sign access");
        Assert.equal(access.canTransfer, false, "User should not have transfer access");
        Assert.equal(access.canManageAccess, false, "User should not have manage access");
        Assert.equal(access.expiresAt, expiresAt, "Expiration time should match");
    }

    function testGrantAccessWithInvalidUser() public {
        uint256 expiresAt = block.timestamp + 86400;
        
        try accessControl.grantAccess(
            testDocumentId,
            address(0), // Invalid address
            true,
            true,
            false,
            false,
            expiresAt
        ) {
            Assert.ok(false, "Should have failed with invalid user address");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Invalid user address", "Should fail with correct error message");
        }
    }

    function testGrantAccessWithPastExpiration() public {
        uint256 pastExpiration = block.timestamp - 3600; // 1 hour ago
        
        try accessControl.grantAccess(
            testDocumentId,
            user2,
            true,
            true,
            false,
            false,
            pastExpiration
        ) {
            Assert.ok(false, "Should have failed with past expiration");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Expiration must be in future", "Should fail with correct error message");
        }
    }

    function testHasDocumentAccess() public {
        // Grant access first
        uint256 expiresAt = block.timestamp + 86400;
        accessControl.grantAccess(
            testDocumentId,
            user1,
            true,
            true,
            false,
            false,
            expiresAt
        );
        
        // Test read access
        bool hasReadAccess = accessControl.hasDocumentAccess(
            testDocumentId,
            user1,
            accessControl.DOCUMENT_READER_ROLE()
        );
        Assert.equal(hasReadAccess, true, "User should have read access");
        
        // Test sign access
        bool hasSignAccess = accessControl.hasDocumentAccess(
            testDocumentId,
            user1,
            accessControl.DOCUMENT_SIGNER_ROLE()
        );
        Assert.equal(hasSignAccess, true, "User should have sign access");
        
        // Test manage access
        bool hasManageAccess = accessControl.hasDocumentAccess(
            testDocumentId,
            user1,
            accessControl.DOCUMENT_OWNER_ROLE()
        );
        Assert.equal(hasManageAccess, false, "User should not have manage access");
    }

    function testRevokeAccess() public {
        // Grant access first
        uint256 expiresAt = block.timestamp + 86400;
        accessControl.grantAccess(
            testDocumentId,
            user2,
            true,
            true,
            false,
            false,
            expiresAt
        );
        
        // Revoke access
        accessControl.revokeAccess(testDocumentId, user2);
        
        // Check if access was revoked
        DocumentAccessControl.AccessLevel memory access = accessControl.getDocumentAccess(testDocumentId, user2);
        Assert.equal(access.grantedAt, 0, "Access should be cleared");
    }

    function testRevokeNonExistentAccess() public {
        try accessControl.revokeAccess(testDocumentId, user3) {
            Assert.ok(false, "Should have failed when revoking non-existent access");
        } catch Error(string memory reason) {
            Assert.equal(reason, "No access to revoke", "Should fail with correct error message");
        }
    }

    function testGetDocumentUsers() public {
        // Grant access to multiple users
        uint256 expiresAt = block.timestamp + 86400;
        accessControl.grantAccess(
            testDocumentId,
            user1,
            true,
            true,
            false,
            false,
            expiresAt
        );
        
        accessControl.grantAccess(
            testDocumentId,
            user2,
            true,
            true,
            false,
            false,
            expiresAt
        );
        
        address[] memory users = accessControl.getDocumentUsers(testDocumentId);
        Assert.greaterThan(users.length, 0, "Should have users with access");
    }

    function testCheckAccessExpiration() public {
        uint256 expiresAt = block.timestamp + 3600; // 1 hour from now
        
        accessControl.grantAccess(
            testDocumentId,
            user1,
            true,
            true,
            false,
            false,
            expiresAt
        );
        
        (bool isExpired, uint256 expiresAtResult) = accessControl.checkAccessExpiration(testDocumentId, user1);
        Assert.equal(isExpired, false, "Access should not be expired");
        Assert.equal(expiresAtResult, expiresAt, "Expiration time should match");
    }

    function testAccessExpiration() public {
        uint256 expiresAt = block.timestamp - 3600; // 1 hour ago
        
        accessControl.grantAccess(
            testDocumentId,
            user3,
            true,
            true,
            false,
            false,
            expiresAt
        );
        
        (bool isExpired,) = accessControl.checkAccessExpiration(testDocumentId, user3);
        Assert.equal(isExpired, true, "Access should be expired");
        
        // Check if access is denied due to expiration
        bool hasAccess = accessControl.hasDocumentAccess(
            testDocumentId,
            user3,
            accessControl.DOCUMENT_READER_ROLE()
        );
        Assert.equal(hasAccess, false, "Expired access should be denied");
    }
} 