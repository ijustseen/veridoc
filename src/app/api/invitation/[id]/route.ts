import { NextRequest, NextResponse } from 'next/server';
import { DocumentInvitationORM } from '@/storage/database/documentInvitationORM';

const orm = new DocumentInvitationORM(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const invitationId = Number(params.id);
  if (isNaN(invitationId)) {
    return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
  }

  const { status, public_key, encrypted_aes_key } = await req.json();
  
  if (!status) {
    return NextResponse.json({ error: 'Статус обязателен' }, { status: 400 });
  }

  const updated = await orm.updateInvitationStatus(
    invitationId,
    status,
    { public_key, encrypted_aes_key }
  );
  
  if (!updated) {
    return NextResponse.json({ error: 'Ошибка обновления приглашения' }, { status: 500 });
  }
  
  return NextResponse.json(updated);
}