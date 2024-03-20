import { Injectable } from '@nestjs/common';
import { authenticatedLndGrpc, getWalletInfo } from 'ln-service';

@Injectable()
export class LndService {
  private lnd: any; // Use the appropriate type instead of `any` if available

  constructor() {
    const { lnd } = authenticatedLndGrpc({
      cert: process.env.LND_CERT,
      macaroon: process.env.LND_MACAROON,
      socket: process.env.LND_HOST,
    });
    this.lnd = lnd;
  }

  async getInfo() {
    const { public_key: nodePublicKey } = await getWalletInfo({
      lnd: this.lnd,
    });
    return nodePublicKey;
  }
}
