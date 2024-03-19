import { Controller, Get, Param } from '@nestjs/common';
import { AddressService } from './address.service';
import { BitcoindService } from 'src/bitcoind/bitcoind.service';

@Controller('address')
export class AddressController {
  constructor(
    private readonly addressService: AddressService,
    private readonly bitcoinService: BitcoindService,
  ) {}

  @Get('/:address')
  async getAddress(@Param() address: string) {
    return this.bitcoinService.getAddressSummary(address);
  }
}
