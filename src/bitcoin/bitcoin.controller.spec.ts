import { Test, TestingModule } from '@nestjs/testing';
import { BitcoinController } from './bitcoin.controller';

describe('BitcoinController', () => {
  let controller: BitcoinController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BitcoinController],
    }).compile();

    controller = module.get<BitcoinController>(BitcoinController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
