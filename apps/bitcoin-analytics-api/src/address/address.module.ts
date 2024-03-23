import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { BitcoindModule } from '../bitcoind/bitcoin.module';

@Module({
  imports: [BitcoindModule],
  controllers: [AddressController],
  providers: [AddressService],
})
export class AddressModule {}
