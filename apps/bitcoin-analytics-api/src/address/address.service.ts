import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ElectrumService } from '../electrum/electrum.service';

@Injectable()
export class AddressService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly electrumService: ElectrumService,
  ) {}

  async getAddressSummary(addressObj): Promise<any> {
    const address = addressObj.address;

    const addressTransactions =
      await this.electrumService.getBlockHeight(address);

    return addressTransactions;
  }
}
