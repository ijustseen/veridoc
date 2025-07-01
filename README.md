# VeriDoc 📄🔗

**VeriDoc** is a blockchain-powered platform for secure document storage, validation, and multi-signature workflows. It leverages Ethereum (Polygon PoS), advanced cryptography (ECIES, AES), and decentralized access control to enable private/public documents, granular permissions, and delayed decryption/transfer of document rights.

---

## 🚀 Key Features

- **Blockchain-backed Document Registry** 🛡️  
  All documents and signatures are registered on-chain for maximum integrity and auditability.
- **Multi-signature Workflow** ✍️  
  Documents can require signatures from multiple users, with each signature cryptographically verifiable.
- **Granular Access Control** 🔑  
  Documents can be public or private, with fine-grained permissions (read-only, sign, etc.).
- **End-to-end Encryption** 🔒  
  Documents are encrypted with AES-256-GCM; keys are distributed and protected using ECIES (asymmetric cryptography).
- **Delayed Decryption & Rights Transfer** ⏳  
  Document access can be granted or revoked after creation, supporting real-world business flows.
- **Supabase Integration** ☁️  
  For off-chain storage, metadata, and access management.

---

## 🛠️ How It Works

1. **Document Creation & Encryption**
   - User uploads a PDF.
   - A random AES key is generated and used to encrypt the document.
   - The AES key is then encrypted with the user's private key (ECIES).
2. **Inviting Signers**
   - The document owner selects other users (by wallet address) to sign the document.
   - Each invited user receives the AES key, encrypted with their public key.
3. **Signer Access & Signature**
   - Invited users decrypt the AES key with their private key, allowing them to view and sign the document.
   - Upon signing, a new encrypted key is generated and registered on-chain, ensuring only authorized users can decrypt.
4. **On-chain Signature & Audit**
   - All signatures and key associations are recorded on the blockchain.
   - The document hash, list of signers, and encrypted keys are publicly auditable.

---

## 🧩 Technology Stack

- **Blockchain Layer 2:** Polygon PoS (Ethereum L2)
- **Smart Contracts:** Solidity
- **Frontend/Backend:** Next.js, TypeScript
- **Blockchain Interaction:** ethers.js
- **Database/Storage:** Supabase (with future S3 support)
- **Key Storage:** LitProtocol (in dev)
- **Cryptography:** AES-256-GCM (symmetric), ECIES (asymmetric, elliptic curve)
- **Access Control:** Lit Protocol (Programmable Key Pairs, PKP), custom logic
- **File Handling:** PDF upload, hash verification, multi-signature flows

---

## 📁 Project Structure

```
/contracts         # Solidity smart contracts
/cryptography      # AES, ECIES, hashing utilities
/src/app           # Next.js application (API routes, pages)
/src/lib/lit       # Lit Protocol integration (PKP, ECIES, etc.)
/src/storage       # Supabase ORM and types
/public            # Static assets
/scripts           # Deployment scripts
```

---

## 📝 Usage

- **Document Upload & Encryption:**  
  Go to `/upload_test` to upload PDF files, encrypt them with AES-256-GCM, and store encrypted data in Supabase. This page also allows you to generate random metadata for testing.
- **Invite Signers:**  
  Select wallet addresses to invite for signing. Each invited user receives the AES key, encrypted with their public key.
- **Sign Document:**  
  Invited users decrypt the AES key with their private key, view the document, and sign it. Each signature is registered on-chain.
- **Audit:**  
  All actions (upload, encryption, signature, key transfer) are recorded on-chain and in Supabase for full traceability.

---

## 🔐 Security Model

- **Document confidentiality** is ensured by AES encryption.
- **Key distribution** uses ECIES (asymmetric encryption) per user.
- **Signatures** are stored on-chain, ensuring non-repudiation.
- **Access control** is enforced both on-chain and off-chain.

---

## 🧪 Development & Testing

- Run the app locally:
  ```sh
  npm run dev
  ```
- Test file upload and encryption at `/upload_test`. This page allows you to:
  - Upload PDF files
  - Encrypt them with AES-256-GCM
  - Store encrypted data in Supabase
  - Generate random metadata for testing

---

## 🗺️ Roadmap

- S3 integration for scalable storage.
- UI/UX improvements.
- More granular access control (time-based, role-based).
- Advanced audit and analytics.

---

## 📄 License

MIT

---

## 👥 Authors

- [Andrew, Nikita, Ruslan / VeriDocTeam]
