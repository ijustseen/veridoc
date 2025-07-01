import { NextRequest, NextResponse } from 'next/server';
import { DocumentInvitationORM } from '@/storage/database/documentInvitationORM';
import { CreateInvitationInput } from '@/storage/database/types';

const orm = new DocumentInvitationORM(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  const body: CreateInvitationInput = await req.json();
  const inv = await orm.createInvitation(body);
  if (!inv) return NextResponse.json({ error: 'Ошибка создания приглашения' }, { status: 500 });
  return NextResponse.json(inv);
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  const walletAddress = req.nextUrl.searchParams.get('wallet_address');
  const docId = req.nextUrl.searchParams.get('document_id');
  
  // Если указаны и document_id и wallet_address, возвращаем конкретное приглашение
  if (docId && (wallet || walletAddress)) {
    const address = wallet || walletAddress;
    const invitations = await orm.getInvitationsByDocumentId(Number(docId));
    const specificInvitation = invitations.find(inv => inv.wallet_address.toLowerCase() === address!.toLowerCase());
    if (!specificInvitation) {
      return NextResponse.json({ error: 'Приглашение не найдено' }, { status: 404 });
    }
    return NextResponse.json(specificInvitation);
  }
  
  // Остальная логика как раньше
  if (wallet || walletAddress) {
    const address = wallet || walletAddress;
    const data = await orm.getInvitationsByWalletAddress(address!);
    return NextResponse.json(data);
  }
  if (docId) {
    const data = await orm.getInvitationsByDocumentId(Number(docId));
    return NextResponse.json(data);
  }
  return NextResponse.json({ error: 'Не указан wallet/wallet_address или document_id' }, { status: 400 });
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