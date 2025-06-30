import { NextRequest, NextResponse } from 'next/server';
import { DocumentInvitationORM } from '@/app/storage/database/documentInvitationORM';

const orm = new DocumentInvitationORM(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
  const doc = await orm.getDocumentById(id);
  if (!doc) return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
  return NextResponse.json(doc);
} 