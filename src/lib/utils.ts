import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ethers } from "ethers";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hashBinaryWithEthers(binaryData: Uint8Array): string {
  return ethers.keccak256(binaryData);
}
