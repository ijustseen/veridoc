const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DocumentRegistry", function () {
  let documentRegistry;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
    documentRegistry = await DocumentRegistry.deploy();
  });

  describe("Document Creation", function () {
    it("Should create a document successfully", async function () {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test document"));
      const encryptedKey = "encrypted_key_123";
      const isPublic = false;
      const expiresAt = Math.floor(Date.now() / 1000) + 86400; // 24 hours
      
      const access = {
        readOnly: true,
        canSign: true,
        canTransfer: false
      };

      await expect(
        documentRegistry.createDocument(
          documentHash,
          encryptedKey,
          isPublic,
          expiresAt,
          access
        )
      ).to.emit(documentRegistry, "DocumentCreated");

      const document = await documentRegistry.getDocument(1);
      expect(document.owner).to.equal(owner.address);
      expect(document.documentHash).to.equal(documentHash);
      expect(document.encryptedKey).to.equal(encryptedKey);
    });

    it("Should fail with invalid document hash", async function () {
      const encryptedKey = "encrypted_key_123";
      const access = {
        readOnly: true,
        canSign: true,
        canTransfer: false
      };

      await expect(
        documentRegistry.createDocument(
          ethers.ZeroHash,
          encryptedKey,
          false,
          Math.floor(Date.now() / 1000) + 86400,
          access
        )
      ).to.be.revertedWith("Invalid document hash");
    });
  });

  describe("Signature Requests", function () {
    beforeEach(async function () {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test document"));
      const encryptedKey = "encrypted_key_123";
      const access = {
        readOnly: true,
        canSign: true,
        canTransfer: false
      };

      await documentRegistry.createDocument(
        documentHash,
        encryptedKey,
        false,
        Math.floor(Date.now() / 1000) + 86400,
        access
      );
    });

    it("Should request signature successfully", async function () {
      const encryptedKeyForSigner = "encrypted_key_for_signer";
      
      await expect(
        documentRegistry.requestSignature(1, user1.address, encryptedKeyForSigner)
      ).to.emit(documentRegistry, "SignatureRequested");

      const request = await documentRegistry.getSignatureRequest(1, user1.address);
      expect(request.isPending).to.be.true;
      expect(request.encryptedKeyForSigner).to.equal(encryptedKeyForSigner);
    });

    it("Should fail when requesting signature from self", async function () {
      const encryptedKeyForSigner = "encrypted_key_for_signer";
      
      await expect(
        documentRegistry.requestSignature(1, owner.address, encryptedKeyForSigner)
      ).to.be.revertedWith("Cannot request signature from self");
    });
  });
}); 