// encrypts by public key / decrypts by private key

import { encrypt, decrypt } from 'eciesjs';

export interface ECIESResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Encrypts data using public key
 */
export function encryptWithPublicKey(
  publicKeyHex: string, 
  data: string
): ECIESResult {
  try {
    if (!publicKeyHex || !data) {
        throw new Error('Public key and data are required');
      }

    // Remove 0x prefix if present
    const cleanPublicKey = publicKeyHex.startsWith('0x') ? publicKeyHex.slice(2) : publicKeyHex;

      if (!validatePublicKey(cleanPublicKey)) {
        throw new Error('Invalid Ethereum public key format');
      }
    
    const encrypted = encrypt(cleanPublicKey, Buffer.from(data, 'utf8'));
    
    return {
      success: true,
      data: encrypted.toString('hex')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Decrypts data using private key
 */
export function decryptWithPrivateKey(
  privateKeyHex: string, 
  encryptedHex: string
): ECIESResult {
  try {
    // Remove 0x prefix if present
    const cleanPrivateKey = privateKeyHex.startsWith('0x') 
      ? privateKeyHex.slice(2) 
      : privateKeyHex;
    
    const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
    const decrypted = decrypt(cleanPrivateKey, encryptedBuffer);
    
    return {
      success: true,
      data: decrypted.toString('utf8')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Encrypts AES key for transmission to recipient
 */
export function encryptAESData(
  aesKey: string, // hex string of AES key
  recipientPublicKey: string
): ECIESResult {
  return encryptWithPublicKey(recipientPublicKey, aesKey);
}

/**
 * Decrypts AES key
 */
export function decryptAESData(
  encryptedData: string, // hex string of encrypted key
  privateKey: string
): ECIESResult {
  return decryptWithPrivateKey(privateKey, encryptedData);
} 


function validatePublicKey(publicKey: string): boolean {
    const clean = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    return /^[0-9a-fA-F]{128}$/.test(clean); // 64 bytes = 128 hex chars
}
