import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

interface HeaderProps {
  account: string | null;
  isConnecting: boolean;
  error: string | null;
  connectWallet: () => void;
}

const Header: React.FC<HeaderProps> = ({
  account,
  isConnecting,
  error,
  connectWallet,
}) => (
  <header className="flex flex-col mb-8">
    <div className="flex justify-between items-center">
      <Link href="/">
        <h1 className="text-2xl font-bold">VeriDoc</h1>
      </Link>

      <div className="flex items-center space-x-2">
        {account ? (
          <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 px-4 py-2 bg-gray-100 text-gray-800 border border-gray-300">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        ) : (
          <Button onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect MetaMask"}
          </Button>
        )}
      </div>
    </div>
    {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
  </header>
);

export default Header;
