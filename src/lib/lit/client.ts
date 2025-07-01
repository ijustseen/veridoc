import { LitNodeClient } from '@lit-protocol/lit-node-client';

export class LitClient {
  litNodeClient: any = null;
  constructor() {
    this.litNodeClient = null;
  }

  async init() {
    this.litNodeClient = new LitNodeClient({
      litNetwork: "datil-dev",
    });
    await this.litNodeClient.connect();
  }

  getClient() {
    return this.litNodeClient;
  }
}
