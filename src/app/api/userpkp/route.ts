import { NextRequest, NextResponse } from 'next/server';
import { UserPKPORM } from '@/storage/database/userPKPORM';
import { CreateUserPKPInput } from '@/storage/database/types';

const orm = new UserPKPORM(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  const body: CreateUserPKPInput = await req.json();
  const pkp = await orm.createUserPKP(body);
  if (!pkp) return NextResponse.json({ error: 'Ошибка создания PKP' }, { status: 500 });
  return NextResponse.json(pkp);
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ error: 'Не указан wallet' }, { status: 400 });
  const pkp = await orm.getUserPKPByWalletAddress(wallet);
  if (!pkp) return NextResponse.json({ error: 'PKP не найден' }, { status: 404 });
  return NextResponse.json(pkp);
} 