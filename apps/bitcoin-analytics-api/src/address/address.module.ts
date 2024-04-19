import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { BitcoindModule } from '../bitcoind/bitcoin.module';
import { ElectrumModule } from '../electrum/electrum.module';

@Module({
  imports: [BitcoindModule, ElectrumModule],
  controllers: [AddressController],
  providers: [AddressService],
})
export class AddressModule {}
