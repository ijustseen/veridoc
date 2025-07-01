import { NextRequest, NextResponse } from 'next/server';
import { getPKPService } from '@/lib/pkp';
import { EncryptedDocumentORM } from '@/storage/database/encryptedDocumentORM';

const encryptedDocORM = new EncryptedDocumentORM(
  process.env.SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { documentId, pkpPublicKey } = await req.json();

    if (!documentId || !pkpPublicKey) {
      return NextResponse.json(
        { error: 'Требуются поля: documentId, pkpPublicKey' },
        { status: 400 }
      );
    }

    // Получаем зашифрованный документ из базы данных
    const encryptedDoc = await encryptedDocORM.getEncryptedDocumentByDocumentId(documentId);
    if (!encryptedDoc) {
      return NextResponse.json(
        { error: 'Зашифрованный документ не найден' },
        { status: 404 }
      );
    }

    const pkpService = getPKPService();
    await pkpService.initialize();

    // Расшифровываем данные
    const decryptedData = await pkpService.decryptWithPKP({
      ciphertext: encryptedDoc.ciphertext,
      dataToEncryptHash: encryptedDoc.data_to_encrypt_hash,
      accessControlConditions: JSON.parse(encryptedDoc.access_control_conditions),
      pkpPublicKey: pkpPublicKey
    });

    return NextResponse.json({
      data: decryptedData
    });

  } catch (error) {
    console.error('Ошибка расшифрования:', error);
    return NextResponse.json(
      { error: 'Ошибка расшифрования данных' },
      { status: 500 }
    );
  }
}