import { NextRequest, NextResponse } from 'next/server';
import { DocumentInvitationORM } from '@/storage/database/documentInvitationORM';

const orm = new DocumentInvitationORM(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ error: 'Не указан wallet' }, { status: 400 });
  const docs = await orm.getDocumentsByWalletAddress(wallet);
  return NextResponse.json(docs);
} 