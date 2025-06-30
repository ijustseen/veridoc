import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { EncryptedDocument } from '../../../types/document';
import { randomBytes } from 'crypto';
import { verifyMessage } from 'ethers';

// POST /api/documents
// Принимает: title, creator_address, hash, encrypted_file (binary), encrypted_aes_key_for_creator, whitelist, encrypted_aes_keys
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const title = formData.get('title') as string;
  const creator_address = formData.get('creator_address') as string;
  const hash = formData.get('hash') as string;
  const encrypted_aes_key_for_creator = formData.get('encrypted_aes_key_for_creator') as string;
  const whitelist = JSON.parse(formData.get('whitelist') as string) as string[];
  const encrypted_aes_keys = JSON.parse(formData.get('encrypted_aes_keys') as string) as { address: string, encrypted_aes_key: string }[];
  const file = formData.get('encrypted_file') as File;

  if (!title || !creator_address || !hash || !encrypted_aes_key_for_creator || !file || !whitelist || !encrypted_aes_keys) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // 1. Сохраняем файл в Supabase Storage
  const bucket = process.env.SUPABASE_STORAGE_BUCKET!;
  const fileName = `${Date.now()}_${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage.from(bucket).upload(fileName, await file.arrayBuffer(), {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }
  const storageUrl = `${supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl}`;

  // 2. Сохраняем метаинформацию в documents
  const { data: docData, error: docError } = await supabase.from('documents').insert([
    {
      hash,
      title,
      creator_address,
      encrypted_file: storageUrl,
      encrypted_aes_key_for_creator,
    },
  ]).select('id').single();
  if (docError || !docData) {
    return NextResponse.json({ error: docError?.message || 'Failed to insert document' }, { status: 500 });
  }
  const document_id = docData.id;

  // 3. Сохраняем ключи для подписантов в document_keys
  const keysToInsert = encrypted_aes_keys.map(({ address, encrypted_aes_key }) => ({
    document_id,
    signer_address: address,
    encrypted_aes_key,
  }));
  if (keysToInsert.length > 0) {
    const { error: keysError } = await supabase.from('document_keys').insert(keysToInsert);
    if (keysError) {
      return NextResponse.json({ error: keysError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: document_id, storageUrl });
}

// GET /api/documents/:id/key?address=0x...&nonce=...&signature=...
// Безопасная выдача зашифрованного ключа для адреса
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const address = searchParams.get('address');
  const nonce = searchParams.get('nonce');
  const signature = searchParams.get('signature');

  if (!id || !address || !nonce || !signature) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  // 1. Проверяем nonce (challenge) — ищем в таблице nonces, валиден ли, не использован ли
  const { data: nonceData, error: nonceError } = await supabase.from('nonces').select('nonce, address, expires_at, used').eq('nonce', nonce).single();
  if (nonceError || !nonceData || nonceData.used || nonceData.address.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 });
  }
  if (new Date(nonceData.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Nonce expired' }, { status: 401 });
  }

  // 2. Проверяем подпись
  let recovered;
  try {
    recovered = verifyMessage(nonce, signature);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: 'Signature does not match address' }, { status: 401 });
  }

  // 3. Отмечаем nonce как использованный
  await supabase.from('nonces').update({ used: true }).eq('nonce', nonce);

  // 4. Ищем ключ для этого документа и адреса
  const { data: keyData, error: keyError } = await supabase.from('document_keys').select('encrypted_aes_key').eq('document_id', id).eq('signer_address', address).single();
  if (keyError || !keyData) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  return NextResponse.json({ encrypted_aes_key: keyData.encrypted_aes_key });
}

// Дополнительно: endpoint для выдачи nonce (challenge)
// POST /api/documents/nonce
export async function POST_nonce(req: NextRequest) {
  const { address } = await req.json();
  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }
  const nonce = '0x' + randomBytes(16).toString('hex');
  const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 минут
  await supabase.from('nonces').insert({ nonce, address, expires_at, used: false });
  return NextResponse.json({ nonce });
} 