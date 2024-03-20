import { Test, TestingModule } from '@nestjs/testing';
import { LightningController } from './lightning.controller';

describe('LightningController', () => {
  let controller: LightningController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LightningController],
    }).compile();

    controller = module.get<LightningController>(LightningController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
