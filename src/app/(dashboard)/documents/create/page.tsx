"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/WalletProvider";
import { PKPSetup } from "@/components/PKPSetup";
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
import { generateAESKey, encryptFile } from "@/cryptography/aes";
import { hashFile } from "@/cryptography/hash";
import { encryptAESKeyForDocument } from "@/cryptography/lit-encryption";

export default function CreateDocumentPage() {
  const { account, pkpInfo, refreshAuthSig } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [signers, setSigners] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<null | React.FormEvent>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfPreviewUrl(null);
    }
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);

      // Extract file name without extension
      const nameWithoutExtension = uploadedFile.name.replace(/\.[^/\.]+$/, "");
      setFileName(nameWithoutExtension);
    }
  };

  const handleSignerChange = (idx: number, value: string) => {
    setSigners((prev) => prev.map((s, i) => (i === idx ? value : s)));
  };

  const handleAddSigner = () => {
    setSigners((prev) => [...prev, ""]);
  };

  const handleRemoveSigner = (idx: number) => {
    setSigners((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔹 handleSubmit вызван');
    
    if (signers.filter(s => s.trim()).length > 0) {
      console.log('🔹 Есть дополнительные подписанты, показываем диалог');
      setPendingSubmit(e);
      setShowDialog(true);
      return;
    }
    
    console.log('🔹 Нет дополнительных подписантов, создаем документ сразу');
    await createDocument();
  };

  const handleDialogConfirm = async () => {
    setShowDialog(false);
    if (pendingSubmit) {
      await createDocument();
      setPendingSubmit(null);
    }
  };

  const createDocument = async () => {
    console.log('🔹 Начинаем создание документа...');
    console.log('🔹 file:', !!file, 'account:', !!account, 'pkpInfo:', !!pkpInfo);
    console.log('🔹 isPrivate:', isPrivate);
    
    if (!file || !account || !pkpInfo) {
      console.error('❌ Отсутствуют необходимые данные:', { file: !!file, account: !!account, pkpInfo: !!pkpInfo });
      setCreateError("Отсутствуют необходимые данные для создания документа");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      console.log('🔹 Генерируем AES ключ...');
      const aesKey = generateAESKey();
      
      console.log('🔹 Вычисляем хеш файла...');
      const fileHash = await hashFile(file);

      // 4. Создаем документ в базе данных
      const docFormData = new FormData();
      
      if (isPrivate) {
        console.log('🔹 Приватный документ - шифруем файл...');
        // Для приватных документов шифруем файл
        const encryptedFileResult = await encryptFile(file, aesKey);
        if (!encryptedFileResult.success) {
          throw new Error(encryptedFileResult.error || 'Ошибка шифрования файла');
        }
        const encryptedBlob = new Blob([encryptedFileResult.data!], { type: 'application/octet-stream' });
        docFormData.append('file', encryptedBlob, `encrypted_${fileName}.bin`);
        docFormData.append('encrypted_aes_key_for_creator', aesKey);
      } else {
        console.log('🔹 Публичный документ - не шифруем...');
        // Для публичных документов загружаем оригинальный файл
        docFormData.append('file', file);
      }
      
      docFormData.append('title', fileName);
      docFormData.append('hash', fileHash);
      docFormData.append('creator_address', account);
      docFormData.append('is_public', (!isPrivate).toString());

      const createDocResponse = await fetch('/api/document', {
        method: 'POST',
        body: docFormData,
      });

      if (!createDocResponse.ok) {
        throw new Error('Ошибка создания документа');
      }

      const document = await createDocResponse.json();
      console.log('🔹 Документ создан:', document);

      // 5. Только для приватных документов - шифруем AES ключ с помощью Lit Protocol
      if (isPrivate) {
        console.log('🔹 Приватный документ - настраиваем шифрование...');
        const allSigners = [account, ...signers.filter(s => s.trim())];
        console.log('🔹 Все подписанты:', allSigners);
        console.log('🔹 Количество подписантов:', allSigners.length);
        
        // Нужен authSig для шифрования
        let currentAuthSig = pkpInfo.authSig;
        if (!currentAuthSig) {
          console.log('AuthSig недоступен, обновляем...');
          currentAuthSig = await refreshAuthSig();
          
          // Проверяем что authSig создался
          if (!currentAuthSig) {
            throw new Error('Не удалось создать authSig для шифрования');
          }
        }
        
        console.log('🔹 Начинаем шифрование AES ключа...');
        const encryptedKeyResult = await encryptAESKeyForDocument(aesKey, allSigners, currentAuthSig);
        console.log('🔹 Результат шифрования ключа:', encryptedKeyResult);
        
        if (!encryptedKeyResult.success) {
          console.error('❌ Ошибка шифрования ключа:', encryptedKeyResult.error);
          throw new Error(encryptedKeyResult.error || 'Ошибка шифрования ключа');
        }

        // 6. Сохраняем зашифрованные данные
        console.log('🔹 Отправляем данные в /api/encrypt...');
        const encryptResponse = await fetch('/api/encrypt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: aesKey,
            documentId: document.id,
            walletAddresses: allSigners,
            authSig: currentAuthSig,
          }),
        });

        console.log('🔹 Ответ от /api/encrypt:', encryptResponse.status, encryptResponse.statusText);
        
        if (!encryptResponse.ok) {
          const errorText = await encryptResponse.text();
          console.error('❌ Ошибка /api/encrypt:', errorText);
          throw new Error('Ошибка сохранения зашифрованных данных');
        }

        const encryptResult = await encryptResponse.json();
        console.log('🔹 Результат /api/encrypt:', encryptResult);
      } else {
        console.log('🔹 Публичный документ - пропускаем шифрование');
      }

      // 7. Создаем приглашения для подписантов
      for (const signerAddress of signers.filter(s => s.trim())) {
        await fetch('/api/invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_id: document.id,
            wallet_address: signerAddress,
            status: 'pending',
          }),
        });
      }

      router.push("/dashboard");

    } catch (error) {
      console.error('Ошибка создания документа:', error);
      setCreateError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDialogCancel = () => {
    setShowDialog(false);
    setPendingSubmit(null);
  };

  // Показываем PKP Setup если PKP не создан
  if (!pkpInfo) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create a new document</h1>
        <PKPSetup />
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Необходимо создать PKP:</strong> Для безопасного шифрования документов 
            требуется создать Programmable Key Pair. Это позволит шифровать документы 
            без раскрытия вашего приватного ключа MetaMask.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-full">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 flex-1 max-w-xl md:max-w-none flex flex-col"
      >
        <h1 className="text-2xl font-bold mb-4">Create a new document</h1>
        
        {createError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{createError}</p>
          </div>
        )}
        <div>
          <label className="block mb-1 font-medium">Document name</label>
          <Input
            type="text"
            placeholder="Enter document name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            required
            readOnly
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Document type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="docType"
                checked={isPrivate}
                onChange={() => {
                  console.log('🔹 Переключили на Private');
                  setIsPrivate(true);
                }}
              />
              Private
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="docType"
                checked={!isPrivate}
                onChange={() => {
                  console.log('🔹 Переключили на Public');
                  setIsPrivate(false);
                }}
              />
              Public
            </label>
          </div>
        </div>

        <div className="w-full">
          <label className="block mb-1 font-medium">PDF document</label>
          <Input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            required
          />
        </div>
        <div className="w-full">
          <label className="block mb-1 font-medium">Signer addresses</label>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                value={account || ""}
                disabled
                placeholder="Your address"
              />
              <span className="text-xs text-gray-500">(You)</span>
            </div>
            {signers.map((signer, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  type="text"
                  placeholder="0x123..."
                  value={signer}
                  onChange={(e) => handleSignerChange(idx, e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleRemoveSigner(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={handleAddSigner}>
              Add signer
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full mt-auto" disabled={isCreating}>
          {isCreating ? "Creating document..." : "Create and send for signing"}
        </Button>
      </form>

      {/* Right column: Always present on md and lg, content changes */}
      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-gray-100 rounded-lg">
        {pdfPreviewUrl ? (
          // PDF Preview - visible only on lg
          // <div className="hidden lg:flex flex-col items-center justify-center w-full h-full">

          <iframe
            src={pdfPreviewUrl}
            width="100%"
            height="100%"
            className="border rounded-md h-full"
          ></iframe>
        ) : (
          // Placeholder message - visible on md and lg
          <p className="text-muted-foreground">
            Upload a PDF to see a preview.
          </p>
        )}
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Check the signers&apos; addresses
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please make sure you have entered all signers correctly and trust
              these addresses. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2">
            <ul className="list-disc pl-5">
              <li>
                {account || "(your address)"}{" "}
                <span className="text-xs text-gray-500">(You)</span>
              </li>
              {signers.map((signer, idx) => (
                <li key={idx}>{signer}</li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDialogCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDialogConfirm}>
              Yes, all correct
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
