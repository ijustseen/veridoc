export type EncryptedDocument = {
  id: string;
  storageUrl: string;
  encryptedKeys: Record<string, string>;
  hash: string;
  whitelist: string[];
  createdAt: string;
}; 