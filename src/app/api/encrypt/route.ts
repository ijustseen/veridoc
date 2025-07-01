import { NextRequest, NextResponse } from 'next/server';
import { getPKPService } from '@/lib/pkp';
import { EncryptedDocumentORM } from '@/storage/database/encryptedDocumentORM';

const encryptedDocORM = new EncryptedDocumentORM(
  process.env.SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { 
      data, 
      documentId, 
      walletAddresses, 
      expirationTimestamp,
      authSig 
    } = await req.json();

    if (!data || !documentId || !walletAddresses || !Array.isArray(walletAddresses) || !authSig) {
      return NextResponse.json(
        { error: 'Требуются поля: data, documentId, walletAddresses, authSig' },
        { status: 400 }
      );
    }

    const pkpService = getPKPService();
    // Не вызываем initialize() на сервере, используем переданный authSig

    // Создаем условия доступа
    let accessConditions = pkpService.createMultiWalletAccessConditions(walletAddresses);
    
    // Добавляем временные условия если указаны
    if (expirationTimestamp) {
      const timeConditions = pkpService.createTimeBasedAccessConditions(expirationTimestamp);
      accessConditions = pkpService.combineAccessConditions(accessConditions, timeConditions);
    }

    // Шифруем данные используя переданный authSig
    const encryptionResult = await pkpService.encryptWithAuthSig(
      data,
      accessConditions,
      authSig
    );

    // Сохраняем в базу данных
    const encryptedDoc = await encryptedDocORM.createEncryptedDocument({
      document_id: documentId,
      ciphertext: encryptionResult.ciphertext,
      data_to_encrypt_hash: encryptionResult.dataToEncryptHash,
      access_control_conditions: JSON.stringify(encryptionResult.accessControlConditions)
    });

    if (!encryptedDoc) {
      return NextResponse.json(
        { error: 'Ошибка сохранения зашифрованного документа' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      encryptedDocumentId: encryptedDoc.id,
      ciphertext: encryptionResult.ciphertext,
      dataToEncryptHash: encryptionResult.dataToEncryptHash
    });

  } catch (error) {
    console.error('Ошибка шифрования:', error);
    return NextResponse.json(
      { error: 'Ошибка шифрования данных' },
      { status: 500 }
    );
  }
}