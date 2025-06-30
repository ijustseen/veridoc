import { NextRequest, NextResponse } from 'next/server';
import { DocumentInvitationORM } from '@/app/storage/database/documentInvitationORM';
import { CreateInvitationInput } from '@/app/storage/database/types';

const orm = new DocumentInvitationORM(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  const body: CreateInvitationInput = await req.json();
  const inv = await orm.createInvitation(body);
  if (!inv) return NextResponse.json({ error: 'Ошибка создания приглашения' }, { status: 500 });
  return NextResponse.json(inv);
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  const docId = req.nextUrl.searchParams.get('document_id');
  if (wallet) {
    const data = await orm.getInvitationsByWalletAddress(wallet);
    return NextResponse.json(data);
  }
  if (docId) {
    const data = await orm.getInvitationsByDocumentId(Number(docId));
    return NextResponse.json(data);
  }
  return NextResponse.json({ error: 'Не указан wallet или document_id' }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const { id, status, public_key, encrypted_aes_key } = await req.json();
  const updated = await orm.updateInvitationStatus(
    id,
    status,
    { public_key, encrypted_aes_key }
  );
  if (!updated) return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  return NextResponse.json(updated);
} 