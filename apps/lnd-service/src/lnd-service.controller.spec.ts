import { Test, TestingModule } from '@nestjs/testing';
import { LndServiceController } from './lnd-service.controller';
import { LndServiceService } from './lnd-service.service';

describe('LndServiceController', () => {
  let lndServiceController: LndServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [LndServiceController],
      providers: [LndServiceService],
    }).compile();

    lndServiceController = app.get<LndServiceController>(LndServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(lndServiceController.getHello()).toBe('Hello World!');
    });
  });
});
