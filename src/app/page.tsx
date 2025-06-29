"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.16))] py-12 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          VeriDoc: Secure Document Management on Blockchain
        </h1>
        <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
          A robust ETH-based platform for secure document storage, validation,
          multi-signatures, and flexible access control.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button size="lg" onClick={() => router.push("/dashboard")}>
            Get Started
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => alert("Learn More clicked!")}
          >
            {" "}
            {/* Placeholder alert */}
            Learn More
          </Button>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="mb-12 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Delayed File Decryption</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Documents are encrypted with a randomly generated key, which is
                then encrypted using the user's public and private keys.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Multi-signature on Blockchain</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Documents can be signed by multiple users directly on the
                blockchain, ensuring transparency and legal validity of every
                signature.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Complete Document Protection</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                The document encryption key is never stored or transmitted in
                plain form - only users who have signed the document can obtain
                it.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mb-12 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Document Creation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                A user creates a document, uploads it as a PDF, generates a
                random encryption key, and encrypts the document. The key itself
                is then encrypted with the user's private wallet key.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. Signer Invitation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                The document owner selects signers by their wallet addresses and
                sends them a signature request, along with the document key
                encrypted with each signer's public key.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. Document Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                The recipient decrypts the received key using their private key,
                allowing them to read the document awaiting their signature.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>4. Document Signing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                If the user agrees to sign, they create a new encrypted key
                (based on their private key), synchronize it with the
                blockchain, and sign the document.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
        <p className="mt-8 text-lg text-center text-gray-700">
          The result is an encrypted document, its hash signed by multiple
          users, and a list of signer wallets with their respective encrypted
          keys.
        </p>
      </section>
    </div>
  );
}
