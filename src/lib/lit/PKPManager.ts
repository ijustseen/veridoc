import { ethers } from 'ethers';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { LitAuth } from './auth';

export class PKPManager {
  litNodeClient: any;
  pkpWallet: any = null;
  pkpTokenId: string | null = null;
  constructor(litClient: any) {
    this.litNodeClient = litClient;
    this.pkpWallet = null;
    this.pkpTokenId = null;
  }

  async createPKP(provider: any) {
    const signer = new ethers.BrowserProvider(provider).getSigner();
    const authSig = await LitAuth.createAuthSig(signer);
    const mintRes = await this.litNodeClient.mintPKP({
      authSig,
      permittedAuthMethods: [
        {
          authMethodType: 1,
          accessToken: JSON.stringify(authSig),
        },
      ],
    });
    this.pkpTokenId = mintRes.tokenId;
    return mintRes;
  }

  async loadPKP(tokenId: string, provider: any) {
    this.pkpTokenId = tokenId;
    const pkpPubKey = await this.getPKPPublicKey(tokenId);
    this.pkpWallet = new PKPEthersWallet({
      litNodeClient: this.litNodeClient,
      pkpPubKey: pkpPubKey,
    });
    await this.pkpWallet.init();
    return this.pkpWallet;
  }

  async getPKPPublicKey(tokenId: string) {
    const pkpInfo = await this.litNodeClient.getPKPByTokenId({
      tokenId,
    });
    return pkpInfo.publicKey;
  }

  getWallet() {
    return this.pkpWallet;
  }
}
