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

export default function CreateDocumentPage() {
  const { account } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (signers.length > 0) {
      setPendingSubmit(e);
      setShowDialog(true);
      return;
    }
    // TODO: handle document creation
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  };

  const handleDialogConfirm = () => {
    setShowDialog(false);
    if (pendingSubmit) {
      // TODO: handle document creation
      setPendingSubmit(null);

      setTimeout(() => {}, 2000);
      router.push("/dashboard");
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
                onChange={() => setIsPrivate(true)}
                disabled
              />
              Private
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="docType"
                checked={!isPrivate}
                onChange={() => setIsPrivate(false)}
                disabled
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
