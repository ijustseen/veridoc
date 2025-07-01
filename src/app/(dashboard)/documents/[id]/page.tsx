"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
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
import { useWallet } from "@/components/WalletProvider";

// Предполагается, что эти данные будут получены из API или контекста
interface DocumentData {
  id: string;
  fileName: string;
  createdAt: string; // Или Date тип
  signers: string[];
  pdfUrl: string;
}

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { account } = useWallet();
  const { id } = React.use(params); // Unwrap params with React.use
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  // const router = useRouter();

  useEffect(() => {
    // Здесь будет логика для загрузки данных документа по id
    // Пока что используем заглушку
    const fetchDocument = async () => {
      // Имитация задержки сети
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setDocument({
        id: id,
        fileName: `Document ${id}.pdf`,
        createdAt: "2023-10-26",
        signers: ["0xYourAddressHere", "0xAnotherSignerAddress"],
        pdfUrl: "/example.pdf", // TODO: Replace with actual backend PDF URL
      });
    };
    fetchDocument();
  }, [id]);

  useEffect(() => {
    if (document?.pdfUrl) {
      setPdfPreviewUrl(document.pdfUrl);
    } else {
      setPdfPreviewUrl(null);
    }
  }, [document]);

  if (!document) {
    return (
      <div className="flex flex-col md:flex-row gap-6 max-w-full">
        <div className="space-y-6 flex-1 max-w-xl md:max-w-none flex flex-col">
          <h1 className="text-2xl font-bold mb-4">Loading document...</h1>
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
        <h1 className="text-2xl font-bold mb-4">Document Information</h1>
        <div>
          <label className="block mb-1 font-medium">Document Name</label>
          <Input type="text" value={document.fileName} readOnly />
        </div>
        <div>
          <label className="block mb-1 font-medium">Created At</label>
          <Input type="text" value={document.createdAt} readOnly />
        </div>

        <div className="w-full">
          <label className="block mb-1 font-medium">Signer Addresses</label>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                value={account || "(your address)"}
                disabled
                placeholder="Your address"
              />
              <span className="text-xs text-gray-500">(You)</span>
            </div>
            {document.signers.map((signer, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input type="text" value={signer} readOnly />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-gray-100 rounded-lg">
        {pdfPreviewUrl ? (
          <iframe
            src={pdfPreviewUrl}
            width="100%"
            height="100%"
            className="border rounded-md h-full"
          ></iframe>
        ) : (
          <p className="text-muted-foreground">PDF preview not available.</p>
        )}
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation Dialog</AlertDialogTitle>
            <AlertDialogDescription>
              This is an example dialog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
