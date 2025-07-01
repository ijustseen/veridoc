"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/WalletProvider";
import { PKPSetup } from "@/components/PKPSetup";
import { decryptAESKeyWithPKP } from "@/cryptography/lit-encryption";
import { decryptFile } from "@/cryptography/aes";

interface DocumentData {
  id: string;
  title: string;
  hash: string;
  creator_address: string;
  file_url: string;
  is_encrypted: boolean;
  created_at: string;
}

interface EncryptedDocumentData {
  ciphertext: string;
  data_to_encrypt_hash: string;
  access_control_conditions: string;
}

interface InvitationData {
  id: number;
  document_id: number;
  wallet_address: string;
  status: string;
  created_at: string;
}

export default function SignDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { account, pkpInfo, refreshAuthSig } = useWallet();
  const { id } = React.use(params);
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [encryptedDoc, setEncryptedDoc] = useState<EncryptedDocumentData | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        // Получаем данные документа
        const docResponse = await fetch(`/api/document/${id}`);
        if (!docResponse.ok) {
          throw new Error('Документ не найден');
        }
        const docData = await docResponse.json();
        setDocument(docData);

        // Получаем данные приглашения для текущего пользователя
        const invitationResponse = await fetch(`/api/invitation?document_id=${id}&wallet_address=${account}`);
        if (invitationResponse.ok) {
          const invData = await invitationResponse.json();
          setInvitation(invData);
        }

        // Если документ зашифрован, получаем зашифрованные данные
        if (docData.is_encrypted) {
          const encryptedResponse = await fetch(`/api/document/${id}/encrypted`);
          if (encryptedResponse.ok) {
            const encData = await encryptedResponse.json();
            setEncryptedDoc(encData);
          }
        }

      } catch (error) {
        console.error('Ошибка загрузки документа:', error);
        setDecryptError(error instanceof Error ? error.message : 'Ошибка загрузки документа');
      }
    };

    if (account && id) {
      fetchDocument();
    }
  }, [id, account]);

  // Функция расшифрования и отображения PDF
  const decryptAndShowPDF = async () => {
    if (!document || !encryptedDoc || !pkpInfo) {
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);

    try {
      // Проверяем и обновляем authSig если нужно
      if (!pkpInfo.authSig) {
        console.log('AuthSig недоступен для расшифрования, обновляем...');
        await refreshAuthSig();
        
        if (!pkpInfo.authSig) {
          throw new Error('Не удалось создать authSig для расшифрования');
        }
      }

      // Расшифровываем AES ключ с помощью PKP
      const accessConditions = JSON.parse(encryptedDoc.access_control_conditions);
      const decryptedKeyResult = await decryptAESKeyWithPKP(
        encryptedDoc.ciphertext,
        encryptedDoc.data_to_encrypt_hash,
        accessConditions,
        pkpInfo.authSig
      );

      if (!decryptedKeyResult.success) {
        throw new Error(decryptedKeyResult.error || 'Ошибка расшифрования ключа');
      }

      const aesKey = decryptedKeyResult.data!;

      // Загружаем зашифрованный файл
      const fileResponse = await fetch(document.file_url);
      if (!fileResponse.ok) {
        throw new Error('Ошибка загрузки файла');
      }
      
      const encryptedFileData = await fileResponse.arrayBuffer();

      // Расшифровываем файл
      const decryptedFileResult = await decryptFile(new Uint8Array(encryptedFileData), aesKey);
      if (!decryptedFileResult.success) {
        throw new Error(decryptedFileResult.error || 'Ошибка расшифрования файла');
      }

      // Создаем URL для предварительного просмотра
      const blob = new Blob([decryptedFileResult.data!], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);

    } catch (error) {
      console.error('Ошибка расшифрования:', error);
      setDecryptError(error instanceof Error ? error.message : 'Ошибка расшифрования');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Автоматически расшифровываем документ когда все данные загружены
  useEffect(() => {
    if (document && encryptedDoc && pkpInfo && !pdfPreviewUrl && !isDecrypting) {
      decryptAndShowPDF();
    }
  }, [document, encryptedDoc, pkpInfo]);

  const handleSign = () => {
    setShowSignDialog(true);
  };

  const handleDecline = () => {
    setShowDeclineDialog(true);
  };

  const confirmSign = async () => {
    setShowSignDialog(false);
    setIsSigning(true);
    setSignError(null);

    try {
      if (!document || !account) {
        throw new Error('Недостаточно данных для подписания');
      }

      // Подписываем документ через блокчейн контракт
      // TODO: Здесь должна быть логика подписания через контракт
      // Пока просто обновляем статус в базе данных
      
      const signResponse = await fetch(`/api/document/${id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signer_address: account,
          signature: 'temp_signature_hash', // TODO: реальная подпись
        }),
      });

      if (!signResponse.ok) {
        throw new Error('Ошибка подписания документа');
      }

      // Обновляем статус приглашения
      if (invitation) {
        await fetch(`/api/invitation/${invitation.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'signed',
          }),
        });
      }

      router.push(`/documents/${id}`);

    } catch (error) {
      console.error('Ошибка подписания:', error);
      setSignError(error instanceof Error ? error.message : 'Ошибка подписания');
    } finally {
      setIsSigning(false);
    }
  };

  const confirmDecline = async () => {
    setShowDeclineDialog(false);
    
    try {
      // Обновляем статус приглашения на отклонено
      if (invitation) {
        await fetch(`/api/invitation/${invitation.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'declined',
          }),
        });
      }

      router.push("/dashboard");

    } catch (error) {
      console.error('Ошибка отклонения:', error);
    }
  };

  // Показываем PKP Setup если PKP не создан
  if (!pkpInfo) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Sign Document</h1>
        <PKPSetup />
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Необходимо создать PKP:</strong> Для расшифрования и подписания документов 
            требуется создать Programmable Key Pair.
          </p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col md:flex-row gap-6 max-w-full">
        <div className="space-y-6 flex-1 max-w-xl md:max-w-none flex flex-col">
          <h1 className="text-2xl font-bold mb-4">
            Loading document for signature...
          </h1>
          <p>Please wait.</p>
        </div>
        <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-full">
      <div className="space-y-6 flex-1 max-w-xl md:max-w-none flex flex-col">
        <h1 className="text-2xl font-bold mb-4">Sign Document</h1>
        
        {decryptError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{decryptError}</p>
            <Button 
              onClick={decryptAndShowPDF} 
              disabled={isDecrypting}
              className="mt-2"
              size="sm"
            >
              {isDecrypting ? "Расшифровка..." : "Попробовать снова"}
            </Button>
          </div>
        )}

        {signError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{signError}</p>
          </div>
        )}

        <div>
          <label className="block mb-1 font-medium">Document Name</label>
          <Input type="text" value={document.title} readOnly />
        </div>
        <div>
          <label className="block mb-1 font-medium">Created At</label>
          <Input type="text" value={new Date(document.created_at).toLocaleDateString()} readOnly />
        </div>
        <div>
          <label className="block mb-1 font-medium">Creator</label>
          <Input type="text" value={document.creator_address} readOnly />
        </div>

        <div className="w-full">
          <label className="block mb-1 font-medium">Your Address</label>
          <div className="flex gap-2 items-center">
            <Input
              type="text"
              value={account || "(your address)"}
              disabled
              placeholder="Your address"
            />
            <span className="text-xs text-gray-500">(You)</span>
          </div>
        </div>

        {invitation && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm">
              <strong>Статус приглашения:</strong> {invitation.status}
            </p>
            <p className="text-sm text-gray-600">
              Приглашение отправлено: {new Date(invitation.created_at).toLocaleString()}
            </p>
          </div>
        )}

        {isDecrypting && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">Расшифровка документа...</p>
          </div>
        )}

        <div className="flex gap-4 mt-auto">
          <Button 
            onClick={handleSign} 
            className="flex-1"
            disabled={isSigning || isDecrypting || !pdfPreviewUrl}
          >
            {isSigning ? "Подписание..." : "Sign"}
          </Button>
          <Button 
            onClick={handleDecline} 
            variant="outline" 
            className="flex-1"
            disabled={isSigning}
          >
            Decline
          </Button>
        </div>
      </div>

      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-gray-100 rounded-lg">
        {isDecrypting ? (
          <div className="text-center">
            <p className="text-muted-foreground mb-2">Расшифровка документа...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        ) : pdfPreviewUrl ? (
          <iframe
            src={pdfPreviewUrl}
            width="100%"
            height="100%"
            className="border rounded-md h-full"
          ></iframe>
        ) : decryptError ? (
          <div className="text-center">
            <p className="text-red-600 mb-2">Ошибка загрузки PDF</p>
            <Button onClick={decryptAndShowPDF} disabled={isDecrypting} size="sm">
              Попробовать снова
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">PDF будет показан после расшифрования.</p>
        )}
      </div>

      {/* Диалог подтверждения подписи */}
      <AlertDialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Signature</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign this document?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSign}>Sign</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог подтверждения отклонения */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Decline</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline this document? This action is
              irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDecline}>
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
