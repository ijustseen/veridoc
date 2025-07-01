import { NextRequest, NextResponse } from 'next/server';
import { UserPKPORM } from '@/storage/database/userPKPORM';
import { CreateUserPKPInput } from '@/storage/database/types';

const orm = new UserPKPORM(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body: CreateUserPKPInput = await req.json();
    
    // Валидация входных данных
    if (!body.wallet_address || !body.token_id || !body.public_key) {
      return NextResponse.json(
        { error: 'Обязательные поля: wallet_address, token_id, public_key' }, 
        { status: 400 }
      );
    }

    // Проверяем, не существует ли уже PKP для этого кошелька
    const existingPKP = await orm.getUserPKPByWalletAddress(body.wallet_address);
    if (existingPKP) {
      return NextResponse.json(
        { error: 'PKP для этого кошелька уже существует' }, 
        { status: 409 }
      );
    }

    const pkp = await orm.createUserPKP(body);
    if (!pkp) {
      return NextResponse.json({ error: 'Ошибка создания PKP' }, { status: 500 });
    }
    
    return NextResponse.json(pkp);
  } catch (error) {
    console.error('Ошибка в POST /api/userpkp:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ error: 'Не указан wallet' }, { status: 400 });
  const pkp = await orm.getUserPKPByWalletAddress(wallet);
  if (!pkp) return NextResponse.json({ error: 'PKP не найден' }, { status: 404 });
  return NextResponse.json(pkp);
} 