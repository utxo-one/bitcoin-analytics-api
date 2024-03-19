import { Controller, Get, Param } from '@nestjs/common';
import { AddressService } from './address.service';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { Body, UseInterceptors } from '@nestjs/common/decorators';

@Controller('address')
@UseInterceptors(CacheInterceptor)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get('/:address')
  @CacheKey('address')
  @CacheTTL(30)
  async getAddress(@Param() address: string) {
    return this.addressService.getAddressSummary(address);
  }
}
