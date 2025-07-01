"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers, type Eip1193Provider } from "ethers";
import { getAuthPKPService, type AuthPKPInfo } from "@/lib/auth-pkp";

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
  pkpInfo: AuthPKPInfo | null;
  createPKP: () => Promise<void>;
  isCreatingPKP: boolean;
  refreshAuthSig: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [pkpInfo, setPkpInfo] = useState<AuthPKPInfo | null>(null);
  const [isCreatingPKP, setIsCreatingPKP] = useState(false);

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
    setPkpInfo(null);
    localStorage.removeItem("walletConnected");
    localStorage.removeItem("pkpInfo");
  };

  const createPKP = async () => {
    if (!account) {
      setError("Сначала подключите кошелек");
      return;
    }

    setError(null);
    setIsCreatingPKP(true);

    try {
      const authPKPService = getAuthPKPService();
      await authPKPService.initialize();
      
      // Создаем PKP через подпись MetaMask
      const newPKP = await authPKPService.createPKPWithAuthSignature(account);
      setPkpInfo(newPKP);
      
      // Сохраняем PKP в localStorage (без authSig для безопасности)
      const pkpForStorage = {
        tokenId: newPKP.tokenId,
        publicKey: newPKP.publicKey,
        ethAddress: newPKP.ethAddress
      };
      localStorage.setItem("pkpInfo", JSON.stringify(pkpForStorage));
      
      // Сохраняем PKP в базе данных
      const response = await fetch('/api/userpkp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: account,
          token_id: newPKP.tokenId,
          public_key: newPKP.publicKey,
          eth_address: newPKP.ethAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Ошибка сохранения PKP в базе данных';
        throw new Error(errorMessage);
      }

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ошибка создания PKP");
      }
    } finally {
      setIsCreatingPKP(false);
    }
  };

  // Загружаем PKP из localStorage при инициализации
  useEffect(() => {
    if (isClient && account) {
      const savedPKP = localStorage.getItem("pkpInfo");
      if (savedPKP) {
        try {
          const parsedPKP = JSON.parse(savedPKP);
          // Восстанавливаем authSig при загрузке
          restoreAuthSig(parsedPKP);
        } catch (err) {
          console.error("Ошибка парсинга PKP из localStorage:", err);
          localStorage.removeItem("pkpInfo");
        }
      }
    }
  }, [isClient, account]);

  // Функция для восстановления authSig
  const restoreAuthSig = async (pkpData: any) => {
    try {
      const authPKPService = getAuthPKPService();
      await authPKPService.initialize();
      
      if (!window.ethereum) {
        throw new Error('MetaMask не найден');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Создаем новый authSig для существующего PKP
      const message = `Восстановление PKP для VeriDoc\nАдрес: ${account}`;
      const authSig = await import('@lit-protocol/auth-helpers').then(module => 
        module.generateAuthSig({
          signer: signer,
          toSign: message,
        })
      );

      const pkpWithAuth: AuthPKPInfo = {
        ...pkpData,
        authSig: authSig
      };
      
      setPkpInfo(pkpWithAuth);
    } catch (error) {
      console.error('Ошибка восстановления authSig:', error);
      // Если не получилось восстановить authSig, используем PKP без него
      const pkpWithoutAuth: AuthPKPInfo = {
        ...pkpData,
        authSig: null
      };
      setPkpInfo(pkpWithoutAuth);
    }
  };

  // Функция для обновления authSig
  const refreshAuthSig = async () => {
    if (!pkpInfo || !account) return;
    
    try {
      const authPKPService = getAuthPKPService();
      await authPKPService.initialize();
      
      if (!window.ethereum) {
        throw new Error('MetaMask не найден');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const message = `Обновление authSig для VeriDoc\nАдрес: ${account}\nВремя: ${new Date().toISOString()}`;
      const authSig = await import('@lit-protocol/auth-helpers').then(module => 
        module.generateAuthSig({
          signer: signer,
          toSign: message,
        })
      );

      const updatedPKP: AuthPKPInfo = {
        ...pkpInfo,
        authSig: authSig
      };
      
      setPkpInfo(updatedPKP);
    } catch (error) {
      console.error('Ошибка обновления authSig:', error);
      setError(error instanceof Error ? error.message : 'Ошибка обновления authSig');
    }
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
        pkpInfo,
        createPKP,
        isCreatingPKP,
        refreshAuthSig,
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
