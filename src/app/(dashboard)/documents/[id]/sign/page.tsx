"use client";

import React from "react";
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
import { Document, Invitation } from "@/storage/database/types";
import { Button } from "@/components/ui/button";

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SignDocumentPage({ params }: DocumentDetailPageProps) {
  const { account } = useWallet();
  const { id } = React.use(params);
  const [document, setDocument] = React.useState<Document | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = React.useState<string | null>(null);
  const [showDialog, setShowDialog] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [invitations, setInvitations] = React.useState<Invitation[]>([]);

  React.useEffect(() => {
    const fetchDocumentAndInvitations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const docResponse = await fetch(`/api/document/${id}`);
        if (!docResponse.ok) {
          throw new Error(`HTTP error! status: ${docResponse.status}`);
        }
        const docData: Document = await docResponse.json();
        setDocument(docData);

        const invResponse = await fetch(`/api/invitation?document_id=${id}`);
        if (!invResponse.ok) {
          throw new Error(`HTTP error! status: ${invResponse.status}`);
        }
        const invData: Invitation[] = await invResponse.json();
        setInvitations(invData);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchDocumentAndInvitations();
  }, [id]);

  React.useEffect(() => {
    if (document?.is_encrypted === true) {
      //TODO: decrypt document if user is signer
    }

    if (document?.file_url) {
      setPdfPreviewUrl(document.file_url);
    } else {
      setPdfPreviewUrl(null);
    }
  }, [document]);

  if (isLoading) {
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

  if (error) {
    return (
      <div className="flex flex-col md:flex-row gap-6 max-w-full">
        <div className="space-y-6 flex-1 max-w-xl md:max-w-none flex flex-col">
          <h1 className="text-2xl font-bold mb-4">Error loading document</h1>
          <p className="text-destructive">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col md:flex-row gap-6 max-w-full">
        <div className="space-y-6 flex-1 max-w-xl md:max-w-none flex flex-col">
          <h1 className="text-2xl font-bold mb-4">Document not found</h1>
          <p>{`The document with ID "${id}" could not be loaded.`}</p>
        </div>
      </div>
    );
  }

  // Combine creator and invited signers, ensure uniqueness
  const allSigners = new Set<string>();
  if (document.creator_address) {
    allSigners.add(document.creator_address.toLowerCase());
  }
  invitations.forEach((inv) =>
    allSigners.add(inv.wallet_address.toLowerCase())
  );

  const uniqueSigners = Array.from(allSigners);

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-full flex-1 h-full items-stretch">
      <div className="space-y-6 flex-1 max-w-xl md:max-w-none flex flex-col">
        <h1 className="text-2xl font-bold mb-4">Document Information</h1>
        <div>
          <label className="block mb-1 font-medium">Document Title</label>
          <Input type="text" value={document.title} readOnly />
        </div>
        <div>
          <label className="block mb-1 font-medium">Creator Address</label>
          <div className="flex items-center gap-2">
            <Input type="text" value={document.creator_address} readOnly />
            {account &&
              document.creator_address.toLowerCase() ===
                account.toLowerCase() && (
                <span className="text-xs text-gray-500">(You)</span>
              )}
          </div>
        </div>
        <div>
          <label className="block mb-1 font-medium">Created At</label>
          <Input
            type="text"
            value={new Date(document.created_at).toLocaleDateString()}
            readOnly
          />
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
              {account && uniqueSigners.includes(account.toLowerCase()) && (
                <span className="text-xs text-gray-500">(You)</span>
              )}
            </div>
            {uniqueSigners
              .filter(
                (signer) => !(account && signer === account.toLowerCase())
              )
              .map((signer: string, idx: number) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input type="text" value={signer} readOnly />
                </div>
              ))}
          </div>
        </div>

        <Button>Sign</Button>
      </div>

      <div className="flex-1 hidden md:flex flex-col bg-gray-100 rounded-lg">
        {pdfPreviewUrl ? (
          <iframe
            src={pdfPreviewUrl}
            className="border rounded-md flex-1"
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
