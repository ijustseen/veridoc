export class LitAuth {
  static async createAuthSig(signer: any) {
    const address = await signer.getAddress();
    const message = `Lit Protocol PKP Access`;
    const signature = await signer.signMessage(message);
    return {
      sig: signature,
      derivedVia: "web3.eth.personal.sign",
      signedMessage: message,
      address: address,
    };
  }
}
