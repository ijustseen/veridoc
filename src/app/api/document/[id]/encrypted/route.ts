import { NextRequest, NextResponse } from 'next/server';
import { EncryptedDocumentORM } from '@/storage/database/encryptedDocumentORM';

const orm = new EncryptedDocumentORM(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const documentId = Number(params.id);
  if (isNaN(documentId)) {
    return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
  }

  const encryptedDoc = await orm.getEncryptedDocumentByDocumentId(documentId);
  if (!encryptedDoc) {
    return NextResponse.json({ error: 'Зашифрованный документ не найден' }, { status: 404 });
  }

  return NextResponse.json(encryptedDoc);
}