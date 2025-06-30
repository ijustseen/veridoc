"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.16))] py-12 px-4 sm:px-6 lg:px-8">
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl mb-4">
          About VeriDoc
        </h1>
        <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
          VeriDoc is an ETH-based project aimed at document storage and
          validation, with multi-signature capabilities, document hash
          verification against the original file. We provide separation into
          private and public documents, as well as different types of file
          access (read-only, read and sign permission).
        </p>
      </section>

      <section className="mb-12 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Delayed File Decryption / Document Rights Transfer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Documents are encrypted with a random key, which is then
                encrypted using the user's public and private keys.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-12 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">
          Technology Stack
        </h2>
        <p className="mt-4 text-lg text-gray-700 text-center">
          L2 (Polygon PoS), ether.js, SupaBase (S3 in perspective), Next.js.
        </p>
      </section>

      <section className="mb-12 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Service Logic</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Document Creation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                One of the users creates a document. They upload it in PDF
                format, generate a completely random key, and encrypt the
                document with it. Then, this key itself is encrypted using the
                user's Private Key wallet.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. Inviting Signers</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                The document owner selects all other users who need to sign this
                document. For this, they specify their wallet addresses, and a
                signature request is sent to them, along with the key encrypted
                using the Public Key of the user to whom the request is sent.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. Document Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                The user receiving the request decrypts the received key using
                their Private Key, allowing them to read the document awaiting
                their signature.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>4. Document Signing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                If the user agrees to sign the document, they create a new
                encrypted key (based on their Private Key), synchronize it (the
                blockchain needs to know which key belongs to which user, while
                only a user from the list of signers will be able to decrypt
                this key using their respective key and Private Key) and sign
                the document.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
        <p className="mt-8 text-lg text-center text-gray-700">
          As a result, we get an encrypted document, its hash signed by several
          (or one) users, a list of signing wallets, and their respective
          encrypted keys.
        </p>
      </section>
    </div>
  );
}
