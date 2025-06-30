import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// POST: Публикация публичного ключа
export async function POST(req: NextRequest) {
  const { address, publicKey } = await req.json();
  if (!address || !publicKey) {
    return NextResponse.json({ error: 'Missing address or publicKey' }, { status: 400 });
  }
  // Сохраняем в таблицу public_keys (address, publicKey)
  const { error } = await supabase.from('public_keys').upsert({ address, publicKey });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// GET: Получение публичного ключа по адресу
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }
  const { data, error } = await supabase.from('public_keys').select('publicKey').eq('address', address).single();
  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ publicKey: data.publicKey });
} 