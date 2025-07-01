import { ethers } from 'ethers';
import { encryptWithPublicKey, decryptWithPrivateKey } from '../../../cryptography/ecies';

export class LitECIES {
  pkpManager: any;
  constructor(pkpManager: any) {
    this.pkpManager = pkpManager;
  }

  async getKeys() {
    const wallet = this.pkpManager.getWallet();
    if (!wallet) {
      throw new Error("PKP не загружен");
    }
    const privateKey = wallet.privateKey;
    const publicKey = (ethers as any).utils.computePublicKey(privateKey, false);
    return { publicKey, privateKey };
  }

  async encrypt(data: string, recipientTokenId: string | null = null) {
    let publicKey;
    if (recipientTokenId) {
      const recipientPubKey = await this.pkpManager.getPKPPublicKey(recipientTokenId);
      publicKey = (ethers as any).utils.computePublicKey(recipientPubKey, false);
    } else {
      const keys = await this.getKeys();
      publicKey = keys.publicKey;
    }
    const result = encryptWithPublicKey(publicKey, data);
    if (!result.success) throw new Error(result.error);
    return result.data;
  }

  async decrypt(encryptedData: string) {
    const keys = await this.getKeys();
    const result = decryptWithPrivateKey(keys.privateKey, encryptedData);
    if (!result.success) throw new Error(result.error);
    return result.data;
  }
}