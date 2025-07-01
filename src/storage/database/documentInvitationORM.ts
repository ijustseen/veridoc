import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Invitation, Document, CreateInvitationInput, CreateDocumentInput, InvitationWithDocument } from './types';

export class DocumentInvitationORM {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createDocument(documentData: CreateDocumentInput): Promise<Document | null> {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .insert([documentData])
        .select()
        .single();
      if (error) {
        console.error('Ошибка создания документа:', error);
        return null;
      }
      return data as Document;
    } catch (error) {
      console.error('Неожиданная ошибка при создании документа:', error);
      return null;
    }
  }

  async createInvitation(invitationData: CreateInvitationInput): Promise<Invitation | null> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .insert([invitationData])
        .select()
        .single();
      if (error) {
        console.error('Ошибка создания приглашения:', error);
        return null;
      }
      return data as Invitation;
    } catch (error) {
      console.error('Неожиданная ошибка при создании приглашения:', error);
      return null;
    }
  }

  async getInvitationsByWalletAddress(walletAddress: string): Promise<Invitation[]> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .select('*')
        .eq('wallet_address', walletAddress);
      if (error) {
        console.error('Ошибка получения приглашений по wallet_address:', error);
        return [];
      }
      return data as Invitation[];
    } catch (error) {
      console.error('Неожиданная ошибка при получении приглашений по wallet_address:', error);
      return [];
    }
  }

  async getInvitationsWithDocumentsByWalletAddress(walletAddress: string): Promise<InvitationWithDocument[]> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .select(`*, documents (*)`)
        .eq('wallet_address', walletAddress);
      if (error) {
        console.error('Ошибка получения приглашений с документами по wallet_address:', error);
        return [];
      }
      return data as InvitationWithDocument[];
    } catch (error) {
      console.error('Неожиданная ошибка при получении приглашений с документами по wallet_address:', error);
      return [];
    }
  }

  async getInvitationsByDocumentId(documentId: number): Promise<Invitation[]> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .select('*')
        .eq('document_id', documentId);
      if (error) {
        console.error('Ошибка получения приглашений по document_id:', error);
        return [];
      }
      return data as Invitation[];
    } catch (error) {
      console.error('Неожиданная ошибка при получении приглашений:', error);
      return [];
    }
  }

  async updateInvitationStatus(
    invitationId: number,
    status: 'pending' | 'key_provided' | 'ready' | 'signed',
    additionalData?: { public_key?: string; encrypted_aes_key?: string }
  ): Promise<Invitation | null> {
    try {
      const updateData: any = { status };
      if (additionalData?.public_key) {
        updateData.public_key = additionalData.public_key;
      }
      if (additionalData?.encrypted_aes_key) {
        updateData.encrypted_aes_key = additionalData.encrypted_aes_key;
      }
      const { data, error } = await this.supabase
        .from('invitations')
        .update(updateData)
        .eq('id', invitationId)
        .select()
        .single();
      if (error) {
        console.error('Ошибка обновления статуса приглашения:', error);
        return null;
      }
      return data as Invitation;
    } catch (error) {
      console.error('Неожиданная ошибка при обновлении статуса приглашения:', error);
      return null;
    }
  }

  async getAllInvitationsWithDocuments(): Promise<InvitationWithDocument[]> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .select(`*, documents (*)`);
      if (error) {
        console.error('Ошибка получения всех приглашений с документами:', error);
        return [];
      }
      return data as InvitationWithDocument[];
    } catch (error) {
      console.error('Неожиданная ошибка при получении всех приглашений с документами:', error);
      return [];
    }
  }

  async createDocumentWithInvitations(
    documentData: CreateDocumentInput,
    invitationsData: Omit<CreateInvitationInput, 'document_id'>[]
  ): Promise<{ document: Document; invitations: Invitation[] } | null> {
    try {
      const document = await this.createDocument(documentData);
      if (!document) {
        return null;
      }
      const invitations: Invitation[] = [];
      for (const invitationData of invitationsData) {
        const invitation = await this.createInvitation({
          ...invitationData,
          document_id: document.id
        });
        if (invitation) {
          invitations.push(invitation);
        }
      }
      return { document, invitations };
    } catch (error) {
      console.error('Ошибка создания документа с приглашениями:', error);
      return null;
    }
  }

  async getDocumentById(id: number): Promise<Document | null> {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error('Ошибка получения документа по id:', error);
        return null;
      }
      return data as Document;
    } catch (error) {
      console.error('Неожиданная ошибка при получении документа по id:', error);
      return null;
    }
  }

  /**
   * Получить все документы, где пользователь либо создатель, либо приглашён как подписывающий
   */
  async getDocumentsByWalletAddress(walletAddress: string): Promise<Document[]> {
    try {
      // Получаем документы, где пользователь — создатель
      const { data: createdDocs, error: createdError } = await this.supabase
        .from('documents')
        .select('*')
        .eq('creator_address', walletAddress);
      if (createdError) {
        console.error('Ошибка получения документов, созданных пользователем:', createdError);
        return [];
      }

      // Получаем приглашения, где пользователь — подписывающий
      const { data: invitations, error: invError } = await this.supabase
        .from('invitations')
        .select('document_id')
        .eq('wallet_address', walletAddress);
      if (invError) {
        console.error('Ошибка получения приглашений пользователя:', invError);
        return createdDocs as Document[];
      }
      const invitedDocIds = (invitations as { document_id: number }[]).map(i => i.document_id);

      // Получаем документы, где пользователь приглашён
      let invitedDocs: Document[] = [];
      if (invitedDocIds.length > 0) {
        const { data: docs, error: docsError } = await this.supabase
          .from('documents')
          .select('*')
          .in('id', invitedDocIds);
        if (docsError) {
          console.error('Ошибка получения документов по приглашениям:', docsError);
        } else {
          invitedDocs = docs as Document[];
        }
      }

      // Объединяем и убираем дубли
      const allDocs = [...(createdDocs as Document[]), ...invitedDocs];
      const uniqueDocs = allDocs.filter((doc, idx, arr) => arr.findIndex(d => d.id === doc.id) === idx);
      return uniqueDocs;
    } catch (error) {
      console.error('Неожиданная ошибка при получении документов пользователя:', error);
      return [];
    }
  }
} 