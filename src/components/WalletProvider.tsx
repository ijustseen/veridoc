"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers, type Eip1193Provider } from "ethers";

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

interface WalletContextType {
  account: string | null;
  isConnecting: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isInitialLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    async function checkConnection() {
      if (!isClient) {
        return;
      }

      if (!window.ethereum || !localStorage.getItem("walletConnected")) {
        setAccount(null);
        setIsInitialLoading(false);
        return;
      }

      try {
        if (!window.ethereum.request) {
          setAccount(null);
          setIsInitialLoading(false);
          return;
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred");
        }
      } finally {
        setIsInitialLoading(false);
      }
    }

    if (isClient) {
      checkConnection();
    }
  }, [isClient]);

  const connectWallet = async () => {
    setError(null);
    setIsConnecting(true);
    try {
      if (!window.ethereum || !window.ethereum.request) {
        setError("MetaMask is not installed or not providing a request method");
        setIsConnecting(false);
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      localStorage.setItem("walletConnected", "1");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Connection error");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    localStorage.removeItem("walletConnected");
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        isConnecting,
        error,
        connectWallet,
        disconnectWallet,
        isInitialLoading,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
