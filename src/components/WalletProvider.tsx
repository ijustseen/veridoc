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
  tokenId: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [tokenId, setTokenId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isClient) return;
    const storedTokenId = localStorage.getItem("userTokenId");
    if (storedTokenId) {
      setTokenId(storedTokenId);
    }
  }, [isClient]);

  useEffect(() => {
    if (tokenId) {
      console.log("User PKP tokenId:", tokenId);
    }
  }, [tokenId]);

  const fetchOrCreateTokenId = async (wallet: string) => {
    try {
      const res = await fetch(`/api/userpkp?wallet=${wallet}`);
      console.log(res.json);
      if (res.status === 200) {
        const data = await res.json();
        console.log("userpkp data:", data);
        const receivedTokenId = data.tokenId || data.token_id;
        if (receivedTokenId) {
          setTokenId(receivedTokenId);
          localStorage.setItem("userTokenId", receivedTokenId);
          return receivedTokenId;
        } else {
          setError("Сервер вернул 200, но tokenId отсутствует");
          throw new Error("Сервер вернул 200, но tokenId отсутствует");
        }
      } else if (res.status === 404) {
        const createRes = await fetch("/api/userpkp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet }),
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          console.log("create userpkp data:", createData);
          const createdTokenId = createData.tokenId || createData.token_id;
          if (createdTokenId) {
            setTokenId(createdTokenId);
            localStorage.setItem("userTokenId", createdTokenId);
            return createdTokenId;
          } else {
            setError("Сервер не вернул tokenId после создания");
            throw new Error("Сервер не вернул tokenId после создания");
          }
        } else {
          setError("Ошибка создания PKP");
          throw new Error("Ошибка создания PKP");
        }
      } else {
        setError(`Неожиданный статус ответа: ${res.status}`);
        throw new Error(`Неожиданный статус ответа: ${res.status}`);
      }
    } catch {
      setError("Ошибка при получении или создании PKP");
      throw new Error("Ошибка при получении или создании PKP");
    }
  };

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
      let currentTokenId = localStorage.getItem("userTokenId");
      if (!currentTokenId) {
        currentTokenId = await fetchOrCreateTokenId(accounts[0]);
      }
      if (!currentTokenId) {
        setError("Не удалось получить или создать PKP");
        throw new Error("Не удалось получить или создать PKP");
      }
      setTokenId(currentTokenId);
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
    setTokenId(null);
    localStorage.removeItem("walletConnected");
    localStorage.removeItem("userTokenId");
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
        tokenId,
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
