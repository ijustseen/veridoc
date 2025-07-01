"use client";

import { useWallet } from "./WalletProvider";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

export function PKPSetup() {
  const { account, pkpInfo, createPKP, isCreatingPKP, error } = useWallet();

  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PKP Setup</CardTitle>
          <CardDescription>
            Подключите кошелек для создания PKP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Сначала подключите MetaMask кошелек
          </p>
        </CardContent>
      </Card>
    );
  }

  if (pkpInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PKP Активен</CardTitle>
          <CardDescription>
            Ваш Programmable Key Pair готов к использованию
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Token ID</Badge>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {pkpInfo.tokenId}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">ETH Address</Badge>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {pkpInfo.ethAddress}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Public Key</Badge>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {pkpInfo.publicKey.slice(0, 20)}...
              </code>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default">✓ Готов</Badge>
            <span className="text-sm text-muted-foreground">
              PKP настроен и готов для шифрования документов
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Создание PKP</CardTitle>
        <CardDescription>
          Создайте Programmable Key Pair для безопасного шифрования документов
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm">
            PKP (Programmable Key Pair) создается через подпись MetaMask при авторизации. 
            Это позволяет безопасно шифровать документы без раскрытия приватного ключа.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Создание через подпись MetaMask</li>
            <li>Безопасное шифрование документов</li>
            <li>Контроль доступа для разных пользователей</li>
            <li>Временные ограничения доступа</li>
            <li>Мультиподпись без раскрытия ключей</li>
          </ul>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button 
          onClick={createPKP} 
          disabled={isCreatingPKP}
          className="w-full"
        >
          {isCreatingPKP ? "Создание PKP..." : "Создать PKP"}
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Процесс:</strong> Вам будет предложено подписать сообщение в MetaMask 
            для создания уникального PKP. Никаких транзакций на блокчейне не требуется.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}