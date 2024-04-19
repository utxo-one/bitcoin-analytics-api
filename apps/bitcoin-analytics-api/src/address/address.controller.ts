import { Controller, Get, Param } from '@nestjs/common';
import { AddressService } from './address.service';
import { UseInterceptors } from '@nestjs/common/decorators';
import { AddressCacheInterceptor } from './address.cache.interceptor';
import { ElectrumService } from '../electrum/electrum.service';

@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get('/:address')
  async getAddress(@Param() address: string) {
    return this.addressService.getAddressSummary(address);
  }
}
