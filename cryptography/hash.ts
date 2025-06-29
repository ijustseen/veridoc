import { ethers } from 'ethers';

export function hashBinaryWithEthers(binaryData: Uint8Array): string {
  return ethers.keccak256(binaryData);
}