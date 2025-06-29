import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Типы данных
interface Invitation {
  id: number;
  document_id: number;
  wallet_address: string;
  public_key?: string;
  encrypted_aes_key?: string;
  status: 'pending' | 'key_provided' | 'ready' | 'signed';
  created_at: string;
}

interface Document {
  id: number;
  hash: string;
  title: string;
  creator_address: string;
  encrypted_file_url: string;
  encrypted_aes_key_for_creator: string;
  created_at: string;
}

// Типы для создания (без auto-generated полей)
interface CreateInvitationInput {
  document_id: number;
  wallet_address: string;
  public_key?: string;
  encrypted_aes_key?: string;
  status: 'pending' | 'key_provided' | 'ready' | 'signed';
}

interface CreateDocumentInput {
  hash: string;
  title: string;
  creator_address: string;
  encrypted_file_url: string;
  encrypted_aes_key_for_creator: string;
}

// Расширенный тип для джоина
interface InvitationWithDocument extends Invitation {
  documents: Document;
}

// Типы для user_pkps
export type UserPKP = {
  id: number;
  wallet_address: string;
  token_id: string;
  created_at: string;
};

export type CreateUserPKPInput = {
  wallet_address: string;
  token_id: string;
};

class DocumentInvitationORM {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Создание документа
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

  // Создание приглашения
  async createInvitation(invitationData: CreateInvitationInput): Promise<Invitation | null> {
    try {
      const { data, error } = await this.supabase
        .from('invations') // Используем название таблицы как на скриншоте
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

  // Получение приглашений по wallet_address (возвращает массив)
  async getInvitationsByWalletAddress(walletAddress: string): Promise<Invitation[]> {
    try {
      const { data, error } = await this.supabase
        .from('invations')
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

  // Получение приглашений по wallet_address с документами (JOIN)
  async getInvitationsWithDocumentsByWalletAddress(walletAddress: string): Promise<InvitationWithDocument[]> {
    try {
      const { data, error } = await this.supabase
        .from('invations')
        .select(`
          *,
          documents (*)
        `)
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

  // Получение всех приглашений для документа
  async getInvitationsByDocumentId(documentId: number): Promise<Invitation[]> {
    try {
      const { data, error } = await this.supabase
        .from('invations')
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

  // Обновление статуса приглашения
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
        .from('invations')
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

  // Получение всех приглашений с документами (JOIN)
  async getAllInvitationsWithDocuments(): Promise<InvitationWithDocument[]> {
    try {
      const { data, error } = await this.supabase
        .from('invations')
        .select(`
          *,
          documents (*)
        `);

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

  // Создание документа с приглашениями в одной транзакции
  async createDocumentWithInvitations(
    documentData: CreateDocumentInput,
    invitationsData: Omit<CreateInvitationInput, 'document_id'>[]
  ): Promise<{ document: Document; invitations: Invitation[] } | null> {
    try {
      // Создаем документ
      const document = await this.createDocument(documentData);
      if (!document) {
        return null;
      }

      // Создаем приглашения с привязкой к документу
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

  // --- USER_PKPS METHODS ---

  // Получить одну запись user_pkps по wallet_address
  async getUserPKPByWalletAddress(walletAddress: string): Promise<UserPKP | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_pkps')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();
      if (error) {
        if (error.code !== 'PGRST116') { // not found is not an error
          console.error('Ошибка получения user_pkps по wallet_address:', error);
        }
        return null;
      }
      return data as UserPKP;
    } catch (error) {
      console.error('Неожиданная ошибка при получении user_pkps по wallet_address:', error);
      return null;
    }
  }

  // Получить все записи user_pkps по wallet_address (на случай, если их несколько)
  async getAllUserPKPsByWalletAddress(walletAddress: string): Promise<UserPKP[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_pkps')
        .select('*')
        .eq('wallet_address', walletAddress);
      if (error) {
        console.error('Ошибка получения всех user_pkps по wallet_address:', error);
        return [];
      }
      return data as UserPKP[];
    } catch (error) {
      console.error('Неожиданная ошибка при получении всех user_pkps по wallet_address:', error);
      return [];
    }
  }

  // Создать новую запись user_pkps
  async createUserPKP(data: CreateUserPKPInput): Promise<UserPKP | null> {
    try {
      const { data: inserted, error } = await this.supabase
        .from('user_pkps')
        .insert([data])
        .select()
        .single();
      if (error) {
        console.error('Ошибка создания user_pkps:', error);
        return null;
      }
      return inserted as UserPKP;
    } catch (error) {
      console.error('Неожиданная ошибка при создании user_pkps:', error);
      return null;
    }
  }
}

// Пример использования
export async function example() {
  const orm = new DocumentInvitationORM(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  // Создание документа
  const newDocument = await orm.createDocument({
    hash: 'abc123hash',
    title: 'Мой документ',
    creator_address: '0x1234...abcd',
    encrypted_file_url: 'https://example.com/encrypted-file',
    encrypted_aes_key_for_creator: 'encrypted_key_data'
  });

  if (newDocument) {
    console.log('Документ создан:', newDocument);

    // Создание приглашения для этого документа
    const newInvitation = await orm.createInvitation({
      document_id: newDocument.id,
      wallet_address: '0x5678...efgh',
      public_key: 'public_key_data',
      encrypted_aes_key: 'encrypted_aes_key_data',
      status: 'pending'
    });

    if (newInvitation) {
      console.log('Приглашение создано:', newInvitation);
    }
  }

  // Получение всех приглашений для конкретного wallet_address
  const walletAddress = '0x5678...efgh';
  const userInvitations = await orm.getInvitationsByWalletAddress(walletAddress);
  console.log(`Приглашения для ${walletAddress}:`, userInvitations);

  // Получение приглашений с документами для wallet_address
  const userInvitationsWithDocs = await orm.getInvitationsWithDocumentsByWalletAddress(walletAddress);
  console.log(`Приглашения с документами для ${walletAddress}:`, userInvitationsWithDocs);

  // Обновление статуса приглашения
  if (userInvitations.length > 0) {
    const updatedInvitation = await orm.updateInvitationStatus(
      userInvitations[0].id,
      'key_provided',
      { public_key: 'new_public_key_data' }
    );
    console.log('Обновленное приглашение:', updatedInvitation);
  }
}

export { DocumentInvitationORM, type Invitation, type Document, type CreateInvitationInput, type CreateDocumentInput, type InvitationWithDocument, type UserPKP, type CreateUserPKPInput };