import { NextRequest, NextResponse } from 'next/server';
import { DocumentInvitationORM } from '@/storage/database/documentInvitationORM';
import { CreateDocumentInput } from '@/storage/database/types';
import { uploadAndGetPublicUrlByType } from '@/storage/bucket/bucket';

const orm = new DocumentInvitationORM(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  // Проверяем Content-Type
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Ожидается multipart/form-data' }, { status: 400 });
  }

  // Парсим formData
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const title = formData.get('title') as string | null;
  const hash = formData.get('hash') as string | null;
  const creator_address = formData.get('creator_address') as string | null;
  const encrypted_aes_key_for_creator = formData.get('encrypted_aes_key_for_creator') as string | null;
  const is_public = formData.get('is_public') as string | null;

  if (!file || !title || !hash || !creator_address || is_public === null) {
    return NextResponse.json({ error: 'Не все поля заполнены' }, { status: 400 });
  }

  const isPublic = is_public === 'true';
  const isEncrypted = !isPublic; // если не публичный, то зашифрованный

  // Если документ зашифрован, AES ключ обязателен
  if (isEncrypted && !encrypted_aes_key_for_creator) {
    return NextResponse.json({ error: 'Для зашифрованных документов требуется encrypted_aes_key_for_creator' }, { status: 400 });
  }

  // Путь для файла в бакете
  const filePath = `${creator_address}/${Date.now()}_${file.name}`;
  const publicUrl = await uploadAndGetPublicUrlByType(isPublic, filePath, file);
  if (!publicUrl) {
    return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 });
  }

  const docData: CreateDocumentInput = {
    hash,
    title,
    creator_address,
    file_url: publicUrl,
    encrypted_aes_key_for_creator: isEncrypted ? (encrypted_aes_key_for_creator || undefined) : undefined,
    is_encrypted: isEncrypted,
  };

  const doc = await orm.createDocument(docData);
  if (!doc) return NextResponse.json({ error: 'Ошибка создания документа' }, { status: 500 });
  return NextResponse.json(doc);
} 