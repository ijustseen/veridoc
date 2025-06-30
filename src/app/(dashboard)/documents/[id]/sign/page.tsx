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

interface DocumentData {
  id: string;
  fileName: string;
  createdAt: string;
  signers: string[];
  pdfUrl: string;
}

export default function SignDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { account } = useWallet();
  const { id } = React.use(params);
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Здесь будет логика для загрузки данных документа по id
    const fetchDocument = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setDocument({
        id: id,
        fileName: `Document for Signature ${id}.pdf`,
        createdAt: "2023-10-26",
        signers: [
          "0xYourAddressHere",
          "0xAnotherSignerAddress",
          "0xYourSignerAddress",
        ],
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

  const handleSign = () => {
    setShowSignDialog(true);
    // TODO: Document signing logic
  };

  const handleDecline = () => {
    setShowDeclineDialog(true);
    // TODO: Document declining logic
  };

  const confirmSign = () => {
    setShowSignDialog(false);
    // After signing, redirect to document page or dashboard
    router.push(`/documents/${id}`);
  };

  const confirmDecline = () => {
    setShowDeclineDialog(false);
    // After declining, redirect to dashboard
    router.push("/dashboard");
  };

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
        <div className="flex gap-4 mt-auto">
          <Button onClick={handleSign} className="flex-1">
            Sign
          </Button>
          <Button onClick={handleDecline} variant="outline" className="flex-1">
            Decline
          </Button>
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
