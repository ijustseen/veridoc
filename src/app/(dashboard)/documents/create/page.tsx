"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/WalletProvider";
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
import { hashBinaryWithEthers } from "@/lib/utils";

export default function CreateDocumentPage() {
  const { account } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [signers, setSigners] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(true);
  // const [readOnly, setReadOnly] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<null | React.FormEvent>(
    null
  );
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

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
      const nameWithoutExtension = uploadedFile.name.replace(
        /\\.[^/\\.]+$/,
        ""
      );
      setTitle(nameWithoutExtension);
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

    if (!file || !account) {
      alert("Выберите файл и убедитесь, что ваш кошелек подключен.");
      return;
    }

    if (signers.length > 0) {
      setPendingSubmit(e);
      setShowDialog(true);
      return;
    }

    // Хеширование файла и отправка
    await createDocument();
  };

  const createDocument = async () => {
    if (!file || !account) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      const fileHash = hashBinaryWithEthers(uint8Array);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("hash", fileHash);
      formData.append("creator_address", account);
      formData.append("is_public", String(!isPrivate));

      // TODO: Добавить логику для encrypted_aes_key_for_creator, если isPrivate
      // Пока что игнорируем это для упрощения

      try {
        const response = await fetch("/api/document", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Документ успешно создан:", result);
          router.push("/dashboard");
        } else {
          const errorData = await response.json();
          alert(`Ошибка создания документа: ${errorData.error}`);
        }
      } catch (error) {
        console.error("Ошибка при отправке документа:", error);
        alert("Ошибка при отправке документа. Пожалуйста, попробуйте снова.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDialogConfirm = async () => {
    setShowDialog(false);
    if (pendingSubmit) {
      await createDocument();
      setPendingSubmit(null);
    }
  };

  const handleDialogCancel = () => {
    setShowDialog(false);
    setPendingSubmit(null);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-full">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 flex-1 max-w-xl md:max-w-none flex flex-col"
      >
        <h1 className="text-2xl font-bold mb-4">Create a new document</h1>
        <div>
          <label className="block mb-1 font-medium">Document name</label>
          <Input
            type="text"
            placeholder="Enter document name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            // readOnly
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
                onChange={() => setIsPrivate(true)}
                // disabled
              />
              Private
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="docType"
                checked={!isPrivate}
                onChange={() => setIsPrivate(false)}
                // disabled
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
        <Button type="submit" className="w-full mt-auto">
          Create and send for signing
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
