'use client';

import React, { useState } from 'react';
import { ethers } from 'ethers';

export default function TestSignPage() {
  const [address, setAddress] = useState('');
  const [nonce, setNonce] = useState('');
  const [signature, setSignature] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  // 1. Получить адрес из MetaMask
  async function connectWallet() {
    if (!window.ethereum) return alert('MetaMask not found');
    const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAddress(addr);
  }

  // 2. Получить nonce с бэкенда
  async function getNonce() {
    if (!address) return alert('Connect wallet first');
    setError('');
    const res = await fetch('/api/documents/nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      const text = await res.text();
      setError('Ошибка парсинга JSON (nonce): ' + text);
      return;
    }
    setNonce(data.nonce);
  }

  // 3. Подписать nonce через MetaMask
  async function signNonce() {
    if (!nonce) return alert('Get nonce first');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const sig = await signer.signMessage(nonce);
    setSignature(sig);
  }

  // 4. Отправить подпись на API (пример для документа с id=1)
  async function sendSignature() {
    if (!signature) return alert('Sign nonce first');
    setError('');
    const res = await fetch('/api/documents/1/key?' + new URLSearchParams({
      address,
      nonce,
      signature,
    }));
    let data;
    try {
      data = await res.json();
    } catch (e) {
      const text = await res.text();
      setError('Ошибка парсинга JSON (key): ' + text);
      return;
    }
    setResult(JSON.stringify(data, null, 2));
  }

  return (
    <div className="p-8 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-4">Тест подписи через MetaMask</h1>
      <button className="btn" onClick={connectWallet}>1. Подключить MetaMask</button>
      <div>Адрес: <span className="font-mono">{address}</span></div>
      <button className="btn" onClick={getNonce}>2. Получить nonce</button>
      <div>Nonce: <span className="font-mono break-all">{nonce}</span></div>
      <button className="btn" onClick={signNonce}>3. Подписать nonce</button>
      <div>Signature: <span className="font-mono break-all">{signature}</span></div>
      <button className="btn" onClick={sendSignature}>4. Отправить на API (id=1)</button>
      <div>Результат:<pre className="bg-gray-100 p-2 rounded">{result}</pre></div>
      {error && <div className="text-red-600">{error}</div>}
    </div>
  );
}