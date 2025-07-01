export interface Invitation {
  id: number;
  document_id: number;
  wallet_address: string;
  public_key?: string;
  encrypted_aes_key?: string;
  status: 'pending' | 'key_provided' | 'ready' | 'signed';
  created_at: string;
}

export interface Document {
  id: number;
  hash: string;
  title: string;
  creator_address: string;
  file_url: string;
  encrypted_aes_key_for_creator?: string;
  is_encrypted: boolean;
  created_at: string;
}

export interface CreateInvitationInput {
  document_id: number;
  wallet_address: string;
  public_key?: string;
  encrypted_aes_key?: string;
  status: 'pending' | 'key_provided' | 'ready' | 'signed';
}

export interface CreateDocumentInput {
  hash: string;
  title: string;
  creator_address: string;
  file_url: string;
  encrypted_aes_key_for_creator?: string;
  is_encrypted: boolean;
}

export interface InvitationWithDocument extends Invitation {
  documents: Document;
}

export type UserPKP = {
  id: number;
  wallet_address: string;
  token_id: string;
  public_key: string;
  eth_address?: string;
  created_at: string;
};

export type CreateUserPKPInput = {
  wallet_address: string;
  token_id: string;
  public_key: string;
  eth_address?: string;
};

export interface EncryptedDocument {
  id: number;
  document_id: number;
  ciphertext: string;
  data_to_encrypt_hash: string;
  access_control_conditions: string; // JSON string
  created_at: string;
}

export interface CreateEncryptedDocumentInput {
  document_id: number;
  ciphertext: string;
  data_to_encrypt_hash: string;
  access_control_conditions: string;
} 