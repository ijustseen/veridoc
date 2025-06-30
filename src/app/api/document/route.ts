import { NextRequest, NextResponse } from 'next/server';
import { DocumentInvitationORM } from '@/app/storage/database/documentInvitationORM';
import { CreateDocumentInput } from '@/app/storage/database/types';

const orm = new DocumentInvitationORM(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  const body: CreateDocumentInput = await req.json();
  const doc = await orm.createDocument(body);
  if (!doc) return NextResponse.json({ error: 'Ошибка создания документа' }, { status: 500 });
  return NextResponse.json(doc);
} 