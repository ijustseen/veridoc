// AES-256-GCM / encrypts/decripts file by random key

const IV_LENGTH = 12; // 12 bytes for AES-GCM
const KEY_LENGTH = 32; // 32 bytes = 256 bits
const HEX_KEY_LENGTH = 64; // 32 bytes in hex = 64 characters

/**
 * Generates a random AES-256 key
 */
export function generateAESKey(): string {
  const keyBytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
  return Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface EncryptionResult {
  encryptedDataWithIV: ArrayBuffer;
  key: string; // AES key in hex
}

export interface DecryptionResult {
  success: boolean;
  data?: ArrayBuffer;
  error?: string;
}

export interface FileEncryptionResult {
  success: boolean;
  data?: ArrayBuffer;
  error?: string;
}

/**
 * Encrypts a File object with provided key
 */
export async function encryptFile(file: File, keyHex: string): Promise<FileEncryptionResult> {
  try {
    if (!file) {
      throw new Error('File is required');
    }
    if (!keyHex) {
      throw new Error('AES key is required');
    }
    
    const fileBuffer = await file.arrayBuffer();
    const encrypted = await encryptFileWithKey(fileBuffer, keyHex);
    
    return {
      success: true,
      data: encrypted
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}


/**
 * Encrypts data with provided key
 */
async function encryptFileWithKey(fileBuffer: ArrayBuffer, keyHex: string): Promise<ArrayBuffer> {
  try {
    if (!fileBuffer) {
      throw new Error('File buffer is required');
    }
    if (!keyHex || !new RegExp(`^[0-9a-fA-F]{${HEX_KEY_LENGTH}}$`).test(keyHex)) {
      throw new Error(`Invalid key format: expected ${HEX_KEY_LENGTH} hex characters`);
    }
    
    // Convert hex key to bytes
    const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Encrypt
    const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, fileBuffer);
    
    // Concatenate: IV (12 bytes) + encrypted data
    const result = new Uint8Array(IV_LENGTH + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), IV_LENGTH);
    
    return result.buffer;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypts data with embedded IV (legacy function)
 */
async function encryptFileWithEmbeddedIV(fileBuffer: ArrayBuffer): Promise<EncryptionResult> {
    try {
      if (!fileBuffer) {
        throw new Error('File buffer is required');
      }
      
      // Generate key and IV
      const aesKeyBytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
      const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
      
      // Encrypt
      const cryptoKey = await crypto.subtle.importKey('raw', aesKeyBytes, 'AES-GCM', false, ['encrypt']);
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, fileBuffer);
      
      // Concatenate: IV (12 bytes) + encrypted data
      const result = new Uint8Array(IV_LENGTH + encrypted.byteLength);
      result.set(iv, 0);
      result.set(new Uint8Array(encrypted), IV_LENGTH);
      
      return {
        encryptedDataWithIV: result.buffer,
        key: Array.from(aesKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

/**
 * Decrypts data with embedded IV
*/
export async function decryptFile(
    encryptedDataWithIV: Uint8Array | ArrayBuffer, 
    keyHex: string
): Promise<DecryptionResult> {
    try {
        // Validate input data
        if (!encryptedDataWithIV) {
            throw new Error('Encrypted data is required');
        }
        
        // Convert to ArrayBuffer if needed
        const dataBuffer = encryptedDataWithIV instanceof Uint8Array 
            ? encryptedDataWithIV.buffer.slice(encryptedDataWithIV.byteOffset, encryptedDataWithIV.byteOffset + encryptedDataWithIV.byteLength)
            : encryptedDataWithIV;
            
        if (dataBuffer.byteLength < IV_LENGTH) {
            throw new Error('Invalid encrypted data: too short (missing IV)');
        }
        if (!keyHex) {
            throw new Error('Key is required');
        }
        if (!new RegExp(`^[0-9a-fA-F]{${HEX_KEY_LENGTH}}$`).test(keyHex)) {
            throw new Error(`Invalid key format: expected ${HEX_KEY_LENGTH} hex characters`);
        }
        
        // Extract IV from the beginning of the file
        const iv = new Uint8Array(dataBuffer.slice(0, IV_LENGTH));
        const encryptedData = dataBuffer.slice(IV_LENGTH);
        
        // Decrypt
        const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
        const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
        
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encryptedData);
        
        return {
            success: true,
            data: decrypted
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown decryption error'
        };
    }
}

/**
 * Creates a Blob from decrypted data
*/
export function createBlobFromDecrypted(
    decryptedData: ArrayBuffer, 
    mimeType: string = 'application/octet-stream'
): Blob {
    if (!decryptedData) {
        throw new Error('Decrypted data is required');
    }
    return new Blob([decryptedData], { type: mimeType });
}