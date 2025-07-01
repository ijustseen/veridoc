import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EncryptedDocument, CreateEncryptedDocumentInput } from './types';

export class EncryptedDocumentORM {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createEncryptedDocument(data: CreateEncryptedDocumentInput): Promise<EncryptedDocument | null> {
    try {
      const { data: inserted, error } = await this.supabase
        .from('encrypted_documents')
        .insert([data])
        .select()
        .single();
      if (error) {
        console.error('Ошибка создания encrypted_document:', error);
        return null;
      }
      return inserted as EncryptedDocument;
    } catch (error) {
      console.error('Неожиданная ошибка при создании encrypted_document:', error);
      return null;
    }
  }

  async getEncryptedDocumentByDocumentId(documentId: number): Promise<EncryptedDocument | null> {
    try {
      const { data, error } = await this.supabase
        .from('encrypted_documents')
        .select('*')
        .eq('document_id', documentId)
        .single();
      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Ошибка получения encrypted_document по document_id:', error);
        }
        return null;
      }
      return data as EncryptedDocument;
    } catch (error) {
      console.error('Неожиданная ошибка при получении encrypted_document:', error);
      return null;
    }
  }

  async updateEncryptedDocument(id: number, updates: Partial<EncryptedDocument>): Promise<EncryptedDocument | null> {
    try {
      const { data, error } = await this.supabase
        .from('encrypted_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('Ошибка обновления encrypted_document:', error);
        return null;
      }
      return data as EncryptedDocument;
    } catch (error) {
      console.error('Неожиданная ошибка при обновлении encrypted_document:', error);
      return null;
    }
  }

  async deleteEncryptedDocument(id: number): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('encrypted_documents')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Ошибка удаления encrypted_document:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Неожиданная ошибка при удалении encrypted_document:', error);
      return false;
    }
  }
}