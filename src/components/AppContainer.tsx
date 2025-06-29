"use client";
import React, { useEffect } from "react";
import { useWallet } from "@/components/WalletProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useRouter, usePathname } from "next/navigation";

export default function AppContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { account, isConnecting, error, connectWallet } = useWallet();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Для неавторизованных пользователей: всегда на root страницу, если не на ней
    if (!account && pathname !== "/") {
      router.push("/");
    }
    // Для авторизованных пользователей: если на root странице, перенаправить на dashboard
    // if (account && pathname === "/") {
    //   router.push("/dashboard");
    // }
  }, [account, pathname, router]);

  return (
    <div className="container mx-auto p-4 lg:max-w-screen-lg flex flex-col min-h-screen">
      <Header
        account={account}
        isConnecting={isConnecting}
        error={error}
        connectWallet={connectWallet}
      />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
