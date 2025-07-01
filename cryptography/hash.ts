import { ethers } from 'ethers';

export function hashBinaryWithEthers(binaryData: Uint8Array): string {
  return ethers.keccak256(binaryData);
}

/**
 * Hashes a File object using keccak256
 */
export async function hashFile(file: File): Promise<string> {
  try {
    if (!file) {
      throw new Error('File is required');
    }
    
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    
    return hashBinaryWithEthers(fileBytes);
  } catch (error) {
    throw new Error(`Failed to hash file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}