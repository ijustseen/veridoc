"use client";
import React from "react";
import { useWallet } from "@/components/WalletProvider";
import Header from "@/components/Header";

export default function AppContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { account, isConnecting, error, connectWallet } = useWallet();
  return (
    <div className="container mx-auto p-4 lg:max-w-screen-lg">
      <Header
        account={account}
        isConnecting={isConnecting}
        error={error}
        connectWallet={connectWallet}
      />
      {children}
    </div>
  );
}
